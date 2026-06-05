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
    const idCliente = searchParams.get("idCliente")

    const whereClause: any = {}

    if (startDate || endDate) {
      whereClause.fecha = {}
      if (startDate) {
        whereClause.fecha.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.fecha.lte = new Date(endDate)
      }
    }

    if (idCliente) {
      whereClause.idCliente = Number.parseInt(idCliente)
    }

    const ventas = await prisma.venta.findMany({
      where: whereClause,
      include: {
        cliente: true,
        usuario: { include: { rol: true } },
        detalles: { include: { producto: true } },
      },
      orderBy: { fecha: "desc" },
    })

    return NextResponse.json(ventas)
  } catch (error) {
    console.error("Error fetching ventas:", error)
    return NextResponse.json({ error: "Error fetching ventas" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { ventaSchema } = require('@/lib/validations')
    const validation = ventaSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message, details: validation.error.errors },
        { status: 400 }
      )
    }

    const { idCliente, detalles, metodoPago, nombrePodologo, numeroReceta } = validation.data

    // ── Pre-validación: cargar todos los productos de una sola consulta ──
    const productIds = detalles.map((d: any) => d.idProducto)
    const productos = await prisma.producto.findMany({
      where: { id: { in: productIds } },
    })
    const productoMap = new Map(productos.map(p => [p.id, p]))

    // Calcular cantidades totales por producto (agrupa líneas del mismo ítem)
    const cantidadTotalPorProducto = new Map<number, number>()
    for (const detalle of detalles) {
      const producto = productoMap.get(detalle.idProducto)
      if (!producto) {
        return NextResponse.json({ error: `Producto ${detalle.idProducto} no encontrado` }, { status: 404 })
      }

      const tipoUnidad = detalle.tipoUnidad || "UNIDAD"
      let cantidadDeducir = Number.parseInt(detalle.cantidad)
      if (tipoUnidad === "BLISTER") {
        cantidadDeducir = cantidadDeducir * (producto.unidadesPorBlister || 1)
      } else if (tipoUnidad === "CAJA") {
        cantidadDeducir = cantidadDeducir * (producto.unidadesPorCaja || 1)
      }
      detalle.cantidadDeducir = cantidadDeducir

      const prev = cantidadTotalPorProducto.get(detalle.idProducto) || 0
      cantidadTotalPorProducto.set(detalle.idProducto, prev + cantidadDeducir)
    }

    // Validar stock suficiente usando totales agregados
    for (const [idProducto, cantidadTotal] of cantidadTotalPorProducto) {
      const producto = productoMap.get(idProducto)!
      if (producto.stockActual < cantidadTotal) {
        return NextResponse.json({ error: `Stock insuficiente para ${producto.nombre}` }, { status: 400 })
      }
    }

    // ── BLOQUEO DE SEGURIDAD SANITARIA: verificar que no haya lotes vencidos activos ──
    // Se verifica el lote más antiguo (FIFO) para cada producto en la venta.
    // Si el primer lote disponible está vencido, se bloquea la venta completamente.
    const ahora = new Date()
    for (const detalle of detalles) {
      const producto = productoMap.get(detalle.idProducto)!

      const loteMasAntiguo = await prisma.lote.findFirst({
        where: {
          idProducto: detalle.idProducto,
          activo: true,
          stockActual: { gt: 0 },
        },
        orderBy: [
          { fechaVencimiento: "asc" },
          { createdAt: "asc" },
        ],
      })

      if (loteMasAntiguo && loteMasAntiguo.fechaVencimiento) {
        if (new Date(loteMasAntiguo.fechaVencimiento) <= ahora) {
          return NextResponse.json({
            error: `Venta Bloqueada: El lote del medicamento está vencido`,
            detalle: `Producto: ${producto.nombre} | Lote: ${loteMasAntiguo.codigoLote} | Vencimiento: ${new Date(loteMasAntiguo.fechaVencimiento).toLocaleDateString('es-NI')}`,
            codigoError: "LOTE_VENCIDO",
            productoNombre: producto.nombre,
            loteInfo: {
              codigoLote: loteMasAntiguo.codigoLote,
              fechaVencimiento: loteMasAntiguo.fechaVencimiento,
            }
          }, { status: 422 })
        }
      }
    }


    // Validar precios desde la base de datos (evita alteraciones en red)
    for (const detalle of detalles) {
      const producto = productoMap.get(detalle.idProducto)!
      const tipoUnidad = detalle.tipoUnidad || "UNIDAD"
      let expectedPrice = 0
      if (tipoUnidad === "UNIDAD") {
        expectedPrice = Number(producto.precioVenta)
      } else if (tipoUnidad === "BLISTER") {
        if (!producto.precioBlister) {
          return NextResponse.json({ error: `El producto ${producto.nombre} no cuenta con presentación por blíster` }, { status: 400 })
        }
        expectedPrice = Number(producto.precioBlister)
      } else if (tipoUnidad === "CAJA") {
        if (!producto.precioCaja) {
          return NextResponse.json({ error: `El producto ${producto.nombre} no cuenta con presentación por caja` }, { status: 400 })
        }
        expectedPrice = Number(producto.precioCaja)
      }

      if (expectedPrice <= 0) {
        return NextResponse.json({ error: `El precio configurado para ${producto.nombre} (${tipoUnidad}) no es válido (debe ser mayor a 0)` }, { status: 400 })
      }
      detalle.precioUnitario = expectedPrice
    }

    // Calcular total de forma segura
    let total = 0
    for (const detalle of detalles) {
      total += detalle.precioUnitario * Number.parseInt(detalle.cantidad)
    }

    // ── Transacción atómica: venta + detalles + FIFO batch deduction + movimientos ──
    const venta = await prisma.$transaction(async (tx: any) => {
      const nuevaVenta = await tx.venta.create({
        data: {
          fecha: new Date(),
          idCliente: idCliente ? Number.parseInt(idCliente) : null,
          idUsuario: user.id,
          total,
          metodoPago,
          nombrePodologo: nombrePodologo || null,
          numeroReceta: numeroReceta || null,
          detalles: {
            create: detalles.map((d: any) => ({
              idProducto: d.idProducto,
              cantidad: Number.parseInt(d.cantidad),
              precioUnitario: d.precioUnitario,
              subtotal: d.precioUnitario * Number.parseInt(d.cantidad),
              tipoUnidad: d.tipoUnidad || "UNIDAD",
            })),
          },
        },
        include: {
          detalles: { include: { producto: true } },
          cliente: true,
          usuario: { include: { rol: true } },
        },
      })

      // FIFO batch deduction for each product
      for (const detalle of detalles) {
        let pendiente = detalle.cantidadDeducir
        const producto = productoMap.get(detalle.idProducto)!
        const nuevoStockProducto = producto.stockActual - detalle.cantidadDeducir

        // Get active batches ordered by expiration (FIFO — oldest first)
        const lotes = await tx.lote.findMany({
          where: { idProducto: detalle.idProducto, activo: true, stockActual: { gt: 0 } },
          orderBy: [
            { fechaVencimiento: "asc" },
            { createdAt: "asc" },
          ],
        })

        for (const lote of lotes) {
          if (pendiente <= 0) break

          const deducir = Math.min(pendiente, lote.stockActual)
          const nuevoStockLote = lote.stockActual - deducir

          await tx.lote.update({
            where: { id: lote.id },
            data: {
              stockActual: nuevoStockLote,
              activo: nuevoStockLote > 0,
            },
          })

          await tx.movimientoInventario.create({
            data: {
              idProducto: detalle.idProducto,
              idLote: lote.id,
              tipo: "SALIDA_VENTA",
              cantidad: deducir,
              stockResultante: nuevoStockProducto,
              costoUnitario: lote.costoCompra,
              referencia: `Venta #${nuevaVenta.id}`,
              idUsuario: user.id,
            },
          })

          pendiente -= deducir
        }

        // If batches don't cover everything (legacy stock without batches), log it anyway
        if (pendiente > 0) {
          await tx.movimientoInventario.create({
            data: {
              idProducto: detalle.idProducto,
              tipo: "SALIDA_VENTA",
              cantidad: pendiente,
              stockResultante: nuevoStockProducto,
              referencia: `Venta #${nuevaVenta.id} (sin lote)`,
              idUsuario: user.id,
            },
          })
        }

        // Decrement product stock
        await tx.producto.update({
          where: { id: detalle.idProducto },
          data: { stockActual: { decrement: detalle.cantidadDeducir } },
        })
      }

      return nuevaVenta
    })

    // Registrar auditoría (no bloquea la respuesta)
    registrarLog({
      accion: "CREAR_VENTA",
      entidad: "Venta",
      entidadId: venta.id,
      idUsuario: user.id,
      detalles: {
        total,
        metodoPago,
        idCliente: idCliente || null,
        items: detalles.length,
        productos: detalles.map((d: any) => ({
          idProducto: d.idProducto,
          cantidad: d.cantidad,
          tipoUnidad: d.tipoUnidad || "UNIDAD",
        })),
      },
    })

    return NextResponse.json(venta, { status: 201 })
  } catch (error) {
    console.error("Error creating venta:", error)
    return NextResponse.json({ error: "Error creating venta" }, { status: 500 })
  }
}
