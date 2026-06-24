import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { laboratorioSchema, emptyToNull } from "@/lib/validations"
import { registrarLog } from "@/lib/audit"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const laboratorio = await prisma.laboratorio.findUnique({
      where: { id: Number.parseInt(id) },
    })

    if (!laboratorio) {
      return NextResponse.json({ error: "Laboratorio no encontrado" }, { status: 404 })
    }

    return NextResponse.json(laboratorio)
  } catch (error) {
    console.error("Error fetching laboratorio:", error)
    return NextResponse.json({ error: "Error fetching laboratorio" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params
    const laboratorioId = Number.parseInt(id)
    const body = await request.json()
    const validation = laboratorioSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const { nombre, pais, direccion, telefono, correo, contacto, observaciones, activo } = validation.data

    const duplicate = await prisma.laboratorio.findFirst({
      where: {
        nombre: { equals: nombre, mode: "insensitive" },
        id: { not: laboratorioId }
      }
    })
    if (duplicate) {
      return NextResponse.json({ error: "Ya existe otro laboratorio con este nombre" }, { status: 400 })
    }

    const laboratorio = await prisma.laboratorio.update({
      where: { id: laboratorioId },
      data: {
        nombre,
        pais: emptyToNull(pais),
        direccion: emptyToNull(direccion),
        telefono: emptyToNull(telefono),
        correo: emptyToNull(correo),
        contacto: emptyToNull(contacto),
        observaciones: emptyToNull(observaciones),
        activo: activo ?? true,
      },
    })

    registrarLog({
      accion: "ACTUALIZAR_LABORATORIO",
      entidad: "Laboratorio",
      entidadId: laboratorio.id,
      idUsuario: user.id,
      detalles: { nombre: laboratorio.nombre }
    })

    return NextResponse.json(laboratorio)
  } catch (error) {
    console.error("Error updating laboratorio:", error)
    return NextResponse.json({ error: "Error al actualizar el laboratorio" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params
    const laboratorioId = Number.parseInt(id)
    const { activo } = await request.json()

    const laboratorio = await prisma.laboratorio.update({
      where: { id: laboratorioId },
      data: { activo },
    })

    registrarLog({
      accion: activo ? "ACTIVAR_LABORATORIO" : "DESACTIVAR_LABORATORIO",
      entidad: "Laboratorio",
      entidadId: laboratorio.id,
      idUsuario: user.id,
      detalles: { nombre: laboratorio.nombre, activo }
    })

    return NextResponse.json(laboratorio)
  } catch (error) {
    console.error("Error patching laboratorio:", error)
    return NextResponse.json({ error: "Error al cambiar estado de laboratorio" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params
    const laboratorioId = Number.parseInt(id)

    // Check if laboratory has associated products
    const count = await prisma.producto.count({
      where: { idLaboratorio: laboratorioId }
    })

    if (count > 0) {
      return NextResponse.json({ error: "No se puede eliminar el laboratorio porque tiene productos asociados." }, { status: 400 })
    }

    const laboratorio = await prisma.laboratorio.findUnique({
      where: { id: laboratorioId }
    })

    if (!laboratorio) {
      return NextResponse.json({ error: "Laboratorio no encontrado" }, { status: 404 })
    }

    await prisma.laboratorio.delete({
      where: { id: laboratorioId },
    })

    registrarLog({
      accion: "ELIMINAR_LABORATORIO",
      entidad: "Laboratorio",
      entidadId: laboratorioId,
      idUsuario: user.id,
      detalles: { nombre: laboratorio.nombre }
    })

    return NextResponse.json({ success: true, message: "Laboratorio eliminado exitosamente" })
  } catch (error) {
    console.error("Error deleting laboratorio:", error)
    return NextResponse.json({ error: "Error al eliminar el laboratorio" }, { status: 500 })
  }
}
