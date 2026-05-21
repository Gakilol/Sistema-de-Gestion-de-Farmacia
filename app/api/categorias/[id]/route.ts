import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params
    const categoriaId = Number.parseInt(id)

    // Check if category has associated products
    const count = await prisma.producto.count({
      where: { idCategoria: categoriaId }
    })

    if (count > 0) {
      return NextResponse.json({ error: "No se puede eliminar la categoría porque tiene productos asociados." }, { status: 400 })
    }

    await prisma.categoriaProducto.delete({
      where: { id: categoriaId },
    })

    return NextResponse.json({ message: "Categoría eliminada exitosamente" })
  } catch (error) {
    console.error("Error deleting categoría:", error)
    return NextResponse.json({ error: "Error deleting categoría" }, { status: 500 })
  }
}
