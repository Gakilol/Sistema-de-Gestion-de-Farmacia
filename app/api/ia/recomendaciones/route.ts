/**
 * app/api/ia/recomendaciones/route.ts
 * 
 * Endpoint que genera recomendaciones proactivas de la IA para el Dashboard.
 * Solo accesible por ADMIN. Analiza stock, ventas y lotes para dar alertas estructuradas.
 */

import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { registrarLog } from "@/lib/audit"
import { resolveRoleFromId, canViewFinancialData } from "@/lib/ia/permissions"
import { prisma } from "@/lib/prisma"
import type { RecomendacionIA } from "@/lib/ia/types"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const rol = resolveRoleFromId(user.idRol)
    const esAdmin = canViewFinancialData(rol)

    const ahora = new Date()
    const hace30dias = new Date(ahora); hace30dias.setDate(ahora.getDate() - 30)
    const proximos30dias = new Date(ahora); proximos30dias.setDate(ahora.getDate() + 30)
    const proximos90dias = new Date(ahora); proximos90dias.setDate(ahora.getDate() + 90)

    const recomendaciones: RecomendacionIA[] = []

    // 1. Lotes vencidos con stock disponible (máx 10)
    const lotesVencidos = await prisma.lote.findMany({
      where: { activo: true, stockActual: { gt: 0 }, fechaVencimiento: { lt: ahora } },
      include: { producto: { select: { nombre: true } } },
      orderBy: { fechaVencimiento: "asc" },
      take: 10,
    })

    lotesVencidos.forEach((lote) => {
      recomendaciones.push({
        tipo: "LOTE_VENCIDO",
        criticidad: "ALTA",
        producto: lote.producto.nombre,
        descripcion: `El lote ${lote.codigoLote} (${lote.stockActual} u.) venció el ${lote.fechaVencimiento?.toLocaleDateString("es-NI")}. No debe venderse.`,
        accionSugerida: "Retirar del estante y tramitar baja de inventario con el administrador.",
      })
    })

    // 2. Lotes próximos a vencer en 30 días (críticos)
    const lotesCriticos = await prisma.lote.findMany({
      where: { activo: true, stockActual: { gt: 0 }, fechaVencimiento: { gte: ahora, lte: proximos30dias } },
      include: { producto: { select: { nombre: true } } },
      orderBy: { fechaVencimiento: "asc" },
      take: 10,
    })

    lotesCriticos.forEach((lote) => {
      const dias = Math.ceil((lote.fechaVencimiento!.getTime() - ahora.getTime()) / 86400000)
      recomendaciones.push({
        tipo: "LOTE_POR_VENCER",
        criticidad: "ALTA",
        producto: lote.producto.nombre,
        descripcion: `El lote ${lote.codigoLote} (${lote.stockActual} u.) vence en ${dias} días (${lote.fechaVencimiento?.toLocaleDateString("es-NI")}).`,
        accionSugerida: "Priorizar ventas de este lote (FEFO) y considerar descuentos de salida.",
      })
    })

    // 3. Lotes próximos a vencer en 30-90 días (alerta media)
    const lotesMedios = await prisma.lote.findMany({
      where: { activo: true, stockActual: { gt: 0 }, fechaVencimiento: { gt: proximos30dias, lte: proximos90dias } },
      include: { producto: { select: { nombre: true } } },
      orderBy: { fechaVencimiento: "asc" },
      take: 10,
    })

    lotesMedios.forEach((lote) => {
      const dias = Math.ceil((lote.fechaVencimiento!.getTime() - ahora.getTime()) / 86400000)
      recomendaciones.push({
        tipo: "LOTE_POR_VENCER",
        criticidad: "MEDIA",
        producto: lote.producto.nombre,
        descripcion: `El lote ${lote.codigoLote} (${lote.stockActual} u.) vence en ${dias} días.`,
        accionSugerida: "Monitorear rotación de este lote para evitar pérdidas.",
      })
    })

    // 4. Productos con stock crítico (stock actual = 0)
    const sinStock = await prisma.producto.findMany({
      where: { activo: true, stockActual: 0 },
      select: { nombre: true, stockMinimo: true },
      take: 10,
    })

    sinStock.forEach((p) => {
      recomendaciones.push({
        tipo: "STOCK_CRITICO",
        criticidad: "ALTA",
        producto: p.nombre,
        descripcion: `Sin stock disponible. Stock mínimo configurado: ${p.stockMinimo ?? "no definido"} u.`,
        accionSugerida: "Realizar orden de compra urgente.",
      })
    })

    // 5. Productos con stock bajo (>0 pero <= mínimo)
    const activeProductsWithStock = await prisma.producto.findMany({
      where: {
        activo: true,
        stockActual: { gt: 0 },
        stockMinimo: { not: null },
      },
      select: { nombre: true, stockActual: true, stockMinimo: true },
    })

    const stockBajo = activeProductsWithStock
      .filter((p) => p.stockActual <= (p.stockMinimo ?? 0))
      .slice(0, 10)

    stockBajo.forEach((p) => {
      recomendaciones.push({
        tipo: "STOCK_CRITICO",
        criticidad: "MEDIA",
        producto: p.nombre,
        descripcion: `Stock actual (${p.stockActual} u.) está en o por debajo del mínimo (${p.stockMinimo} u.).`,
        accionSugerida: "Planificar reabastecimiento próximo.",
      })
    })

    // 6. Recomendaciones de reabastecimiento basadas en tasa de ventas (solo ADMIN)
    if (esAdmin) {
      const productosConVentas = await prisma.detalleVenta.groupBy({
        by: ["idProducto"],
        where: { venta: { fecha: { gte: hace30dias }, estado: { not: "ANULADA" } } },
        _sum: { cantidad: true },
        orderBy: { _sum: { cantidad: "desc" } },
        take: 20,
      })

      for (const pv of productosConVentas) {
        const producto = await prisma.producto.findUnique({
          where: { id: pv.idProducto },
          select: { nombre: true, stockActual: true },
        })
        if (!producto) continue

        const vendidoPorDia = (pv._sum.cantidad ?? 0) / 30
        if (vendidoPorDia > 0 && producto.stockActual > 0) {
          const diasInventario = Math.floor(producto.stockActual / vendidoPorDia)
          if (diasInventario <= 7) {
            recomendaciones.push({
              tipo: "REABASTECIMIENTO",
              criticidad: diasInventario <= 3 ? "ALTA" : "MEDIA",
              producto: producto.nombre,
              descripcion: `Inventario estimado para ${diasInventario} día(s) según la tasa de ventas de los últimos 30 días.`,
              accionSugerida: `Reabastecer para al menos 30 días. Cantidad sugerida: ${Math.ceil(vendidoPorDia * 30 - producto.stockActual)} u.`,
              diasInventario,
            })
          }
        }
      }

      // 7. Inconsistencias de inventario
      const inconsistencias = await prisma.$queryRaw<{ id: number; nombre: string; stockActual: number; sumaLotes: number }[]>`
        SELECT p.id, p.nombre, p."stockActual", COALESCE(SUM(l."stockActual"), 0)::int AS "sumaLotes"
        FROM "Producto" p
        LEFT JOIN "Lote" l ON l."idProducto" = p.id AND l.activo = true
        WHERE p.activo = true
        GROUP BY p.id, p.nombre, p."stockActual"
        HAVING p."stockActual" != COALESCE(SUM(l."stockActual"), 0)
        LIMIT 5
      `

      inconsistencias.forEach((inc) => {
        recomendaciones.push({
          tipo: "INCONSISTENCIA",
          criticidad: "ALTA",
          producto: inc.nombre,
          descripcion: `Inconsistencia detectada: Stock registrado (${inc.stockActual} u.) ≠ Suma de lotes (${inc.sumaLotes} u.). Diferencia: ${inc.stockActual - inc.sumaLotes} u.`,
          accionSugerida: "Revisar Kardex del producto y crear un ajuste de inventario para corregir la diferencia.",
        })
      })
    }

    // Ordenar: ALTA primero, luego MEDIA, luego BAJA
    const orden: Record<string, number> = { ALTA: 0, MEDIA: 1, BAJA: 2 }
    recomendaciones.sort((a, b) => (orden[a.criticidad] ?? 2) - (orden[b.criticidad] ?? 2))

    registrarLog({
      accion: "IA_CHAT_CONSULTA",
      entidad: "Recomendaciones",
      idUsuario: user.id,
      detalles: { rol, totalRecomendaciones: recomendaciones.length },
    })

    return NextResponse.json({
      recomendaciones: recomendaciones.slice(0, 50),
      total: recomendaciones.length,
      fechaGeneracion: ahora.toISOString(),
    })
  } catch (error: any) {
    console.error("Error en recomendaciones IA:", error.message)
    return NextResponse.json({ error: "Error al generar recomendaciones." }, { status: 500 })
  }
}
