import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { registrarLog } from "@/lib/audit"
import { atencionSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const idCliente = searchParams.get("idCliente")

    const whereClause: any = {}
    if (idCliente) {
      whereClause.idCliente = Number.parseInt(idCliente)
    }

    const atenciones = await prisma.atencionPodologica.findMany({
      where: whereClause,
      include: {
        cliente: true,
        usuario: { include: { rol: true } },
        cita: true,
        receta: {
          include: {
            detalles: {
              include: { producto: true }
            }
          }
        },
        // Nuevas relaciones clínicas
        diagnosticos: {
          include: { diagnostico: true }
        },
        tratamientos: {
          include: { tratamiento: true }
        },
        insumos: {
          include: { producto: { select: { id: true, nombre: true, unidadMedida: true } } }
        },
      },
      orderBy: { fecha: "desc" },
    })

    return NextResponse.json(atenciones)
  } catch (error) {
    console.error("Error fetching atenciones:", error)
    return NextResponse.json({ error: "Error al obtener atenciones" }, { status: 500 })
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

    // Solo ADMIN y DOCTOR pueden registrar atenciones podológicas
    const allowedRoles = ["ADMIN", "DOCTOR"]
    if (!usuarioDb || !allowedRoles.includes(usuarioDb.rol.nombre)) {
      return NextResponse.json(
        { error: "Forbidden: Solo el administrador o doctor pueden registrar atenciones clínicas" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validation = atencionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const { idCita, idCliente, subjetivo, objetivo, analisis, plan } = validation.data

    // Datos adicionales opcionales (nuevos)
    const diagnosticosIds: number[] = body.diagnosticos ?? []
    const tratamientosIds: number[] = body.tratamientos ?? []
    const insumosInput: { idProducto: number; cantidad: number }[] = body.insumos ?? []

    // Validar que los insumos sean productos físicos (no servicios)
    if (insumosInput.length > 0) {
      const productosInsumo = await prisma.producto.findMany({
        where: { id: { in: insumosInput.map((i) => i.idProducto) } },
        select: { id: true, nombre: true, esServicio: true, stockActual: true },
      })

      for (const inp of insumosInput) {
        const prod = productosInsumo.find((p) => p.id === inp.idProducto)
        if (!prod) {
          return NextResponse.json({ error: `Producto con ID ${inp.idProducto} no encontrado` }, { status: 400 })
        }
        if (prod.esServicio) {
          return NextResponse.json({ error: `"${prod.nombre}" es un servicio y no puede usarse como insumo físico` }, { status: 400 })
        }
        if (inp.cantidad <= 0) {
          return NextResponse.json({ error: `La cantidad de "${prod.nombre}" debe ser mayor a 0` }, { status: 400 })
        }
        if (prod.stockActual < inp.cantidad) {
          return NextResponse.json(
            { error: `Stock insuficiente para "${prod.nombre}": disponible ${prod.stockActual}, solicitado ${inp.cantidad}` },
            { status: 400 }
          )
        }
      }
    }

    const atencion = await prisma.$transaction(async (tx) => {
      // 1. Si hay cita, marcarla como completada
      if (idCita) {
        const cita = await tx.cita.findUnique({ where: { id: idCita } })
        if (cita && cita.estado !== "CANCELADA") {
          await tx.cita.update({ where: { id: idCita }, data: { estado: "COMPLETADA" } })
        }
      }

      const esDatoPrueba = usuarioDb.esDatoPrueba

      // 2. Crear la atención podológica (SOAP)
      const nuevaAtencion = await tx.atencionPodologica.create({
        data: {
          idCita: idCita || null,
          idCliente,
          idUsuario: user.id,
          subjetivo,
          objetivo,
          analisis,
          plan,
          esDatoPrueba,
        },
      })

      // 3. Insertar diagnósticos vinculados
      if (diagnosticosIds.length > 0) {
        await tx.diagnosticoAtencion.createMany({
          data: diagnosticosIds.map((idDiagnostico) => ({
            idAtencion: nuevaAtencion.id,
            idDiagnostico,
          })),
          skipDuplicates: true,
        })
      }

      // 4. Insertar tratamientos vinculados
      if (tratamientosIds.length > 0) {
        await tx.tratamientoAtencion.createMany({
          data: tratamientosIds.map((idTratamiento) => ({
            idAtencion: nuevaAtencion.id,
            idTratamiento,
          })),
          skipDuplicates: true,
        })
      }

      // 5. Procesar insumos: descontar stock FEFO (First Expire, First Out)
      for (const insumo of insumosInput) {
        let cantidadRestante = insumo.cantidad

        // Obtener lotes activos del producto ordenados por FEFO
        const lotes = await tx.lote.findMany({
          where: {
            idProducto: insumo.idProducto,
            activo: true,
            stockActual: { gt: 0 },
          },
          orderBy: [
            { fechaVencimiento: "asc" }, // FEFO: primero el que vence antes
            { id: "asc" },
          ],
        })

        for (const lote of lotes) {
          if (cantidadRestante <= 0) break

          const descuento = Math.min(lote.stockActual, cantidadRestante)
          cantidadRestante -= descuento

          // Descontar del lote
          await tx.lote.update({
            where: { id: lote.id },
            data: { stockActual: { decrement: descuento } },
          })

          // Registrar movimiento de inventario AJUSTE_NEGATIVO
          await tx.movimientoInventario.create({
            data: {
              idProducto: insumo.idProducto,
              idLote: lote.id,
              tipo: "AJUSTE_NEGATIVO",
              cantidad: -descuento,
              stockResultante: lote.stockActual - descuento,
              referencia: `Consumo en Consulta Podológica #${nuevaAtencion.id}`,
              observacion: `Insumo consumido durante atención del paciente ID ${idCliente}`,
              idUsuario: user.id,
            },
          })
        }

        // Descontar stockActual del Producto
        await tx.producto.update({
          where: { id: insumo.idProducto },
          data: { stockActual: { decrement: insumo.cantidad } },
        })

        // Registrar en InsumoAtencion
        await tx.insumoAtencion.create({
          data: {
            idAtencion: nuevaAtencion.id,
            idProducto: insumo.idProducto,
            cantidad: insumo.cantidad,
          },
        })
      }

      // 6. Retornar atención con todas las relaciones
      return tx.atencionPodologica.findUniqueOrThrow({
        where: { id: nuevaAtencion.id },
        include: {
          cliente: true,
          usuario: { include: { rol: true } },
          cita: true,
          diagnosticos: { include: { diagnostico: true } },
          tratamientos: { include: { tratamiento: true } },
          insumos: { include: { producto: { select: { id: true, nombre: true, unidadMedida: true } } } },
        },
      })
    })

    registrarLog({
      accion: "CREAR_ATENCION_PODOLOGICA",
      entidad: "AtencionPodologica",
      entidadId: atencion.id,
      idUsuario: user.id,
      modulo: "CLINICA",
      detalles: {
        idCliente,
        diagnosticos: diagnosticosIds.length,
        tratamientos: tratamientosIds.length,
        insumos: insumosInput.length,
      },
    })

    return NextResponse.json(atencion, { status: 201 })
  } catch (error: any) {
    console.error("Error creating atencion:", error)
    return NextResponse.json({ error: "Ocurrió un error inesperado al procesar la atención podológica." }, { status: 500 })
  }
}
