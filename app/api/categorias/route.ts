import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const categorias = await prisma.categoriaProducto.findMany({
      include: {
        _count: {
          select: { productos: true },
        },
      },
      orderBy: { nombre: "asc" },
    })

    return NextResponse.json(categorias)
  } catch (error) {
    console.error("Error fetching categorías:", error)
    return NextResponse.json({ error: "Error fetching categorías" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verificar que sea ADMIN
    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })

    if (usuarioDb?.rol.nombre !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { nombre, descripcion } = await request.json()

    if (!nombre) {
      return NextResponse.json({ error: "Nombre es requerido" }, { status: 400 })
    }

    const categoria = await prisma.categoriaProducto.create({
      data: { nombre, descripcion },
    })

    return NextResponse.json(categoria, { status: 201 })
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "La categoría ya existe" }, { status: 400 })
    }
    console.error("Error creating categoría:", error)
    return NextResponse.json({ error: "Error creating categoría" }, { status: 500 })
  }
}
