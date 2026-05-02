import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { productoSchema } from "@/lib/validations"

// Obtener un producto por id
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const producto = await prisma.producto.findUnique({
      where: { id: Number.parseInt(id) },
      include: { categoria: true },
    })

    if (!producto) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    return NextResponse.json(producto)
  } catch (error) {
    console.error("Error fetching producto:", error)
    return NextResponse.json({ error: "Error fetching producto" }, { status: 500 })
  }
}

// Actualizar datos del producto (ADMIN)
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

    // Zod validation
    const parsed = productoSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      )
    }

    const data = parsed.data

    const producto = await prisma.producto.update({
      where: { id: Number.parseInt(id) },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        idCategoria: data.idCategoria,
        precioCompra: data.precioCompra || 0,
        precioVenta: data.precioVenta,
        precioBlister: data.precioBlister,
        precioCaja: data.precioCaja,
        unidadesPorBlister: data.unidadesPorBlister,
        unidadesPorCaja: data.unidadesPorCaja,
        stockActual: data.stockActual,
        stockMinimo: data.stockMinimo,
        activo: data.activo,
      },
      include: { categoria: true },
    })

    return NextResponse.json(producto)
  } catch (error) {
    console.error("Error updating producto:", error)
    return NextResponse.json({ error: "Error updating producto" }, { status: 500 })
  }
}

// Activar / desactivar producto (borrado lógico)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Aquí puedes decidir si solo ADMIN puede cambiar el estado
    // o también EMPLEADO. Si quieres solo ADMIN, descomenta el bloque:

    // const usuarioDb = await prisma.usuario.findUnique({
    //   where: { id: user.id },
    //   include: { rol: true },
    // })
    // if (usuarioDb?.rol.nombre !== "ADMIN") {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    // }

    const { id } = await params
    const { activo } = await request.json()

    const product = await prisma.producto.update({
      where: { id: Number.parseInt(id) },
      data: { activo },
      include: { categoria: true },
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error("Error patching producto:", error)
    return NextResponse.json({ error: "Error patching producto" }, { status: 500 })
  }
}
