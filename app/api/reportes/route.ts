import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { toManaguaStartOfDay, toManaguaEndOfDay, getManaguaDateRange } from "@/lib/timezone"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")

    let dateWhereVenta: any = {}
    let dateWhereCompra: any = {}
    let dateWhereMovimiento: any = {}

    if (startDateParam || endDateParam) {
      const gte = startDateParam ? toManaguaStartOfDay(startDateParam) : undefined
      const lte = endDateParam ? toManaguaEndOfDay(endDateParam) : undefined

      const range: any = {}
      if (gte) range.gte = gte
      if (lte) range.lte = lte

      dateWhereVenta = { fecha: range }
      dateWhereCompra = { fecha: range }
      dateWhereMovimiento = { createdAt: range }
    } else {
      // Default to current month in Managua TZ
      const range = getManaguaDateRange('mes')
      dateWhereVenta = { fecha: { gte: range.startDate, lte: range.endDate } }
      dateWhereCompra = { fecha: { gte: range.startDate, lte: range.endDate } }
      dateWhereMovimiento = { createdAt: { gte: range.startDate, lte: range.endDate } }
    }

    // 1. KPIs — Ventas + COGS real (desde MovimientoInventario SALIDA_VENTA)
    if (type === "kpis") {
      const ventas = await prisma.venta.aggregate({
        _sum: { total: true },
        _count: true,
        where: {
          estado: "COMPLETADA",
          ...dateWhereVenta.fecha ? { fecha: dateWhereVenta.fecha } : {}
        }
      })
      const compras = await prisma.compra.aggregate({
        _sum: { total: true },
        _count: true,
        where: dateWhereCompra
      })

      // COGS real: suma de costoUnitario * cantidad en movimientos de SALIDA_VENTA
      const movimientosSalida = await prisma.movimientoInventario.findMany({
        where: {
          tipo: "SALIDA_VENTA",
          ...dateWhereMovimiento,
          costoUnitario: { not: null },
        },
        select: { cantidad: true, costoUnitario: true },
      })

      const cogs = movimientosSalida.reduce((acc, m) => {
        return acc + (Number(m.costoUnitario || 0) * m.cantidad)
      }, 0)

      const totalVentas = Number(ventas._sum.total || 0)
      const totalCompras = Number(compras._sum.total || 0)
      const margenBruto = totalVentas - cogs  // Ganancia real basada en COGS

      // Ventas del día de hoy (Managua TZ)
      const todayRange = getManaguaDateRange('hoy')
      const ventasHoy = await prisma.venta.aggregate({
        _sum: { total: true },
        _count: true,
        where: { 
          estado: "COMPLETADA",
          fecha: { gte: todayRange.startDate, lte: todayRange.endDate } 
        }
      })

      // Ventas del mes actual (Managua TZ)
      const monthRange = getManaguaDateRange('mes')
      const ventasMes = await prisma.venta.aggregate({
        _sum: { total: true },
        _count: true,
        where: { 
          estado: "COMPLETADA",
          fecha: { gte: monthRange.startDate, lte: monthRange.endDate } 
        }
      })

      // Count low stock items
      const prods = await prisma.producto.findMany({
        where: { activo: true },
        select: { stockActual: true, stockMinimo: true }
      })
      const stockBajo = prods.filter(p => p.stockActual <= (p.stockMinimo ?? 10)).length

      return NextResponse.json({
        totalVentas,
        totalCompras,
        cogs,
        margenBruto,
        gananciaNeta: margenBruto,
        transaccionesCount: (ventas._count || 0) + (compras._count || 0),
        stockBajo,
        ventasHoy: {
          count: ventasHoy._count || 0,
          total: Number(ventasHoy._sum.total || 0),
        },
        ventasMes: {
          count: ventasMes._count || 0,
          total: Number(ventasMes._sum.total || 0),
        },
      })
    }

    // 2. VENTAS GRÁFICO (Ventas agrupadas por fecha)
    if (type === "ventas-grafico") {
      let chartWhere = dateWhereVenta
      if (!startDateParam && !endDateParam) {
        const range30 = getManaguaDateRange('custom')
        const ago30 = new Date(range30.endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
        chartWhere = { fecha: { gte: ago30, lte: range30.endDate } }
      }

      const ventas = await prisma.venta.findMany({
        where: {
          estado: "COMPLETADA",
          ...chartWhere
        },
        select: { fecha: true, total: true }
      })

      const agrupado: Record<string, number> = {}
      for (const v of ventas) {
        // Format to Managua local date string
        const localDate = new Date(v.fecha.getTime() - 6 * 60 * 60 * 1000)
        const fechaStr = localDate.toISOString().split("T")[0]
        agrupado[fechaStr] = (agrupado[fechaStr] || 0) + Number(v.total)
      }

      const datosGrafico = Object.entries(agrupado).map(([fecha, total]) => ({
        fecha,
        total
      })).sort((a, b) => a.fecha.localeCompare(b.fecha))

      return NextResponse.json(datosGrafico)
    }

    // 3. PRODUCTOS MÁS VENDIDOS
    if (type === "productos-mas-vendidos") {
      const detalles = await prisma.detalleVenta.findMany({
        where: {
          venta: {
            estado: "COMPLETADA",
            ...dateWhereVenta.fecha ? { fecha: dateWhereVenta.fecha } : {}
          }
        },
        include: {
          producto: {
            include: { categoria: true, laboratorioRef: true }
          }
        }
      })

      const map: Record<number, { id: number, nombre: string, categoria: string, laboratorio: string, cantidad: number, total: number }> = {}
      for (const d of detalles) {
        if (!d.producto) continue
        const pid = d.idProducto
        if (!map[pid]) {
          map[pid] = {
            id: pid,
            nombre: d.producto.nombre,
            categoria: d.producto.categoria?.nombre || "Sin Categoría",
            laboratorio: d.producto.laboratorioRef?.nombre || d.producto.laboratorio || "Sin Laboratorio",
            cantidad: 0,
            total: 0
          }
        }
        map[pid].cantidad += d.cantidad
        map[pid].total += Number(d.subtotal)
      }

      const masVendidos = Object.values(map)
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 15)

      return NextResponse.json(masVendidos)
    }

    // 4. CLIENTES FRECUENTES
    if (type === "clientes-frecuentes") {
      const ventasClientes = await prisma.venta.findMany({
        where: {
          estado: "COMPLETADA",
          ...dateWhereVenta.fecha ? { fecha: dateWhereVenta.fecha } : {}
        },
        include: { cliente: true }
      })

      const mapClientes: Record<number, { id: number, nombre: string, cedula: string, comprasCount: number, totalComprado: number }> = {}
      let publicoGeneral = { id: 0, nombre: "Público General", cedula: "—", comprasCount: 0, totalComprado: 0 }

      for (const v of ventasClientes) {
        if (!v.idCliente) {
          publicoGeneral.comprasCount++
          publicoGeneral.totalComprado += Number(v.total)
          continue
        }
        const cid = v.idCliente
        if (!mapClientes[cid] && v.cliente) {
          mapClientes[cid] = {
            id: cid,
            nombre: v.cliente.nombreCompleto,
            cedula: v.cliente.cedula || "—",
            comprasCount: 0,
            totalComprado: 0
          }
        }
        if (mapClientes[cid]) {
          mapClientes[cid].comprasCount++
          mapClientes[cid].totalComprado += Number(v.total)
        }
      }

      const clientesFrecuentes = Object.values(mapClientes)
        .sort((a, b) => b.totalComprado - a.totalComprado)
        .slice(0, 15)

      if (publicoGeneral.comprasCount > 0) {
        clientesFrecuentes.push(publicoGeneral)
      }

      return NextResponse.json(clientesFrecuentes)
    }

    // 5. STOCK BAJO DETALLADO
    if (type === "stock-bajo") {
      const todosProductos = await prisma.producto.findMany({
        where: { activo: true },
        include: { categoria: true },
        orderBy: { stockActual: "asc" }
      })

      const stockBajoLista = todosProductos
        .filter(p => p.stockActual <= (p.stockMinimo ?? 10))
        .map(p => ({
          id: p.id,
          nombre: p.nombre,
          categoria: p.categoria?.nombre || "Sin Categoría",
          stockActual: p.stockActual,
          stockMinimo: p.stockMinimo ?? 10,
          diferencia: (p.stockMinimo ?? 10) - p.stockActual
        }))

      return NextResponse.json(stockBajoLista)
    }

    // 6. MOVIMIENTOS DETALLADOS
    if (type === "movimientos") {
      const ventasList = await prisma.venta.findMany({
        where: dateWhereVenta,
        include: { usuario: true, cliente: true },
        orderBy: { fecha: "desc" }
      })
      const comprasList = await prisma.compra.findMany({
        where: dateWhereCompra,
        include: { usuario: true, proveedor: true },
        orderBy: { fecha: "desc" }
      })

      const movimientos = [
        ...ventasList.map(v => ({
          id: `V-${v.id}`,
          tipo: "VENTA",
          fecha: v.fecha,
          total: Number(v.total),
          usuario: v.usuario?.nombreCompleto || "Usuario del Sistema",
          detalle: v.cliente ? `Cliente: ${v.cliente.nombreCompleto}` : "Público General"
        })),
        ...comprasList.map(c => ({
          id: `C-${c.id}`,
          tipo: "COMPRA",
          fecha: c.fecha,
          total: Number(c.total),
          usuario: c.usuario?.nombreCompleto || "Usuario del Sistema",
          detalle: c.proveedor ? `Proveedor: ${c.proveedor.nombre}` : "Proveedor Externo"
        }))
      ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

      return NextResponse.json(movimientos)
    }

    // 7. LOTES POR VENCER
    if (type === "por-vencer") {
      const noventaDias = new Date()
      noventaDias.setDate(noventaDias.getDate() + 90)
      const ahora = new Date()

      // Lotes vencidos con stock activo
      const lotesVencidos = await prisma.lote.findMany({
        where: {
          activo: true,
          stockActual: { gt: 0 },
          fechaVencimiento: { lte: ahora, not: null },
        },
        include: { producto: { include: { categoria: true } } },
        orderBy: { fechaVencimiento: "asc" },
      })

      // Lotes por vencer (entre hoy y 90 días)
      const lotesPorVencer = await prisma.lote.findMany({
        where: {
          activo: true,
          stockActual: { gt: 0 },
          fechaVencimiento: { gt: ahora, lte: noventaDias },
        },
        include: { producto: { include: { categoria: true } } },
        orderBy: { fechaVencimiento: "asc" },
      })

      const formatLote = (lote: any) => ({
        id: lote.id,
        codigoLote: lote.codigoLote,
        nombre: lote.producto.nombre,
        categoria: lote.producto.categoria?.nombre || "Sin Categoría",
        stockActual: lote.stockActual,
        fechaVencimiento: lote.fechaVencimiento,
        diasRestantes: lote.fechaVencimiento
          ? Math.ceil((new Date(lote.fechaVencimiento).getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })

      const allLotes = [...lotesVencidos, ...lotesPorVencer].map(formatLote)
      return NextResponse.json(allLotes)
    }

    // 8. UTILIDAD BRUTA
    if (type === "utilidad-bruta") {
      const sales = await prisma.venta.findMany({
        where: {
          estado: "COMPLETADA",
          ...dateWhereVenta.fecha ? { fecha: dateWhereVenta.fecha } : {}
        },
        include: {
          detalles: {
            include: {
              lotes: {
                include: {
                  lote: true
                }
              }
            }
          },
          cliente: true
        },
        orderBy: { fecha: "asc" }
      })

      const reportData = sales.map(s => {
        let saleCogs = 0
        for (const det of s.detalles) {
          for (const detLote of det.lotes) {
            saleCogs += Number(detLote.lote.costoCompra) * detLote.cantidad
          }
        }
        const netTotal = Number(s.total)
        const grossProfit = netTotal - saleCogs
        const marginPct = netTotal > 0 ? (grossProfit / netTotal) * 100 : 0
        return {
          id: s.id,
          fecha: s.fecha,
          cliente: s.cliente?.nombreCompleto || "Público General",
          total: netTotal,
          cogs: saleCogs,
          utilidad: grossProfit,
          margenPct
        }
      })

      const totalVentas = reportData.reduce((sum, item) => sum + item.total, 0)
      const totalCogs = reportData.reduce((sum, item) => sum + item.cogs, 0)
      const totalUtilidad = totalVentas - totalCogs
      const marginPctGeneral = totalVentas > 0 ? (totalUtilidad / totalVentas) * 100 : 0

      return NextResponse.json({
        ventas: reportData,
        resumen: {
          totalVentas,
          totalCogs,
          totalUtilidad,
          margenPct: marginPctGeneral
        }
      })
    }

    // 9. UTILIDAD POR PRODUCTO
    if (type === "utilidad-por-producto") {
      const details = await prisma.detalleVenta.findMany({
        where: {
          venta: {
            estado: "COMPLETADA",
            ...dateWhereVenta.fecha ? { fecha: dateWhereVenta.fecha } : {}
          }
        },
        include: {
          producto: {
            include: { categoria: true, laboratorioRef: true }
          },
          lotes: {
            include: { lote: true }
          }
        }
      })

      const productMap: Record<number, {
        id: number
        nombre: string
        categoria: string
        laboratorio: string
        cantidadVendida: number
        ingresosTotales: number
        cogs: number
        utilidad: number
        margenPct: number
      }> = {}

      for (const d of details) {
        if (!d.producto) continue
        const pid = d.idProducto
        if (!productMap[pid]) {
          productMap[pid] = {
            id: pid,
            nombre: d.producto.nombre,
            categoria: d.producto.categoria?.nombre || "Sin Categoría",
            laboratorio: d.producto.laboratorioRef?.nombre || d.producto.laboratorio || "Sin Laboratorio",
            cantidadVendida: 0,
            ingresosTotales: 0,
            cogs: 0,
            utilidad: 0,
            margenPct: 0
          }
        }

        const entry = productMap[pid]
        entry.cantidadVendida += d.cantidad
        entry.ingresosTotales += Number(d.subtotal)

        let lineCogs = 0
        for (const detLote of d.lotes) {
          lineCogs += Number(detLote.lote.costoCompra) * detLote.cantidad
        }
        entry.cogs += lineCogs
      }

      const list = Object.values(productMap).map(item => {
        const utilidad = item.ingresosTotales - item.cogs
        const margenPct = item.ingresosTotales > 0 ? (utilidad / item.ingresosTotales) * 100 : 0
        return {
          ...item,
          utilidad,
          margenPct
        }
      }).sort((a, b) => b.utilidad - a.utilidad)

      return NextResponse.json(list)
    }

    return NextResponse.json({ error: "Tipo de reporte no válido" }, { status: 400 })
  } catch (error) {
    console.error("Error generating report:", error)
    return NextResponse.json({ error: "Error generando el reporte" }, { status: 500 })
  }
}
