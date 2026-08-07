import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getManaguaDateRange, toManaguaEndOfDay, toManaguaStartOfDay } from "@/lib/timezone"
import { calculateExecutiveMetrics } from "@/lib/reportes/metrics"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86_400_000

function parseRange(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const startParam = params.get("startDate")
  const endParam = params.get("endDate")

  if ((startParam && !DATE_RE.test(startParam)) || (endParam && !DATE_RE.test(endParam))) {
    throw new Error("INVALID_DATE")
  }

  const month = getManaguaDateRange("mes")
  const startDate = startParam ? toManaguaStartOfDay(startParam) : month.startDate
  const endDate = endParam ? toManaguaEndOfDay(endParam) : month.endDate
  const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / DAY_MS))

  if (startDate > endDate || days > 366) throw new Error("INVALID_RANGE")

  const previousEnd = new Date(startDate.getTime() - 1)
  const previousStart = new Date(previousEnd.getTime() - days * DAY_MS)
  return { startDate, endDate, previousStart, previousEnd, days }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    if (user.rolNombre !== "ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden consultar reportes financieros." }, { status: 403 })
    }

    const { startDate, endDate, previousStart, previousEnd, days } = parseRange(request)
    const expiryLimit = new Date()
    expiryLimit.setDate(expiryLimit.getDate() + 90)

    const [ventas, ventasPrevias, compras, movimientosSalida, productos, ventasGrafico, lotes] = await Promise.all([
      prisma.venta.aggregate({
        _sum: { total: true },
        _count: true,
        where: { estado: "COMPLETADA", fecha: { gte: startDate, lte: endDate } },
      }),
      prisma.venta.aggregate({
        _sum: { total: true },
        _count: true,
        where: { estado: "COMPLETADA", fecha: { gte: previousStart, lte: previousEnd } },
      }),
      prisma.compra.aggregate({
        _sum: { total: true },
        _count: true,
        where: { fecha: { gte: startDate, lte: endDate } },
      }),
      prisma.movimientoInventario.findMany({
        where: {
          tipo: "SALIDA_VENTA",
          createdAt: { gte: startDate, lte: endDate },
          costoUnitario: { not: null },
        },
        select: { cantidad: true, costoUnitario: true },
      }),
      prisma.producto.findMany({
        where: { activo: true, esServicio: false },
        select: { stockActual: true, stockMinimo: true },
      }),
      prisma.venta.findMany({
        where: { estado: "COMPLETADA", fecha: { gte: startDate, lte: endDate } },
        select: { fecha: true, total: true },
        orderBy: { fecha: "asc" },
      }),
      prisma.lote.findMany({
        where: {
          activo: true,
          stockActual: { gt: 0 },
          fechaVencimiento: { not: null, gt: new Date(), lte: expiryLimit },
          producto: { esServicio: false },
        },
        select: {
          id: true,
          stockActual: true,
          fechaVencimiento: true,
          producto: { select: { nombre: true, categoria: { select: { nombre: true } } } },
        },
        orderBy: { fechaVencimiento: "asc" },
        take: 12,
      }),
    ])

    const totalVentas = Number(ventas._sum.total || 0)
    const totalVentasPrevias = Number(ventasPrevias._sum.total || 0)
    const cogs = movimientosSalida.reduce(
      (sum, movement) => sum + Math.abs(movement.cantidad) * Number(movement.costoUnitario || 0),
      0
    )
    const executiveMetrics = calculateExecutiveMetrics({
      totalVentas,
      totalVentasPrevias,
      ventasCount: ventas._count,
      totalCompras: Number(compras._sum.total || 0),
      comprasCount: compras._count,
      cogs,
      stockBajo: productos.filter((product) => product.stockActual <= (product.stockMinimo ?? 10)).length,
    })

    const grouped: Record<string, number> = {}
    for (const sale of ventasGrafico) {
      const managuaDate = new Date(sale.fecha.getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 10)
      grouped[managuaDate] = (grouped[managuaDate] || 0) + Number(sale.total)
    }

    const response = NextResponse.json({
      kpis: {
        ...executiveMetrics,
      },
      grafico: Object.entries(grouped).map(([fecha, total]) => ({ fecha, total })),
      vencer: lotes.map((lot) => ({
        id: lot.id,
        nombre: lot.producto.nombre,
        categoria: lot.producto.categoria?.nombre || "Sin categoría",
        stockActual: lot.stockActual,
        fechaVencimiento: lot.fechaVencimiento,
      })),
      periodo: { inicio: startDate, fin: endDate, dias: days },
    })
    response.headers.set("Cache-Control", "private, no-store")
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    if (message === "INVALID_DATE" || message === "INVALID_RANGE") {
      return NextResponse.json({ error: "El rango de fechas es inválido o supera 366 días." }, { status: 400 })
    }
    console.error("Error al generar resumen de reportes")
    return NextResponse.json({ error: "No se pudo generar el resumen de reportes." }, { status: 500 })
  }
}
