import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import bcrypt from "bcrypt"

export async function GET() {
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

    const usuarios = await prisma.usuario.findMany({
      include: { rol: true },
      orderBy: { nombreCompleto: "asc" },
    })

    return NextResponse.json(
      usuarios.map((u) => ({
        id: u.id,
        nombreCompleto: u.nombreCompleto,
        correo: u.correo,
        rolNombre: u.rol.nombre,
        activo: u.activo,
        createdAt: u.createdAt,
      })),
    )
  } catch (error) {
    console.error("Error fetching usuarios:", error)
    return NextResponse.json({ error: "Error fetching usuarios" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const { nombreCompleto, correo, password, idRol } = await request.json()

    if (!nombreCompleto || !correo || !password || !idRol) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombreCompleto,
        correo,
        passwordHash,
        idRol: Number(idRol), // <--- IMPORTANTE
        activo: true,
      },
      include: { rol: true },
    })

    return NextResponse.json(
      {
        id: nuevoUsuario.id,
        nombreCompleto: nuevoUsuario.nombreCompleto,
        correo: nuevoUsuario.correo,
        rolNombre: nuevoUsuario.rol.nombre,
        activo: nuevoUsuario.activo,
      },
      { status: 201 },
    )
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "El correo ya existe" }, { status: 400 })
    }
    console.error("Error creating usuario:", error)
    return NextResponse.json({ error: "Error creating usuario" }, { status: 500 })
  }
}
