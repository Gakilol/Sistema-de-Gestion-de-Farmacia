import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { categoriaSchema, emptyToNull } from "@/lib/validations"
import { registrarLog } from "@/lib/audit"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const categoria = await prisma.categoriaProducto.findUnique({
      where: { id: Number.parseInt(id) },
    })

    if (!categoria) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 })
    }

    return NextResponse.json(categoria)
  } catch (error) {
    console.error("Error fetching categoría:", error)
    return NextResponse.json({ error: "Error fetching categoría" }, { status: 500 })
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
    const categoriaId = Number.parseInt(id)
    const body = await request.json()
    const validation = categoriaSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const { nombre, descripcion, activo } = validation.data

    const duplicate = await prisma.categoriaProducto.findFirst({
      where: {
        nombre: { equals: nombre, mode: "insensitive" },
        id: { not: categoriaId }
      }
    })
    if (duplicate) {
      return NextResponse.json({ error: "Ya existe otra categoría con este nombre" }, { status: 400 })
    }

    const categoria = await prisma.categoriaProducto.update({
      where: { id: categoriaId },
      data: {
        nombre,
        descripcion: emptyToNull(descripcion),
        activo: activo ?? true,
      },
    })

    registrarLog({
      accion: "ACTUALIZAR_CATEGORIA",
      entidad: "CategoriaProducto",
      entidadId: categoria.id,
      idUsuario: user.id,
      detalles: { nombre: categoria.nombre }
    })

    return NextResponse.json(categoria)
  } catch (error) {
    console.error("Error updating categoría:", error)
    return NextResponse.json({ error: "Error al actualizar la categoría" }, { status: 500 })
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
    const categoriaId = Number.parseInt(id)
    const { activo } = await request.json()

    const categoria = await prisma.categoriaProducto.update({
      where: { id: categoriaId },
      data: { activo },
    })

    registrarLog({
      accion: activo ? "ACTIVAR_CATEGORIA" : "DESACTIVAR_CATEGORIA",
      entidad: "CategoriaProducto",
      entidadId: categoria.id,
      idUsuario: user.id,
      detalles: { nombre: categoria.nombre, activo }
    })

    return NextResponse.json(categoria)
  } catch (error) {
    console.error("Error patching categoría:", error)
    return NextResponse.json({ error: "Error al cambiar estado de categoría" }, { status: 500 })
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
    const categoriaId = Number.parseInt(id)

    // Check if category has associated products
    const count = await prisma.producto.count({
      where: { idCategoria: categoriaId }
    })

    if (count > 0) {
      return NextResponse.json({ error: "No se puede eliminar la categoría porque tiene productos asociados." }, { status: 400 })
    }

    const categoria = await prisma.categoriaProducto.findUnique({
      where: { id: categoriaId }
    })

    if (!categoria) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 })
    }

    await prisma.categoriaProducto.delete({
      where: { id: categoriaId },
    })

    registrarLog({
      accion: "ELIMINAR_CATEGORIA",
      entidad: "CategoriaProducto",
      entidadId: categoriaId,
      idUsuario: user.id,
      detalles: { nombre: categoria.nombre }
    })

    return NextResponse.json({ success: true, message: "Categoría eliminada exitosamente" })
  } catch (error) {
    console.error("Error deleting categoría:", error)
    return NextResponse.json({ error: "Error al eliminar la categoría" }, { status: 500 })
  }
}
