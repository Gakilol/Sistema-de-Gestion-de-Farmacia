import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { descuentoSchema, emptyToNull } from "@/lib/validations"
import { registrarLog } from "@/lib/audit"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const estado = searchParams.get("estado") ?? "todos" // todos, activos, inactivos

    const where: any = {}

    if (estado === "activos") {
      where.estado = "ACTIVO"
    } else if (estado === "inactivos") {
      where.estado = "INACTIVO"
    }

    const descuentos = await prisma.descuento.findMany({
      where,
      include: {
        usuario: { select: { id: true, nombreCompleto: true } },
        _count: { select: { ventas: true } }
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(descuentos)
  } catch (error) {
    console.error("Error fetching descuentos:", error)
    return NextResponse.json({ error: "Error fetching descuentos" }, { status: 500 })
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

    const { tipo, valor, motivo, fechaInicio, fechaFin, montoMinimo, maxDescuento, esAcumulable, estado } = validation.data

    const descuento = await prisma.descuento.create({
      data: {
        tipo,
        valor,
        motivo,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        montoMinimo,
        maxDescuento,
        esAcumulable: esAcumulable ?? false,
        estado: estado ?? "ACTIVO",
        idUsuario: user.id,
      },
    })

    registrarLog({
      accion: "CREAR_DESCUENTO",
      entidad: "Descuento",
      entidadId: descuento.id,
      idUsuario: user.id,
      detalles: { motivo: descuento.motivo, valor: Number(descuento.valor), tipo: descuento.tipo }
    })

    return NextResponse.json(descuento, { status: 201 })
  } catch (error: any) {
    console.error("Error creating descuento:", error)
    return NextResponse.json({ error: error.message || "Error al crear el descuento" }, { status: 500 })
  }
}
