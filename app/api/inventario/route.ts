import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

// GET /api/inventario?tab=lotes|movimientos|alertas
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const tab = searchParams.get("tab") || "lotes"
    const idProducto = searchParams.get("idProducto")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    if (tab === "lotes") {
      // Active batches with product info
      const where: any = { activo: true, stockActual: { gt: 0 } }
      if (idProducto) where.idProducto = Number.parseInt(idProducto)

      const lotes = await prisma.lote.findMany({
        where,
        include: { producto: { include: { categoria: true } } },
        orderBy: [{ fechaVencimiento: "asc" }, { createdAt: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      })

      const total = await prisma.lote.count({ where })

      return NextResponse.json({ lotes, total, page, limit })
    }

    if (tab === "movimientos") {
      // Kardex — all inventory movements
      const where: any = {}
      if (idProducto) where.idProducto = Number.parseInt(idProducto)

      const movimientos = await prisma.movimientoInventario.findMany({
        where,
        include: {
          producto: true,
          lote: true,
          usuario: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      })

      const total = await prisma.movimientoInventario.count({ where })

      return NextResponse.json({ movimientos, total, page, limit })
    }

    if (tab === "alertas") {
      const now = new Date()
      const noventaDias = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
      const treintaDias = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      // Expired batches
      const lotesVencidos = await prisma.lote.findMany({
        where: {
          activo: true,
          stockActual: { gt: 0 },
          fechaVencimiento: { lte: now },
        },
        include: { producto: true },
        orderBy: { fechaVencimiento: "asc" },
      })

      // Batches expiring within 90 days
      const lotesPorVencer = await prisma.lote.findMany({
        where: {
          activo: true,
          stockActual: { gt: 0 },
          fechaVencimiento: {
            gt: now,
            lte: noventaDias,
          },
        },
        include: { producto: true },
        orderBy: { fechaVencimiento: "asc" },
      })

      // Products with low stock
      const productosStockBajo = await prisma.producto.findMany({
        where: {
          activo: true,
          stockMinimo: { not: null },
          stockActual: { lte: prisma.producto.fields.stockMinimo as any },
        },
        include: { categoria: true },
      })

      // Fallback: manual low stock filter since Prisma can't compare two columns directly
      const todosProductos = await prisma.producto.findMany({
        where: {
          activo: true,
          stockMinimo: { not: null },
        },
        include: { categoria: true },
      })
      const stockBajo = todosProductos.filter(p => p.stockMinimo !== null && p.stockActual <= p.stockMinimo!)

      return NextResponse.json({
        lotesVencidos,
        lotesPorVencer,
        productosStockBajo: stockBajo,
        resumen: {
          totalVencidos: lotesVencidos.length,
          totalPorVencer: lotesPorVencer.length,
          totalStockBajo: stockBajo.length,
        },
      })
    }

    return NextResponse.json({ error: "Tab inválido. Usa: lotes, movimientos, alertas" }, { status: 400 })
  } catch (error) {
    console.error("Error en inventario:", error)
    return NextResponse.json({ error: "Error en inventario" }, { status: 500 })
  }
}
