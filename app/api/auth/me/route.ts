import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })

    if (!usuarioDb) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    return NextResponse.json({
      user: {
        id: usuarioDb.id,
        nombreCompleto: usuarioDb.nombreCompleto,
        correo: usuarioDb.correo,
        rolNombre: usuarioDb.rol.nombre, // "ADMIN" | "EMPLEADO"
      },
    })
  } catch (error) {
    console.error("Error in /api/auth/me:", error)
    return NextResponse.json({ user: null }, { status: 200 })
  }
}
