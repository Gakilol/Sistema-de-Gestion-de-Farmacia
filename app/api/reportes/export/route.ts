import { type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { toManaguaStartOfDay, toManaguaEndOfDay, getManaguaDateRange } from "@/lib/timezone"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import { ReporteKpisDocument, ReporteUtilidadBrutaDocument, ReporteUtilidadProductoDocument } from "@/lib/pdf-templates"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 401 })
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
      const range = getManaguaDateRange('mes')
      dateWhereVenta = { fecha: { gte: range.startDate, lte: range.endDate } }
      dateWhereCompra = { fecha: { gte: range.startDate, lte: range.endDate } }
      dateWhereMovimiento = { createdAt: { gte: range.startDate, lte: range.endDate } }
    }

    let pdfElement: React.ReactElement

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
      const margenBruto = totalVentas - cogs

      const todayRange = getManaguaDateRange('hoy')
      const ventasHoy = await prisma.venta.aggregate({
        _sum: { total: true },
        _count: true,
        where: { 
          estado: "COMPLETADA",
          fecha: { gte: todayRange.startDate, lte: todayRange.endDate } 
        }
      })

      const monthRange = getManaguaDateRange('mes')
      const ventasMes = await prisma.venta.aggregate({
        _sum: { total: true },
        _count: true,
        where: { 
          estado: "COMPLETADA",
          fecha: { gte: monthRange.startDate, lte: monthRange.endDate } 
        }
      })

      const prods = await prisma.producto.findMany({
        where: { activo: true },
        select: { stockActual: true, stockMinimo: true }
      })
      const stockBajo = prods.filter(p => p.stockActual <= (p.stockMinimo ?? 10)).length

      const data = {
        totalVentas,
        totalCompras,
        cogs,
        margenBruto,
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
      }

      pdfElement = React.createElement(ReporteKpisDocument, {
        data,
        start: startDateParam || "",
        end: endDateParam || ""
      })

    } else if (type === "utilidad-bruta") {
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
        const margenPct = netTotal > 0 ? (grossProfit / netTotal) * 100 : 0
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

      const data = {
        ventas: reportData,
        resumen: {
          totalVentas,
          totalCogs,
          totalUtilidad,
          margenPct: marginPctGeneral
        }
      }

      pdfElement = React.createElement(ReporteUtilidadBrutaDocument, {
        data,
        start: startDateParam || "",
        end: endDateParam || ""
      })

    } else if (type === "utilidad-por-producto") {
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

      pdfElement = React.createElement(ReporteUtilidadProductoDocument, {
        data: list,
        start: startDateParam || "",
        end: endDateParam || ""
      })

    } else {
      return new Response("Tipo de reporte no válido", { status: 400 })
    }

    const buffer = await renderToBuffer(pdfElement)

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="reporte-${type}-${startDateParam || "inicio"}-${endDateParam || "fin"}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error exporting PDF:", error)
    return new Response("Error al exportar PDF", { status: 500 })
  }
}
