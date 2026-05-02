import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import bcrypt from "bcrypt"

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

    const updateData: any = {}

    if (typeof body.nombreCompleto === "string") {
      updateData.nombreCompleto = body.nombreCompleto
    }
    if (typeof body.idRol === "number") {
      updateData.idRol = body.idRol
    } else if (typeof body.idRol === "string") {
      updateData.idRol = Number(body.idRol)
    }
    if (typeof body.activo === "boolean") {
      updateData.activo = body.activo
    }
    if (body.password) {
      updateData.passwordHash = await bcrypt.hash(body.password, 10)
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
