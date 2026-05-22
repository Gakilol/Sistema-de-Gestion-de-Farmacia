import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const accion = searchParams.get("accion")
    const entidad = searchParams.get("entidad")
    const buscarUsuario = searchParams.get("usuario")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")))
    const skip = (page - 1) * limit

    // Construir filtros dinámicos
    const where: any = {}

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        const start = new Date(startDate)
        start.setUTCHours(0, 0, 0, 0)
        where.createdAt.gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setUTCHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    } else {
      // Por defecto: última semana
      const hace7Dias = new Date()
      hace7Dias.setDate(hace7Dias.getDate() - 7)
      hace7Dias.setUTCHours(0, 0, 0, 0)
      where.createdAt = { gte: hace7Dias }
    }

    if (accion && accion !== "TODOS") {
      where.accion = accion
    }

    if (entidad && entidad !== "TODOS") {
      where.entidad = entidad
    }

    if (buscarUsuario) {
      where.usuario = {
        nombreCompleto: { contains: buscarUsuario, mode: "insensitive" },
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditoriaLog.findMany({
        where,
        include: {
          usuario: {
            select: { id: true, nombreCompleto: true, correo: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditoriaLog.count({ where }),
    ])

    // Estadísticas rápidas para el período filtrado (siempre última semana si no hay filtro)
    const hoy = new Date()
    hoy.setUTCHours(0, 0, 0, 0)
    const [accionesHoy, totalPeriodo] = await Promise.all([
      prisma.auditoriaLog.count({ where: { createdAt: { gte: hoy } } }),
      prisma.auditoriaLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        accionesHoy,
        totalPeriodo,
      },
    })
  } catch (error) {
    console.error("Error fetching auditoria:", error)
    return NextResponse.json({ error: "Error al obtener los logs de auditoría" }, { status: 500 })
  }
}
