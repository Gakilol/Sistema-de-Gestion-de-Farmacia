import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { recetaSchema } from "@/lib/validations"
import { ESTADOS_RECETA, puedeTransicionarReceta } from "@/lib/domain/prescriptions"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const idCliente = searchParams.get("idCliente")
    const codigoReceta = searchParams.get("codigoReceta")
    const estado = searchParams.get("estado")

    if (user.rolNombre === "EMPLEADO" && !codigoReceta) {
      return NextResponse.json({ error: "Farmacia solo puede consultar una receta por su código exacto" }, { status: 403 })
    }
    if (!["ADMIN", "DOCTOR", "EMPLEADO"].includes(user.rolNombre)) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
    }

    const whereClause: any = {}
    if (idCliente) {
      whereClause.idCliente = Number.parseInt(idCliente)
    }
    if (codigoReceta) {
      whereClause.codigoReceta = user.rolNombre === "EMPLEADO" ? codigoReceta : { contains: codigoReceta, mode: "insensitive" }
    }
    if (estado) {
      whereClause.estado = estado
    }

    // Sin cron persistente: al consultar se materializa el estado vencido en una sola operación.
    await prisma.receta.updateMany({
      where: { fechaVencimiento: { lt: new Date() }, estado: { in: ["EMITIDA", "EN_PREPARACION", "LISTA", "USADA_PARCIALMENTE"] } },
      data: { estado: "VENCIDA" },
    })

    const recetas = await prisma.receta.findMany({
      where: whereClause,
      include: {
        cliente: { include: { datosClinicos: { select: { alergias: true } } } },
        usuario: { include: { rol: true } },
        atencion: true,
        detalles: {
          include: {
            producto: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(recetas)
  } catch (error) {
    console.error("Error fetching recetas:", error)
    return NextResponse.json({ error: "Error al obtener recetas" }, { status: 500 })
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

    // Solo ADMIN y DOCTOR pueden emitir o editar recetas
    const allowedRoles = ["ADMIN", "DOCTOR"]
    if (!usuarioDb || !allowedRoles.includes(usuarioDb.rol.nombre)) {
      return NextResponse.json({ error: "Forbidden: Solo el administrador o doctor pueden emitir recetas" }, { status: 403 })
    }

    const body = await request.json()
    const validation = recetaSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const {
      idAtencion,
      idCliente,
      fechaVencimiento,
      observaciones,
      detalles,
      estado,
    } = validation.data

    const receta = await prisma.$transaction(async (tx) => {
      // 1. Generar código único de receta
      const randomPart = Math.floor(1000 + Math.random() * 9000)
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "")
      const codigoReceta = `RECETA-${datePart}-${randomPart}`

      // 2. Determinar si es dato de prueba
      const esDatoPrueba = usuarioDb.esDatoPrueba

      // 3. Crear receta principal
      const nuevaReceta = await tx.receta.create({
        data: {
          codigoReceta,
          idAtencion,
          idCliente,
          idUsuario: user.id,
          estado,
          fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
          observaciones,
          esDatoPrueba,
          detalles: {
            create: detalles.map((d: any) => ({
              idProducto: d.idProducto,
              cantidad: d.cantidad,
              indicaciones: d.indicaciones || null
            }))
          }
        },
        include: {
          cliente: true,
          usuario: { include: { rol: true } },
          atencion: true,
          detalles: {
            include: {
              producto: true
            }
          }
        }
      })

      return nuevaReceta
    })

    return NextResponse.json(receta, { status: 201 })
  } catch (error: any) {
    console.error("Error creating receta:", error)
    return NextResponse.json({ error: "Ocurrió un error inesperado al procesar la receta." }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !["ADMIN", "DOCTOR"].includes(user.rolNombre)) return NextResponse.json({ error: "Sin permiso" }, { status: user ? 403 : 401 })
    const body = await request.json()
    const id = Number(body.id)
    const destino = String(body.estado)
    if (!id || !ESTADOS_RECETA.includes(destino as any)) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })
    const actual = await prisma.receta.findUnique({ where: { id }, select: { estado: true } })
    if (!actual) return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 })
    if (!puedeTransicionarReceta(actual.estado, destino)) return NextResponse.json({ error: `No se permite cambiar de ${actual.estado} a ${destino}` }, { status: 409 })
    const receta = await prisma.$transaction(async (tx) => {
      const updated = await tx.receta.update({ where: { id }, data: { estado: destino } })
      await tx.auditoriaLog.create({ data: { accion: "CAMBIO_ESTADO_RECETA", entidad: "Receta", entidadId: id, idUsuario: user.id, modulo: "CLINICA", datosAnteriores: { estado: actual.estado }, datosNuevos: { estado: destino }, motivo: body.motivo || null } })
      return updated
    })
    return NextResponse.json(receta)
  } catch (error) {
    console.error("Error actualizando receta:", error)
    return NextResponse.json({ error: "No fue posible actualizar la receta" }, { status: 500 })
  }
}
