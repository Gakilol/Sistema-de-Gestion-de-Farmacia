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
      // Configurar días de vencimiento (por defecto 90 días)
      const diasVencimiento = Number.parseInt(searchParams.get("diasVencimiento") || "90")
      const maxDiasVencimiento = new Date(now.getTime() + diasVencimiento * 24 * 60 * 60 * 1000)

      // 1. Lotes vencidos
      const lotesVencidos = await prisma.lote.findMany({
        where: {
          activo: true,
          stockActual: { gt: 0 },
          fechaVencimiento: { lte: now },
        },
        include: { producto: true },
        orderBy: { fechaVencimiento: "asc" },
      })

      // 2. Lotes por vencer dentro del rango configurado
      const lotesPorVencerRaw = await prisma.lote.findMany({
        where: {
          activo: true,
          stockActual: { gt: 0 },
          fechaVencimiento: {
            gt: now,
            lte: maxDiasVencimiento,
          },
        },
        include: { producto: true },
        orderBy: { fechaVencimiento: "asc" },
      })

      // Sub-clasificación de lotes por vencer
      const lotesPorVencer = lotesPorVencerRaw.map(lote => {
        let clasificacion = "informacion" // 61-90+ días
        let diasRestantes = 0
        if (lote.fechaVencimiento) {
          const diffTime = new Date(lote.fechaVencimiento).getTime() - now.getTime()
          diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          if (diasRestantes <= 30) {
            clasificacion = "critico"
          } else if (diasRestantes <= 60) {
            clasificacion = "advertencia"
          }
        }
        return {
          ...lote,
          diasRestantes,
          clasificacion,
        }
      })

      // 3. Optimización: Query de stock bajo por producto usando Raw SQL para comparar stockActual <= stockMinimo
      // Evita cargar todos los productos en memoria.
      const productosStockBajoRaw: any[] = await prisma.$queryRawUnsafe(`
        SELECT p.id, p.nombre, p."stockActual", p."stockMinimo", c.nombre as "categoriaNombre"
        FROM "Producto" p
        INNER JOIN "CategoriaProducto" c ON p."idCategoria" = c.id
        WHERE p.activo = true 
          AND p."stockMinimo" IS NOT NULL 
          AND p."stockActual" <= p."stockMinimo"
      `)

      const productosStockBajo = productosStockBajoRaw.map(p => ({
        id: p.id,
        nombre: p.nombre,
        stockActual: p.stockActual,
        stockMinimo: p.stockMinimo,
        categoria: {
          nombre: p.categoriaNombre
        }
      }))

      // 4. Alertas de stock bajo por lote (Lote activo con stockActual <= 5 unidades)
      const lotesStockBajo = await prisma.lote.findMany({
        where: {
          activo: true,
          stockActual: {
            gt: 0,
            lte: 5,
          },
        },
        include: { producto: true },
        orderBy: { stockActual: "asc" },
      })

      // 5. Conteo de lotes por producto en el resumen general
      const conteoLotesPorProductoRaw: any[] = await prisma.$queryRawUnsafe(`
        SELECT "idProducto", COUNT(*)::int as "cantidadLotes"
        FROM "Lote"
        WHERE activo = true AND "stockActual" > 0
        GROUP BY "idProducto"
      `)
      const conteoLotesPorProducto = Object.fromEntries(
        conteoLotesPorProductoRaw.map(c => [c.idProducto, c.cantidadLotes])
      )

      return NextResponse.json({
        lotesVencidos,
        lotesPorVencer,
        productosStockBajo,
        lotesStockBajo,
        conteoLotesPorProducto,
        resumen: {
          totalVencidos: lotesVencidos.length,
          totalPorVencer: lotesPorVencer.length,
          totalStockBajo: productosStockBajo.length,
          totalLotesStockBajo: lotesStockBajo.length,
        },
      })
    }

    return NextResponse.json({ error: "Tab inválido. Usa: lotes, movimientos, alertas" }, { status: 400 })
  } catch (error) {
    console.error("Error en inventario:", error)
    return NextResponse.json({ error: "Error en inventario" }, { status: 500 })
  }
}
