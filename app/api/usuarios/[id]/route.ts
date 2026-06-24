import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { usuarioSchema } from "@/lib/validations"
import { registrarLog } from "@/lib/audit"

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
    const body = await request.json()
    const validation = usuarioSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const { nombreCompleto, correo, password, idRol } = validation.data

    const updateData: any = {}

    if (nombreCompleto) updateData.nombreCompleto = nombreCompleto
    if (correo) updateData.correo = correo
    if (idRol) updateData.idRol = idRol
    if (typeof body.activo === "boolean") updateData.activo = body.activo
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10)
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: Number(id) },
      data: updateData,
      include: { rol: true },
    })

    registrarLog({
      accion: "ACTUALIZAR_USUARIO",
      entidad: "Usuario",
      entidadId: usuarioActualizado.id,
      idUsuario: user.id,
      detalles: { nombreCompleto: usuarioActualizado.nombreCompleto, rol: usuarioActualizado.rol.nombre }
    })

    return NextResponse.json({
      id: usuarioActualizado.id,
      nombreCompleto: usuarioActualizado.nombreCompleto,
      correo: usuarioActualizado.correo,
      rolNombre: usuarioActualizado.rol.nombre,
      activo: usuarioActualizado.activo,
    })
  } catch (error) {
    console.error("Error updating usuario:", error)
    return NextResponse.json({ error: "Error updating usuario" }, { status: 500 })
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
    const targetId = Number(id)
    const body = await request.json()

    const updateData: any = {}

    if (typeof body.activo === "boolean") {
      // Check if toggling off last admin
      if (!body.activo) {
        const targetUser = await prisma.usuario.findUnique({
          where: { id: targetId },
          include: { rol: true }
        })
        if (targetUser?.rol.nombre === "ADMIN") {
          const adminsCount = await prisma.usuario.count({
            where: { rol: { nombre: "ADMIN" }, activo: true }
          })
          if (adminsCount <= 1) {
            return NextResponse.json({ error: "No se puede desactivar al único administrador activo" }, { status: 400 })
          }
        }
      }
      updateData.activo = body.activo
    }

    if (body.idRol) {
      updateData.idRol = Number(body.idRol)
    }

    if (body.password) {
      if (body.password.length < 8) {
        return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 })
      }
      updateData.passwordHash = await bcrypt.hash(body.password, 10)
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: targetId },
      data: updateData,
      include: { rol: true }
    })

    registrarLog({
      accion: "ACTUALIZAR_USUARIO_PATCH",
      entidad: "Usuario",
      entidadId: targetId,
      idUsuario: user.id,
      detalles: {
        nombreCompleto: usuarioActualizado.nombreCompleto,
        activo: usuarioActualizado.activo,
        rol: usuarioActualizado.rol.nombre
      }
    })

    return NextResponse.json({
      id: usuarioActualizado.id,
      nombreCompleto: usuarioActualizado.nombreCompleto,
      correo: usuarioActualizado.correo,
      rolNombre: usuarioActualizado.rol.nombre,
      activo: usuarioActualizado.activo,
    })
  } catch (error) {
    console.error("Error updating usuario via PATCH:", error)
    return NextResponse.json({ error: "Error updating usuario" }, { status: 500 })
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
    const targetId = Number(id)

    if (targetId === user.id) {
      return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 })
    }

    // Check if target is ADMIN and if it is the last ADMIN
    const targetUser = await prisma.usuario.findUnique({
      where: { id: targetId },
      include: { rol: true }
    })

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    if (targetUser.rol.nombre === "ADMIN") {
      const adminsCount = await prisma.usuario.count({
        where: { rol: { nombre: "ADMIN" }, activo: true }
      })
      if (adminsCount <= 1) {
        return NextResponse.json({ error: "No se puede eliminar al único administrador activo" }, { status: 400 })
      }
    }

    // Perform logical delete: set activo to false
    const usuarioEliminado = await prisma.usuario.update({
      where: { id: targetId },
      data: { activo: false }
    })

    registrarLog({
      accion: "ELIMINAR_USUARIO",
      entidad: "Usuario",
      entidadId: targetId,
      idUsuario: user.id,
      detalles: { nombreCompleto: usuarioEliminado.nombreCompleto }
    })

    return NextResponse.json({ success: true, message: "Usuario desactivado lógicamente" })
  } catch (error) {
    console.error("Error deleting usuario:", error)
    return NextResponse.json({ error: "Error deleting usuario" }, { status: 500 })
  }
}
