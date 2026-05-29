import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { registrarLog } from "@/lib/audit"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const whereClause: any = {}

    if (startDate && endDate) {
      whereClause.fecha = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const compras = await prisma.compra.findMany({
      where: whereClause,
      include: {
        proveedor: true,
        usuario: { include: { rol: true } },
        detalles: {
          include: { producto: true },
        },
      },
      orderBy: { fecha: "desc" },
    })

    return NextResponse.json(compras)
  } catch (error) {
    console.error("Error fetching compras:", error)
    return NextResponse.json({ error: "Error fetching compras" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { compraSchema } = require('@/lib/validations')
    const validation = compraSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message, details: validation.error.errors },
        { status: 400 }
      )
    }

    const { idProveedor, numeroFactura, fechaCompra, detalles } = validation.data

    // Calcular total
    let total = 0
    for (const detalle of detalles) {
      const subtotal = Number.parseFloat(detalle.precioUnitario) * Number.parseInt(detalle.cantidad)
      total += subtotal
    }

    // ── Transacción atómica: compra + detalles + lotes + stock + movimientos + costo promedio ──
    const compra = await prisma.$transaction(async (tx: any) => {
      const nuevaCompra = await tx.compra.create({
        data: {
          fecha: new Date(),
          fechaCompra: fechaCompra ? new Date(fechaCompra) : new Date(),
          numeroFactura: numeroFactura || null,
          idProveedor,
          idUsuario: user.id,
          total: total,
          detalles: {
            create: detalles.map((d: any) => ({
              idProducto: d.idProducto,
              cantidad: Number.parseInt(d.cantidad),
              precioUnitario: Number.parseFloat(d.precioUnitario),
              subtotal: Number.parseFloat(d.precioUnitario) * Number.parseInt(d.cantidad),
              lote: d.lote || null,
              fechaVencimiento: d.fechaVencimiento ? new Date(d.fechaVencimiento) : null,
            })),
          },
        },
        include: {
          detalles: { include: { producto: true } },
          proveedor: true,
          usuario: { include: { rol: true } },
        },
      })

      // For each detail: create batch, update stock, log movement, recalculate avg cost
      for (const detalle of nuevaCompra.detalles) {
        const cantidad = detalle.cantidad
        const costoUnitario = Number(detalle.precioUnitario)
        const producto = detalle.producto

        // 1. Create Lote (Batch)
        const lote = await tx.lote.create({
          data: {
            idProducto: detalle.idProducto,
            codigoLote: detalle.lote || `COMP-${nuevaCompra.id}-${detalle.id}`,
            fechaVencimiento: detalle.fechaVencimiento,
            stockInicial: cantidad,
            stockActual: cantidad,
            costoCompra: costoUnitario,
            idDetalleCompra: detalle.id,
            activo: true,
          },
        })

        // 2. Calculate new average cost
        const stockAnterior = producto.stockActual
        const costoAnterior = Number(producto.precioCompra)
        const nuevoStockTotal = stockAnterior + cantidad
        const costoPromedio = nuevoStockTotal > 0
          ? ((stockAnterior * costoAnterior) + (cantidad * costoUnitario)) / nuevoStockTotal
          : costoUnitario

        // 3. Update Producto: increment stock + recalculate average cost
        await tx.producto.update({
          where: { id: detalle.idProducto },
          data: {
            stockActual: { increment: cantidad },
            precioCompra: Math.round(costoPromedio * 100) / 100,
          },
        })

        // 4. Create MovimientoInventario
        await tx.movimientoInventario.create({
          data: {
            idProducto: detalle.idProducto,
            idLote: lote.id,
            tipo: "ENTRADA_COMPRA",
            cantidad: cantidad,
            stockResultante: nuevoStockTotal,
            costoUnitario: costoUnitario,
            referencia: `Compra #${nuevaCompra.id}${numeroFactura ? ` (Fact: ${numeroFactura})` : ''}`,
            idUsuario: user.id,
          },
        })
      }

      return nuevaCompra
    })

    // Registrar auditoría
    registrarLog({
      accion: "CREAR_COMPRA",
      entidad: "Compra",
      entidadId: compra.id,
      idUsuario: user.id,
      detalles: {
        total,
        idProveedor,
        numeroFactura,
        items: detalles.length,
        productos: detalles.map((d: any) => ({
          idProducto: d.idProducto,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          lote: d.lote,
        })),
      },
    })

    return NextResponse.json(compra, { status: 201 })
  } catch (error) {
    console.error("Error creating compra:", error)
    return NextResponse.json({ error: "Error creating compra" }, { status: 500 })
  }
}
