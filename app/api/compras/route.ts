import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { registrarLog } from "@/lib/audit"
import { compraSchema } from "@/lib/validations"
import { toManaguaStartOfDay, toManaguaEndOfDay } from "@/lib/timezone"

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
        gte: toManaguaStartOfDay(startDate),
        lte: toManaguaEndOfDay(endDate),
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
    const validation = compraSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const { idProveedor, numeroFactura, fechaCompra, detalles } = validation.data

    // 1. Detección de lote duplicado en misma compra: Agrupar detalles por idProducto + lote
    const detallesAgrupados: any[] = []
    for (const d of detalles) {
      const loteNormalizado = (d.lote || "").trim()
      const key = `${d.idProducto}-${loteNormalizado.toUpperCase()}`
      const existingIndex = detallesAgrupados.findIndex(
        (x) => `${x.idProducto}-${(x.lote || "").trim().toUpperCase()}` === key
      )

      if (existingIndex !== -1) {
        const existing = detallesAgrupados[existingIndex]
        const totalQty = existing.cantidad + d.cantidad
        const totalCost = (existing.precioUnitario * existing.cantidad) + (d.precioUnitario * d.cantidad)
        existing.precioUnitario = totalQty > 0 ? (totalCost / totalQty) : d.precioUnitario
        existing.cantidad = totalQty
      } else {
        detallesAgrupados.push({
          idProducto: d.idProducto,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          lote: loteNormalizado || null,
          fechaVencimiento: d.fechaVencimiento ? d.fechaVencimiento.trim() : null
        })
      }
    }

    // Calcular total acumulado de la compra
    let total = 0
    for (const detalle of detallesAgrupados) {
      const subtotal = detalle.precioUnitario * detalle.cantidad
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
            create: detallesAgrupados.map((d: any) => ({
              idProducto: d.idProducto,
              cantidad: Number.parseInt(d.cantidad),
              precioUnitario: Number.parseFloat(d.precioUnitario),
              subtotal: Number.parseFloat(d.precioUnitario) * Number.parseInt(d.cantidad),
              lote: d.lote,
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

      // For each detail: update or create batch, update stock, log movement, recalculate avg cost
      for (const detalle of nuevaCompra.detalles) {
        const cantidad = detalle.cantidad
        const costoUnitario = Number(detalle.precioUnitario)
        const producto = detalle.producto
        let loteId: number

        // Detectar si el lote ya existe para este producto
        if (detalle.lote) {
          const loteExistente = await tx.lote.findUnique({
            where: {
              idProducto_codigoLote: {
                idProducto: detalle.idProducto,
                codigoLote: detalle.lote,
              },
            },
          })

          if (loteExistente) {
            // Lote existente: Sumar stock
            const loteActualizado = await tx.lote.update({
              where: { id: loteExistente.id },
              data: {
                stockInicial: { increment: cantidad },
                stockActual: { increment: cantidad },
                costoCompra: costoUnitario, // Actualizar costo de compra al último registrado
                idDetalleCompra: detalle.id,
                activo: true,
              },
            })
            loteId = loteActualizado.id
          } else {
            // Lote nuevo
            const nuevoLote = await tx.lote.create({
              data: {
                idProducto: detalle.idProducto,
                codigoLote: detalle.lote,
                fechaVencimiento: detalle.fechaVencimiento,
                stockInicial: cantidad,
                stockActual: cantidad,
                costoCompra: costoUnitario,
                idDetalleCompra: detalle.id,
                activo: true,
              },
            })
            loteId = nuevoLote.id
          }
        } else {
          // Lote autogenerado de respaldo
          const codigoGenerado = `COMP-${nuevaCompra.id}-${detalle.id}`
          const nuevoLote = await tx.lote.create({
            data: {
              idProducto: detalle.idProducto,
              codigoLote: codigoGenerado,
              fechaVencimiento: detalle.fechaVencimiento,
              stockInicial: cantidad,
              stockActual: cantidad,
              costoCompra: costoUnitario,
              idDetalleCompra: detalle.id,
              activo: true,
            },
          })
          loteId = nuevoLote.id
        }

        // Recalcular costo promedio ponderado
        const stockAnterior = producto.stockActual
        const costoAnterior = Number(producto.precioCompra)
        const nuevoStockTotal = stockAnterior + cantidad
        const costoPromedio = nuevoStockTotal > 0
          ? ((stockAnterior * costoAnterior) + (cantidad * costoUnitario)) / nuevoStockTotal
          : costoUnitario

        // Actualizar stock del producto y costo promedio
        await tx.producto.update({
          where: { id: detalle.idProducto },
          data: {
            stockActual: { increment: cantidad },
            precioCompra: Math.round(costoPromedio * 100) / 100,
          },
        })

        // Registrar movimiento de inventario (KARDEX)
        await tx.movimientoInventario.create({
          data: {
            idProducto: detalle.idProducto,
            idLote: loteId,
            tipo: "ENTRADA_COMPRA",
            cantidad: cantidad,
            stockResultante: nuevoStockTotal,
            costoUnitario: costoUnitario,
            referencia: `Compra #${nuevaCompra.id}${numeroFactura ? ` (Fact: ${numeroFactura})` : ''}`,
            idUsuario: user.id,
            observacion: `Entrada por compra. Lote: ${detalle.lote || 'N/A'}`
          },
        })
      }

      return nuevaCompra
    }, {
      maxWait: 10000,
      timeout: 20000,
    })

    // Registrar en auditoría general de la aplicación
    registrarLog({
      accion: "CREAR_COMPRA",
      entidad: "Compra",
      entidadId: compra.id,
      idUsuario: user.id,
      detalles: {
        total,
        idProveedor,
        numeroFactura,
        items: detallesAgrupados.length,
        productos: detallesAgrupados.map((d: any) => ({
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
