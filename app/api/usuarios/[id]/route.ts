import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { usuarioSchema } from "@/lib/validations"

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
