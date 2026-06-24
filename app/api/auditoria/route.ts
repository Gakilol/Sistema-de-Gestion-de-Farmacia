import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { toManaguaStartOfDay, toManaguaEndOfDay, getManaguaDateRange } from "@/lib/timezone"

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

    if (!usuarioDb || !usuarioDb.activo) {
      return NextResponse.json({ error: "Usuario inactivo o no encontrado" }, { status: 403 })
    }

    const rol = usuarioDb.rol.nombre
    const isDoctor = rol === "DOCTOR"

    if (rol !== "ADMIN" && rol !== "DOCTOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const accion = searchParams.get("accion")
    const entidad = searchParams.get("entidad")
    const buscarUsuario = searchParams.get("usuario")
    const modulo = searchParams.get("modulo") // FARMACIA, CLINICA, or TODOS
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")))
    const skip = (page - 1) * limit

    // Construir filtros dinámicos
    const where: any = {}

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = toManaguaStartOfDay(startDate)
      }
      if (endDate) {
        where.createdAt.lte = toManaguaEndOfDay(endDate)
      }
    } else {
      // Por defecto: última semana
      const range = getManaguaDateRange('semana')
      where.createdAt = {
        gte: range.startDate,
        lte: range.endDate
      }
    }

    if (accion && accion !== "TODOS") {
      where.accion = accion
    }

    if (entidad && entidad !== "TODOS") {
      where.entidad = entidad
    }

    if (buscarUsuario && !isDoctor) {
      where.usuario = {
        nombreCompleto: { contains: buscarUsuario, mode: "insensitive" },
      }
    }

    if (isDoctor) {
      // Forzar filtros clínicos y de usuario propio para DOCTOR
      where.modulo = "CLINICA"
      where.idUsuario = user.id
    } else if (modulo && modulo !== "TODOS") {
      where.modulo = modulo
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

    // Estadísticas rápidas para el período filtrado en Managua TZ
    const rangeToday = getManaguaDateRange('hoy')
    const queryHoy: any = {
      createdAt: {
        gte: rangeToday.startDate,
        lte: rangeToday.endDate
      }
    }

    if (isDoctor) {
      queryHoy.modulo = "CLINICA"
      queryHoy.idUsuario = user.id
    }

    const [accionesHoy, totalPeriodo] = await Promise.all([
      prisma.auditoriaLog.count({ where: queryHoy }),
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
