import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { descuentoSchema } from "@/lib/validations"
import { registrarLog } from "@/lib/audit"

// GET /api/descuentos?estado=activos|inactivos|todos
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const estado = searchParams.get("estado") ?? "todos"

    const where: any = {}

    if (estado === "activos") {
      where.activo = true
    } else if (estado === "inactivos") {
      where.activo = false
    }

    const descuentos = await prisma.descuento.findMany({
      where,
      include: {
        usuario: { select: { id: true, nombreCompleto: true } },
        _count: { select: { ventas: true } },
        productos: { include: { producto: { select: { id: true, nombre: true } } } },
        categorias: { include: { categoria: { select: { id: true, nombre: true } } } },
        clientes: { include: { cliente: { select: { id: true, nombreCompleto: true } } } }
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(descuentos)
  } catch (error) {
    console.error("Error fetching descuentos:", error)
    return NextResponse.json({ error: "Error fetching descuentos" }, { status: 500 })
  }
}

// POST /api/descuentos (ADMIN)
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

    if (usuarioDb?.rol.nombre !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validation = descuentoSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    const descuento = await prisma.$transaction(async (tx) => {
      // Crear descuento principal
      const desc = await tx.descuento.create({
        data: {
          nombre: data.nombre,
          descripcion: data.descripcion,
          tipoAplicacion: data.tipoAplicacion,
          tipoValor: data.tipoValor,
          tipo: data.tipoValor === "PORCENTAJE" ? "PORCENTAJE" : "MONTO", // compatibility
          valor: data.valor,
          motivo: data.nombre, // compatibility
          fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : null,
          fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
          montoMinimoCompra: data.montoMinimoCompra,
          montoMinimo: data.montoMinimoCompra, // compatibility
          cantidadMinima: data.cantidadMinima,
          limiteUso: data.limiteUso,
          esAcumulable: data.esAcumulable ?? false,
          activo: data.activo ?? true,
          estado: (data.activo ?? true) ? "ACTIVO" : "INACTIVO", // compatibility
          idUsuario: user.id,
        },
      })

      // Asociar según tipo de aplicación
      if (data.tipoAplicacion === "PRODUCTO" && data.productosIds && data.productosIds.length > 0) {
        await tx.descuentoProducto.createMany({
          data: data.productosIds.map(prodId => ({
            idDescuento: desc.id,
            idProducto: prodId
          }))
        })
      } else if (data.tipoAplicacion === "CATEGORIA" && data.categoriasIds && data.categoriasIds.length > 0) {
        await tx.descuentoCategoria.createMany({
          data: data.categoriasIds.map(catId => ({
            idDescuento: desc.id,
            idCategoria: catId
          }))
        })
      } else if (data.tipoAplicacion === "CLIENTE" && data.clientesIds && data.clientesIds.length > 0) {
        await tx.descuentoCliente.createMany({
          data: data.clientesIds.map(cliId => ({
            idDescuento: desc.id,
            idCliente: cliId
          }))
        })
      }

      return desc
    })

    registrarLog({
      accion: "CREAR_DESCUENTO",
      entidad: "Descuento",
      entidadId: descuento.id,
      idUsuario: user.id,
      detalles: { nombre: descuento.nombre, valor: Number(descuento.valor), tipoAplicacion: descuento.tipoAplicacion }
    })

    return NextResponse.json(descuento, { status: 201 })
  } catch (error: any) {
    console.error("Error creating descuento:", error)
    return NextResponse.json({ error: error.message || "Error al crear el descuento" }, { status: 500 })
  }
}
