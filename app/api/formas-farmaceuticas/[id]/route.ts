import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { registrarLog } from "@/lib/audit"

// PUT /api/formas-farmaceuticas/[id] (ADMIN)
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
    const idForma = Number.parseInt(id)
    const body = await request.json()
    const { nombre, descripcion, activo, orden } = body

    if (!nombre || nombre.trim() === "") {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })
    }

    // Buscar forma farmacéutica actual
    const formaActual = await prisma.formaFarmaceutica.findUnique({
      where: { id: idForma }
    })

    if (!formaActual) {
      return NextResponse.json({ error: "Forma farmacéutica no encontrada" }, { status: 404 })
    }

    // Verificar nombre único si cambia
    if (formaActual.nombre !== nombre.trim()) {
      const existe = await prisma.formaFarmaceutica.findUnique({
        where: { nombre: nombre.trim() }
      })
      if (existe) {
        return NextResponse.json({ error: "Ya existe una forma farmacéutica con ese nombre" }, { status: 400 })
      }
    }

    const formaActualizada = await prisma.formaFarmaceutica.update({
      where: { id: idForma },
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        activo: activo !== undefined ? Boolean(activo) : true,
        orden: orden !== undefined ? Number(orden) : 0,
      }
    })

    // Registrar en auditoría
    registrarLog({
      accion: "ACTUALIZAR_FORMA_FARMACEUTICA",
      entidad: "FormaFarmaceutica",
      entidadId: formaActualizada.id,
      idUsuario: user.id,
      detalles: {
        nombre: formaActualizada.nombre,
        datosAnteriores: { nombre: formaActual.nombre, activo: formaActual.activo, orden: formaActual.orden },
        datosNuevos: { nombre: formaActualizada.nombre, activo: formaActualizada.activo, orden: formaActualizada.orden }
      },
    })

    return NextResponse.json(formaActualizada)
  } catch (error) {
    console.error("Error updating forma farmaceutica:", error)
    return NextResponse.json({ error: "Error al actualizar la forma farmacéutica" }, { status: 500 })
  }
}

// DELETE /api/formas-farmaceuticas/[id] (ADMIN)
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const idForma = Number.parseInt(id)

    // Buscar forma farmacéutica
    const forma = await prisma.formaFarmaceutica.findUnique({
      where: { id: idForma },
      include: {
        _count: {
          select: { productos: true }
        }
      }
    })

    if (!forma) {
      return NextResponse.json({ error: "Forma farmacéutica no encontrada" }, { status: 404 })
    }

    // Regla: No permitir eliminar si tiene productos asociados
    if (forma._count.productos > 0) {
      return NextResponse.json({
        error: "No se puede eliminar la forma farmacéutica porque tiene productos asociados"
      }, { status: 400 })
    }

    await prisma.formaFarmaceutica.delete({
      where: { id: idForma }
    })

    // Registrar en auditoría
    registrarLog({
      accion: "ELIMINAR_FORMA_FARMACEUTICA",
      entidad: "FormaFarmaceutica",
      entidadId: idForma,
      idUsuario: user.id,
      detalles: { nombre: forma.nombre },
    })

    return NextResponse.json({ message: "Forma farmacéutica eliminada exitosamente" })
  } catch (error) {
    console.error("Error deleting forma farmaceutica:", error)
    return NextResponse.json({ error: "Error al eliminar la forma farmacéutica" }, { status: 500 })
  }
}
