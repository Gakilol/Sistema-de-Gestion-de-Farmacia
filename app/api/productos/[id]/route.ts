import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { productoSchema } from "@/lib/validations"
import { registrarLog } from "@/lib/audit"

// Obtener un producto por id (incluye lotes y últimos movimientos)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const producto = await prisma.producto.findUnique({
      where: { id: Number.parseInt(id) },
      include: { 
        categoria: true,
        lotes: {
          where: { activo: true },
          orderBy: { fechaVencimiento: "asc" },
        },
        movimientos: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
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

// Actualizar datos del producto (ADMIN) — Catálogo solamente, no toca stock
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
    const { emptyToNull } = require('@/lib/validations')

    // Only update catalog fields — DO NOT update stockActual
    const producto = await prisma.producto.update({
      where: { id: Number.parseInt(id) },
      data: {
        nombre: data.nombre,
        codigoBarras: emptyToNull(data.codigoBarras),
        imagen: emptyToNull(data.imagen),
        descripcion: emptyToNull(data.descripcion),
        descripcionCorta: emptyToNull(data.descripcionCorta),
        descripcionDetallada: emptyToNull(data.descripcionDetallada),
        observaciones: emptyToNull(data.observaciones),
        idCategoria: data.idCategoria,
        precioCompra: data.precioCompra || 0,
        precioVenta: data.precioVenta,
        precioBlister: data.precioBlister,
        precioCaja: data.precioCaja,
        unidadesPorBlister: data.unidadesPorBlister,
        unidadesPorCaja: data.unidadesPorCaja,
        stockMinimo: data.stockMinimo,
        activo: data.activo,
      },
      include: { categoria: true },
    })

    // Registrar auditoría de actualización
    registrarLog({
      accion: "ACTUALIZAR_PRODUCTO",
      entidad: "Producto",
      entidadId: producto.id,
      idUsuario: user.id,
      detalles: { nombre: producto.nombre, precioVenta: Number(producto.precioVenta) },
    })

    return NextResponse.json(producto)
  } catch (error) {
    console.error("Error updating producto:", error)
    return NextResponse.json({ error: "Error updating producto" }, { status: 500 })
  }
}

// Activar / desactivar producto (borrado lógico) — solo ADMIN
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
    const { activo } = await request.json()

    const product = await prisma.producto.update({
      where: { id: Number.parseInt(id) },
      data: { activo },
      include: { categoria: true },
    })

    registrarLog({
      accion: activo ? "ACTIVAR_PRODUCTO" : "DESACTIVAR_PRODUCTO",
      entidad: "Producto",
      entidadId: product.id,
      idUsuario: user.id,
      detalles: { nombre: product.nombre, activo },
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error("Error patching producto:", error)
    return NextResponse.json({ error: "Error patching producto" }, { status: 500 })
  }
}
