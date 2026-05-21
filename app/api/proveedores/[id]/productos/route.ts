import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const idProveedor = Number.parseInt(id)

    const catalogo = await prisma.proveedorProducto.findMany({
      where: { idProveedor },
      include: {
        producto: {
          include: { categoria: true }
        }
      },
      orderBy: { producto: { nombre: "asc" } }
    })

    return NextResponse.json(catalogo)
  } catch (error) {
    console.error("Error fetching supplier products:", error)
    return NextResponse.json({ error: "Error al obtener catálogo del proveedor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const idProveedor = Number.parseInt(id)
    
    const { idProducto, precioCompra } = await request.json()
    if (!idProducto) {
      return NextResponse.json({ error: "idProducto es requerido" }, { status: 400 })
    }

    // Check if product exists
    const prod = await prisma.producto.findUnique({
      where: { id: Number(idProducto) }
    })
    if (!prod) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    // Check if relationship already exists
    const duplicate = await prisma.proveedorProducto.findUnique({
      where: {
        idProveedor_idProducto: {
          idProveedor,
          idProducto: Number(idProducto)
        }
      }
    })
    if (duplicate) {
      return NextResponse.json({ error: "Este producto ya está asociado a este proveedor" }, { status: 400 })
    }

    const relacion = await prisma.proveedorProducto.create({
      data: {
        idProveedor,
        idProducto: Number(idProducto),
        precioCompra: precioCompra ? Number(precioCompra) : null
      },
      include: {
        producto: true
      }
    })

    return NextResponse.json(relacion, { status: 201 })
  } catch (error) {
    console.error("Error linking product to supplier:", error)
    return NextResponse.json({ error: "Error al asociar producto al proveedor" }, { status: 500 })
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
    const idProveedor = Number.parseInt(id)

    const searchParams = request.nextUrl.searchParams
    const idProductoStr = searchParams.get("idProducto")
    if (!idProductoStr) {
      return NextResponse.json({ error: "idProducto es requerido" }, { status: 400 })
    }

    const idProducto = Number.parseInt(idProductoStr)

    // Delete relation
    await prisma.proveedorProducto.delete({
      where: {
        idProveedor_idProducto: {
          idProveedor,
          idProducto
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error unlinking product:", error)
    return NextResponse.json({ error: "Error al desasociar producto" }, { status: 500 })
  }
}
