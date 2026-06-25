import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { usuarioSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const idRol = searchParams.get("idRol")
    const estado = searchParams.get("estado") ?? "todos" // todos, activos, inactivos
    const search = searchParams.get("search")

    const where: any = {
      eliminadoEn: null // Solo usuarios no eliminados lógicamente
    }

    if (idRol) {
      where.idRol = Number.parseInt(idRol)
    }

    if (estado === "activos") {
      where.activo = true
    } else if (estado === "inactivos") {
      where.activo = false
    }

    if (search && search.trim() !== "") {
      where.OR = [
        { nombreCompleto: { contains: search, mode: "insensitive" } },
        { correo: { contains: search, mode: "insensitive" } }
      ]
    }

    const usuarios = await prisma.usuario.findMany({
      where,
      include: { rol: true },
      orderBy: { nombreCompleto: "asc" },
    })

    return NextResponse.json(
      usuarios.map((u) => ({
        id: u.id,
        nombreCompleto: u.nombreCompleto,
        correo: u.correo,
        idRol: u.idRol,
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

    const body = await request.json()
    const validation = usuarioSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const { nombreCompleto, correo, password, idRol } = validation.data

    if (!password) {
      return NextResponse.json({ error: "La contraseña es obligatoria para nuevos usuarios" }, { status: 400 })
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
