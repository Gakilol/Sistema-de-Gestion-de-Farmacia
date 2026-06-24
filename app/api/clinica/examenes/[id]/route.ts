import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { examenPacienteSchema } from "@/lib/validations"
import { tienePermiso } from "@/lib/permissions"
import { registrarLog } from "@/lib/audit"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const idExamen = parseInt(id, 10)
    if (isNaN(idExamen)) {
      return NextResponse.json({ error: "ID de examen inválido" }, { status: 400 })
    }

    const examen = await prisma.examenPaciente.findFirst({
      where: {
        id: idExamen,
        activo: true,
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

    if (!examen) {
      return NextResponse.json({ error: "Examen no encontrado" }, { status: 404 })
    }

    return NextResponse.json(examen)
  } catch (error) {
    console.error("Error fetching examen:", error)
    return NextResponse.json({ error: "Error al obtener el examen" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    if (!tienePermiso(rol, "EXAMENES", "EDITAR")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { id } = await params
    const idExamen = parseInt(id, 10)
    if (isNaN(idExamen)) {
      return NextResponse.json({ error: "ID de examen inválido" }, { status: 400 })
    }

    // Verificar si el examen existe
    const examenExistente = await prisma.examenPaciente.findFirst({
      where: {
        id: idExamen,
        activo: true,
      },
    })

    if (!examenExistente) {
      return NextResponse.json({ error: "Examen no encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const validation = examenPacienteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const { nombre, tipo, fechaExamen, resultado, interpretacion, observaciones } = validation.data

    const examenActualizado = await prisma.examenPaciente.update({
      where: { id: idExamen },
      data: {
        nombre,
        tipo,
        fechaExamen: new Date(fechaExamen),
        resultado,
        interpretacion,
        observaciones,
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

    // Registrar auditoría
    registrarLog({
      accion: "EDITAR_EXAMEN",
      entidad: "ExamenPaciente",
      entidadId: examenActualizado.id,
      idUsuario: user.id,
      modulo: "CLINICA",
      detalles: { nombre, tipo, fechaExamen, idPaciente: examenActualizado.idPaciente },
    })

    return NextResponse.json(examenActualizado)
  } catch (error) {
    console.error("Error updating examen:", error)
    return NextResponse.json({ error: "Error al actualizar el examen" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    if (!tienePermiso(rol, "EXAMENES", "ELIMINAR")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { id } = await params
    const idExamen = parseInt(id, 10)
    if (isNaN(idExamen)) {
      return NextResponse.json({ error: "ID de examen inválido" }, { status: 400 })
    }

    const examenExistente = await prisma.examenPaciente.findFirst({
      where: {
        id: idExamen,
        activo: true,
      },
    })

    if (!examenExistente) {
      return NextResponse.json({ error: "Examen no encontrado o ya eliminado" }, { status: 404 })
    }

    // Eliminación lógica
    const examenEliminado = await prisma.examenPaciente.update({
      where: { id: idExamen },
      data: {
        activo: false,
        deletedAt: new Date(),
      },
    })

    // Registrar auditoría
    registrarLog({
      accion: "ELIMINAR_EXAMEN",
      entidad: "ExamenPaciente",
      entidadId: examenEliminado.id,
      idUsuario: user.id,
      modulo: "CLINICA",
      detalles: { nombre: examenExistente.nombre, idPaciente: examenExistente.idPaciente },
    })

    return NextResponse.json({ message: "Examen eliminado con éxito" })
  } catch (error) {
    console.error("Error deleting examen:", error)
    return NextResponse.json({ error: "Error al eliminar el examen" }, { status: 500 })
  }
}
