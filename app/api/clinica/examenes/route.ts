import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { examenPacienteSchema } from "@/lib/validations"
import { tienePermiso } from "@/lib/permissions"
import { registrarLog } from "@/lib/audit"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })

    if (!usuarioDb || !usuarioDb.activo) {
      return NextResponse.json({ error: "Usuario inactivo o no encontrado" }, { status: 403 })
    }

    const rol = usuarioDb.rol.nombre
    if (!tienePermiso(rol, "EXAMENES", "VER")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const idPacienteStr = searchParams.get("idPaciente")
    if (!idPacienteStr) {
      return NextResponse.json({ error: "El ID del paciente es requerido" }, { status: 400 })
    }

    const idPaciente = parseInt(idPacienteStr, 10)
    if (isNaN(idPaciente)) {
      return NextResponse.json({ error: "ID de paciente inválido" }, { status: 400 })
    }

    const search = searchParams.get("search") || ""
    const tipo = searchParams.get("tipo") || ""
    const fechaDesde = searchParams.get("fechaDesde") || ""
    const fechaHasta = searchParams.get("fechaHasta") || ""

    const whereClause: any = {
      idPaciente,
      activo: true,
    }

    if (tipo) {
      whereClause.tipo = tipo
    }

    if (search) {
      whereClause.OR = [
        { nombre: { contains: search, mode: "insensitive" } },
        { resultado: { contains: search, mode: "insensitive" } },
        { interpretacion: { contains: search, mode: "insensitive" } },
      ]
    }

    if (fechaDesde || fechaHasta) {
      whereClause.fechaExamen = {}
      if (fechaDesde) {
        whereClause.fechaExamen.gte = new Date(fechaDesde)
      }
      if (fechaHasta) {
        const limitDate = new Date(fechaHasta)
        limitDate.setHours(23, 59, 59, 999)
        whereClause.fechaExamen.lte = limitDate
      }
    }

    const examenes = await prisma.examenPaciente.findMany({
      where: whereClause,
      include: {
        registrador: {
          select: {
            id: true,
            nombreCompleto: true,
          },
        },
      },
      orderBy: { fechaExamen: "desc" },
    })

    return NextResponse.json(examenes)
  } catch (error) {
    console.error("Error fetching examenes:", error)
    return NextResponse.json({ error: "Error al obtener exámenes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })

    if (!usuarioDb || !usuarioDb.activo) {
      return NextResponse.json({ error: "Usuario inactivo o no encontrado" }, { status: 403 })
    }

    const rol = usuarioDb.rol.nombre
    if (!tienePermiso(rol, "EXAMENES", "CREAR")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const validation = examenPacienteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const idPaciente = parseInt(body.idPaciente, 10)
    if (isNaN(idPaciente)) {
      return NextResponse.json({ error: "ID de paciente inválido" }, { status: 400 })
    }

    // Verificar que el paciente exista
    const paciente = await prisma.cliente.findUnique({
      where: { id: idPaciente },
    })

    if (!paciente) {
      return NextResponse.json({ error: "El paciente no existe" }, { status: 404 })
    }

    const { nombre, tipo, fechaExamen, resultado, interpretacion, observaciones } = validation.data

    const examen = await prisma.examenPaciente.create({
      data: {
        idPaciente,
        nombre,
        tipo,
        fechaExamen: new Date(fechaExamen),
        resultado,
        interpretacion,
        observaciones,
        registradoPor: user.id,
        esDatoPrueba: usuarioDb.esDatoPrueba,
      },
      include: {
        registrador: {
          select: {
            id: true,
            nombreCompleto: true,
          },
        },
      },
    })

    // Registrar en auditoría
    registrarLog({
      accion: "CREAR_EXAMEN",
      entidad: "ExamenPaciente",
      entidadId: examen.id,
      idUsuario: user.id,
      modulo: "CLINICA",
      detalles: { nombre, tipo, fechaExamen, idPaciente },
    })

    return NextResponse.json(examen, { status: 201 })
  } catch (error: any) {
    console.error("Error creating examen:", error)
    return NextResponse.json({ error: "Error al registrar el examen" }, { status: 500 })
  }
}
