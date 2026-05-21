import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

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

    if (startDateParam || endDateParam) {
      const gte = startDateParam ? new Date(startDateParam) : undefined
      const lte = endDateParam ? new Date(endDateParam) : undefined
      
      if (gte) gte.setUTCHours(0, 0, 0, 0)
      if (lte) lte.setUTCHours(23, 59, 59, 999)

      const range: any = {}
      if (gte) range.gte = gte
      if (lte) range.lte = lte

      dateWhereVenta = { fecha: range }
      dateWhereCompra = { fecha: range }
    } else {
      // Default to current month if no range is specified
      const ahora = new Date()
      const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      dateWhereVenta = { fecha: { gte: primerDiaMes } }
      dateWhereCompra = { fecha: { gte: primerDiaMes } }
    }

    // 1. KPIs
    if (type === "kpis") {
      const ventas = await prisma.venta.aggregate({
        _sum: { total: true },
        _count: true,
        where: dateWhereVenta
      })
      const compras = await prisma.compra.aggregate({
        _sum: { total: true },
        _count: true,
        where: dateWhereCompra
      })

      const totalVentas = Number(ventas._sum.total || 0)
      const totalCompras = Number(compras._sum.total || 0)
      const gananciaNeta = totalVentas - totalCompras
      const transaccionesCount = (ventas._count || 0) + (compras._count || 0)

      // Count low stock items using in-memory filter to support custom per-product minima
      const prods = await prisma.producto.findMany({
        where: { activo: true },
        select: { stockActual: true, stockMinimo: true }
      })
      const stockBajo = prods.filter(p => p.stockActual <= (p.stockMinimo ?? 10)).length

      return NextResponse.json({
        totalVentas,
        totalCompras,
        gananciaNeta,
        transaccionesCount,
        stockBajo
      })
    }

    // 2. VENTAS GRÁFICO (Ventas agrupadas por fecha)
    if (type === "ventas-grafico") {
      // Si no hay parámetros de fecha específicos para el gráfico, mostrar últimos 30 días
      let chartWhere = dateWhereVenta
      if (!startDateParam && !endDateParam) {
        const treintaDias = new Date()
        treintaDias.setDate(treintaDias.getDate() - 30)
        chartWhere = { fecha: { gte: treintaDias } }
      }

      const ventas = await prisma.venta.findMany({
        where: chartWhere,
        select: { fecha: true, total: true }
      })

      const agrupado: Record<string, number> = {}
      for (const v of ventas) {
        const fechaStr = v.fecha.toISOString().split("T")[0]
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
          venta: dateWhereVenta
        },
        include: {
          producto: {
            include: { categoria: true }
          }
        }
      })

      const map: Record<number, { id: number, nombre: string, categoria: string, cantidad: number, total: number }> = {}
      for (const d of detalles) {
        if (!d.producto) continue
        const pid = d.idProducto
        if (!map[pid]) {
          map[pid] = {
            id: pid,
            nombre: d.producto.nombre,
            categoria: d.producto.categoria?.nombre || "Sin Categoría",
            cantidad: 0,
            total: 0
          }
        }
        map[pid].cantidad += d.cantidad
        map[pid].total += Number(d.subtotal)
      }

      const masVendidos = Object.values(map)
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 15) // Top 15 más vendidos

      return NextResponse.json(masVendidos)
    }

    // 4. CLIENTES FRECUENTES
    if (type === "clientes-frecuentes") {
      const ventasClientes = await prisma.venta.findMany({
        where: dateWhereVenta,
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
            cedula: v.cliente.cedula,
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
          usuario: v.usuario?.nombre || "Usuario del Sistema",
          detalle: v.cliente ? `Cliente: ${v.cliente.nombreCompleto}` : "Público General"
        })),
        ...comprasList.map(c => ({
          id: `C-${c.id}`,
          tipo: "COMPRA",
          fecha: c.fecha,
          total: Number(c.total),
          usuario: c.usuario?.nombre || "Usuario del Sistema",
          detalle: c.proveedor ? `Proveedor: ${c.proveedor.nombre}` : "Proveedor Externo"
        }))
      ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

      return NextResponse.json(movimientos)
    }

    // 7. PRODUCTOS POR VENCER (Vencen en los próximos 90 días)
    if (type === "por-vencer") {
      const noventaDias = new Date()
      noventaDias.setDate(noventaDias.getDate() + 90)

      const productos = await prisma.producto.findMany({
        where: {
          fechaVencimiento: { lte: noventaDias, not: null },
          activo: true
        },
        orderBy: { fechaVencimiento: "asc" },
        include: { categoria: true }
      })

      return NextResponse.json(productos.map(p => ({
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria?.nombre || "Sin Categoría",
        stockActual: p.stockActual,
        fechaVencimiento: p.fechaVencimiento
      })))
    }

    return NextResponse.json({ error: "Tipo de reporte no válido" }, { status: 400 })
  } catch (error) {
    console.error("Error generating report:", error)
    return NextResponse.json({ error: "Error generando el reporte" }, { status: 500 })
  }
}
