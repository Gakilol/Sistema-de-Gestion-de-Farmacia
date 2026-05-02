import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""

    const proveedores = await prisma.proveedor.findMany({
      where: {
        nombre: { contains: search, mode: "insensitive" },
      },
      orderBy: { nombre: "asc" },
    })

    return NextResponse.json(proveedores)
  } catch (error) {
    console.error("Error fetching proveedores:", error)
    return NextResponse.json({ error: "Error fetching proveedores" }, { status: 500 })
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

    const { nombre, telefono, correo, direccion } = await request.json()

    if (!nombre) {
      return NextResponse.json({ error: "Nombre es requerido" }, { status: 400 })
    }

    const proveedor = await prisma.proveedor.create({
      data: {
        nombre,
        telefono: telefono || null,
        correo: correo || null,
        direccion: direccion || null,
      },
    })

    return NextResponse.json(proveedor, { status: 201 })
  } catch (error) {
    console.error("Error creating proveedor:", error)
    return NextResponse.json({ error: "Error creating proveedor" }, { status: 500 })
  }
}
