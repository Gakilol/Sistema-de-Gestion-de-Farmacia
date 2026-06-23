import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { registrarLog } from "@/lib/audit"
import { devolucionSchema } from "@/lib/validations"
import { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // El listado de devoluciones puede ser visto por cualquier usuario autenticado,
    // pero la creación/anulación está restringida a ADMIN.
    const searchParams = request.nextUrl.searchParams
    const idProveedor = searchParams.get("idProveedor")
    const idProducto = searchParams.get("idProducto")
    const estado = searchParams.get("estado")

    const whereClause: any = {}
    if (idProveedor) {
      whereClause.idProveedor = Number.parseInt(idProveedor)
    }
    if (idProducto) {
      whereClause.idProducto = Number.parseInt(idProducto)
    }
    if (estado) {
      whereClause.estado = estado
    }

    const devoluciones = await prisma.devolucionProveedor.findMany({
      where: whereClause,
      include: {
        producto: true,
        lote: true,
        proveedor: true,
        usuario: { include: { rol: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(devoluciones)
  } catch (error) {
    console.error("Error fetching devoluciones:", error)
    return NextResponse.json({ error: "Error al obtener devoluciones" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })

    // Restricción: Solo administradores pueden registrar devoluciones a laboratorio
    if (usuarioDb?.rol.nombre !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Solo el administrador puede realizar devoluciones" }, { status: 403 })
    }

    const body = await request.json()
    const validation = devolucionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const {
      idempotencyKey,
      idProducto,
      idLote,
      idProveedor,
      cantidad,
      motivo,
      observacion
    } = validation.data

    let devolucion: any = null

    try {
      devolucion = await prisma.$transaction(async (tx: any) => {
        // 1. Bloqueo pesimista del lote y producto para evitar condiciones de carrera
        await tx.$executeRawUnsafe(
          `SELECT id FROM "Producto" WHERE id = $1 FOR UPDATE`,
          idProducto
        )
        await tx.$executeRawUnsafe(
          `SELECT id FROM "Lote" WHERE id = $1 FOR UPDATE`,
          idLote
        )

        // 2. Verificar existencia del lote y del producto
        const lote = await tx.lote.findUnique({
          where: { id: idLote },
          include: { producto: true }
        })

        if (!lote) {
          throw new Error("LOTE_NOT_FOUND")
        }

        if (lote.idProducto !== idProducto) {
          throw new Error("LOTE_PRODUCTO_MISMATCH")
        }

        if (lote.stockActual < cantidad) {
          throw new Error("STOCK_INSUFICIENTE")
        }

        // 3. Crear movimiento de inventario en el Kardex
        const stockActualProducto = lote.producto.stockActual
        const nuevoStockProducto = stockActualProducto - cantidad
        const nuevoStockLote = lote.stockActual - cantidad

        const movimiento = await tx.movimientoInventario.create({
          data: {
            idProducto,
            idLote,
            tipo: "DEVOLUCION", // De la lista de tipos en comentarios de schema.prisma
            cantidad: cantidad,
            stockResultante: nuevoStockProducto,
            costoUnitario: lote.costoCompra,
            referencia: `Devolución Proveedor`,
            idUsuario: user.id,
            observacion: `Devolución de lote: ${lote.codigoLote} (${cantidad} unds) por motivo: ${motivo}.`
          }
        })

        // 4. Descontar stock del lote y del producto
        await tx.lote.update({
          where: { id: idLote },
          data: {
            stockActual: nuevoStockLote,
            activo: nuevoStockLote > 0
          }
        })

        await tx.producto.update({
          where: { id: idProducto },
          data: {
            stockActual: nuevoStockProducto
          }
        })

        // 5. Determinar si es dato de prueba (heredado del producto o usuario)
        const esDatoPrueba = lote.producto.esDatoPrueba || usuarioDb.esDatoPrueba

        // 6. Registrar la devolución
        const nuevaDevolucion = await tx.devolucionProveedor.create({
          data: {
            idempotencyKey,
            idProducto,
            idLote,
            idProveedor: idProveedor || null,
            cantidad,
            motivo,
            observacion,
            idMovimientoInventario: movimiento.id,
            idUsuario: user.id,
            esDatoPrueba,
            estado: "COMPLETADA"
          },
          include: {
            producto: true,
            lote: true,
            proveedor: true,
            usuario: { include: { rol: true } }
          }
        })

        return nuevaDevolucion
      }, {
        maxWait: 10000,
        timeout: 15000,
      })

    } catch (txError: any) {
      if (txError instanceof Prisma.PrismaClientKnownRequestError) {
        // Código P2002: Unique constraint failed (idempotencyKey duplicada)
        if (txError.code === "P2002") {
          return NextResponse.json(
            { error: "Conflicto: Esta devolución ya fue procesada (Clave de Idempotencia Duplicada)." },
            { status: 409 }
          )
        }
      }

      if (txError.message === "LOTE_NOT_FOUND") {
        return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 })
      }
      if (txError.message === "LOTE_PRODUCTO_MISMATCH") {
        return NextResponse.json({ error: "El lote no corresponde al producto especificado" }, { status: 400 })
      }
      if (txError.message === "STOCK_INSUFICIENTE") {
        return NextResponse.json({ error: "Stock insuficiente en el lote para realizar la devolución" }, { status: 400 })
      }

      throw txError
    }

    // Registrar log auditoría Next.js
    registrarLog({
      accion: "CREAR_DEVOLUCION",
      entidad: "DevolucionProveedor",
      entidadId: devolucion.id,
      idUsuario: user.id,
      detalles: {
        idProducto: devolucion.idProducto,
        lote: devolucion.lote.codigoLote,
        cantidad: devolucion.cantidad,
        proveedorId: devolucion.idProveedor,
        motivo: devolucion.motivo
      }
    })

    return NextResponse.json(devolucion, { status: 201 })
  } catch (error: any) {
    console.error("Error creating devolucion:", error)
    return NextResponse.json({ error: "Ocurrió un error inesperado al procesar la devolución." }, { status: 500 })
  }
}
