import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { productoUpdateSchema, emptyToNull } from "@/lib/validations"
import { registrarLog } from "@/lib/audit"

// Obtener un producto por id (incluye lotes, movimientos y estadísticas)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const idProducto = Number.parseInt(id)

    const producto = await prisma.producto.findUnique({
      where: { id: idProducto },
      include: { 
        categoria: true,
        lotes: {
          orderBy: { fechaVencimiento: "asc" },
        },
        movimientos: {
          include: { lote: true, usuario: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    })

    if (!producto) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    const ahora = new Date()
    const noventaDias = new Date(ahora.getTime() + 90 * 24 * 60 * 60 * 1000)

    // Enriquecer lotes con estado individual y días restantes
    const lotesEnriquecidos = (producto.lotes || []).map(lote => {
      let estadoLote = "vigente"
      let diasRestantes = null

      if (lote.fechaVencimiento) {
        const diffTime = new Date(lote.fechaVencimiento).getTime() - ahora.getTime()
        diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        if (diasRestantes <= 0) {
          estadoLote = "vencido"
        } else if (diasRestantes <= 90) {
          estadoLote = "proximo_a_vencer"
        }
      } else if (lote.stockActual === 0) {
        estadoLote = "sin_stock"
      }

      return {
        ...lote,
        diasRestantes,
        estadoLote,
      }
    })

    // Calcular estadísticas de ventas
    const salesStats = await prisma.detalleVenta.aggregate({
      where: {
        idProducto,
        venta: { estado: "COMPLETADA" }
      },
      _sum: {
        cantidad: true,
        subtotal: true
      },
      _count: {
        id: true
      }
    })

    const stats = {
      totalVendidos: salesStats._sum.cantidad || 0,
      totalRecaudado: salesStats._sum.subtotal ? Number(salesStats._sum.subtotal) : 0,
      ventasContadas: salesStats._count.id || 0,
    }

    // Calcular estado general del producto
    const stockTotal = lotesEnriquecidos.reduce((sum, l) => sum + (l.activo ? l.stockActual : 0), 0)
    let proximoVencimiento: Date | null = null
    for (const l of lotesEnriquecidos) {
      if (l.fechaVencimiento && l.stockActual > 0) {
        const lDate = new Date(l.fechaVencimiento)
        if (!proximoVencimiento || lDate < proximoVencimiento) {
          proximoVencimiento = lDate
        }
      }
    }

    let estadoProducto = "vigente"
    if (stockTotal === 0) {
      estadoProducto = "sin_stock"
    } else if (proximoVencimiento) {
      if (proximoVencimiento <= ahora) {
        estadoProducto = "vencido"
      } else if (proximoVencimiento <= noventaDias) {
        estadoProducto = "proximo_a_vencer"
      }
    }

    return NextResponse.json({
      ...producto,
      lotes: lotesEnriquecidos,
      stockTotal,
      proximoVencimiento: proximoVencimiento ? proximoVencimiento.toISOString() : null,
      estadoProducto,
      stats,
    })
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
    console.log(`PUT /api/productos/${id} received body:`, body)

    // Zod validation
    const parsed = productoUpdateSchema.safeParse(body)
    if (!parsed.success) {
      console.log(`PUT /api/productos/${id} validation failed:`, parsed.error.format())
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      )
    }

    const data = parsed.data
    // Only update catalog fields — DO NOT update stockActual
    const producto = await prisma.producto.update({
      where: { id: Number.parseInt(id) },
      data: {
        nombre: data.nombre,
        codigoBarras: emptyToNull(data.codigoBarras),
        descripcion: emptyToNull(data.descripcion),
        idCategoria: data.idCategoria,
        idLaboratorio: data.idLaboratorio,
        laboratorio: emptyToNull(data.laboratorio),
        concentracion: emptyToNull(data.concentracion),
        formaPresentacion: emptyToNull(data.formaPresentacion),
        unidadMedida: emptyToNull(data.unidadMedida),
        precioCompra: data.precioCompra || 0,
        precioVenta: data.precioVenta,
        precioBlister: data.precioBlister,
        precioCaja: data.precioCaja,
        unidadesPorBlister: data.unidadesPorBlister,
        unidadesPorCaja: data.unidadesPorCaja,
        blísteresPorCaja: data.blísteresPorCaja,
        margenUtilidad: data.margenUtilidad,
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
    return NextResponse.json({ 
      error: "Error updating producto", 
      details: { _errors: [error instanceof Error ? error.message : String(error)] } 
    }, { status: 500 })
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
