import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { servicioSchema, emptyToNull } from "@/lib/validations"
import { registrarLog } from "@/lib/audit"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const servicio = await prisma.servicioPodologia.findUnique({
      where: { id: Number.parseInt(id) },
    })

    if (!servicio) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 })
    }

    return NextResponse.json(servicio)
  } catch (error) {
    console.error("Error fetching servicio:", error)
    return NextResponse.json({ error: "Error fetching servicio" }, { status: 500 })
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
    const servicioId = Number.parseInt(id)
    const body = await request.json()
    const validation = servicioSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const { nombre, descripcion, precio, duracion, activo } = validation.data

    const duplicate = await prisma.servicioPodologia.findFirst({
      where: {
        nombre: { equals: nombre, mode: "insensitive" },
        id: { not: servicioId }
      }
    })
    if (duplicate) {
      return NextResponse.json({ error: "Ya existe otro servicio con este nombre" }, { status: 400 })
    }

    const servicio = await prisma.servicioPodologia.update({
      where: { id: servicioId },
      data: {
        nombre,
        descripcion: emptyToNull(descripcion),
        precio,
        duracion,
        activo: activo ?? true,
      },
    })

    registrarLog({
      accion: "ACTUALIZAR_SERVICIO",
      entidad: "ServicioPodologia",
      entidadId: servicio.id,
      idUsuario: user.id,
      modulo: "CLINICA",
      detalles: { nombre: servicio.nombre, precio: Number(servicio.precio) }
    })

    return NextResponse.json(servicio)
  } catch (error) {
    console.error("Error updating servicio:", error)
    return NextResponse.json({ error: "Error al actualizar el servicio" }, { status: 500 })
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
    const servicioId = Number.parseInt(id)
    const { activo } = await request.json()

    const servicio = await prisma.servicioPodologia.update({
      where: { id: servicioId },
      data: { activo },
    })

    registrarLog({
      accion: activo ? "ACTIVAR_SERVICIO" : "DESACTIVAR_SERVICIO",
      entidad: "ServicioPodologia",
      entidadId: servicio.id,
      idUsuario: user.id,
      modulo: "CLINICA",
      detalles: { nombre: servicio.nombre, activo }
    })

    return NextResponse.json(servicio)
  } catch (error) {
    console.error("Error patching servicio:", error)
    return NextResponse.json({ error: "Error al cambiar estado de servicio" }, { status: 500 })
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
    const servicioId = Number.parseInt(id)

    // Check if service has been used in clinical appointments/consultations
    const count = await prisma.atencionPodologica.count({
      where: { idServicio: servicioId }
    })

    const servicio = await prisma.servicioPodologia.findUnique({
      where: { id: servicioId }
    })

    if (!servicio) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 })
    }

    if (count > 0) {
      // Perform logical delete: set active to false
      await prisma.servicioPodologia.update({
        where: { id: servicioId },
        data: { activo: false }
      })
      registrarLog({
        accion: "DESACTIVAR_SERVICIO_POR_DELETE",
        entidad: "ServicioPodologia",
        entidadId: servicioId,
        idUsuario: user.id,
        modulo: "CLINICA",
        detalles: { nombre: servicio.nombre, nota: "Desactivado lógicamente por tener atenciones asociadas" }
      })
      return NextResponse.json({ success: true, message: "Servicio desactivado lógicamente por tener historial" })
    }

    // Physical delete if not used
    await prisma.servicioPodologia.delete({
      where: { id: servicioId }
    })

    registrarLog({
      accion: "ELIMINAR_SERVICIO",
      entidad: "ServicioPodologia",
      entidadId: servicioId,
      idUsuario: user.id,
      modulo: "CLINICA",
      detalles: { nombre: servicio.nombre }
    })

    return NextResponse.json({ success: true, message: "Servicio eliminado exitosamente" })
  } catch (error) {
    console.error("Error deleting servicio:", error)
    return NextResponse.json({ error: "Error al eliminar el servicio" }, { status: 500 })
  }
}
