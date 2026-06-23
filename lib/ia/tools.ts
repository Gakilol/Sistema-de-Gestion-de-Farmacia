/**
 * lib/ia/tools.ts
 * Implementación de todas las herramientas de IA.
 * 
 * REGLAS CRÍTICAS:
 * 1. La IA (Gemini) NUNCA accede directamente a Prisma ni a la BD.
 * 2. Cada herramienta valida parámetros con los esquemas de schemas.ts.
 * 3. Cada herramienta filtra campos financieros según el rol del usuario.
 * 4. Los errores nunca exponen stack traces, SQL, secretos ni estructura interna.
 * 5. Todos los resultados están limitados en cantidad para evitar abuso.
 */

import { prisma } from "@/lib/prisma"
import { canViewFinancialData } from "./permissions"
import {
  safeParseToolArgs,
  GetDashboardSummarySchema,
  GetLowStockProductsSchema,
  GetExpiredProductsSchema,
  GetProductsNearExpirationSchema,
  SearchProductsSchema,
  GetProductDetailsSchema,
  GetProductLotsSchema,
  GetTopSellingProductsSchema,
  GetSalesSummarySchema,
  GetInventoryMovementsSchema,
  GetAuditAlertsSchema,
  GetSuggestedPurchaseOrderSchema,
  CreatePurchaseDraftSchema,
  CreateInventoryAdjustmentDraftSchema,
} from "./schemas"
import type {
  ToolResult,
  DashboardSummaryResult,
  ProductoResumen,
  LoteResumen,
  ProductoConLotes,
  ProductoVendido,
  VentaResumen,
  MovimientoKardex,
  AlertaAuditoria,
  BorradorOrdenCompra,
  BorradorAjusteInventario,
  UserRole,
  ItemBorradorCompra,
} from "./types"

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function safeError(message: string): ToolResult<never> {
  return { ok: false, error: message, code: "INTERNAL_ERROR" }
}

function calcularEstadoLote(
  fechaVencimiento: Date | null,
  ahora: Date
): LoteResumen["estado"] {
  if (!fechaVencimiento) return "VIGENTE"
  const dias = Math.ceil((fechaVencimiento.getTime() - ahora.getTime()) / 86400000)
  if (dias < 0) return "VENCIDO"
  if (dias <= 30) return "POR_VENCER_CRITICO"
  if (dias <= 90) return "POR_VENCER"
  return "VIGENTE"
}

function formatearLote(lote: {
  id: number
  codigoLote: string
  fechaVencimiento: Date | null
  stockActual: number
  stockInicial: number
  costoCompra: any
}, ahora: Date, mostrarCosto: boolean): LoteResumen {
  const dias = lote.fechaVencimiento
    ? Math.ceil((lote.fechaVencimiento.getTime() - ahora.getTime()) / 86400000)
    : null
  return {
    id: lote.id,
    codigoLote: lote.codigoLote,
    fechaVencimiento: lote.fechaVencimiento?.toISOString().split("T")[0] ?? null,
    diasParaVencer: dias,
    stockActual: lote.stockActual,
    stockInicial: lote.stockInicial,
    ...(mostrarCosto ? { costoCompra: Number(lote.costoCompra) } : {}),
    estado: calcularEstadoLote(lote.fechaVencimiento, ahora),
  }
}

function formatearProducto(p: {
  id: number
  nombre: string
  stockActual: number
  stockMinimo: number | null
  categoria: { nombre: string }
  laboratorio: string | null
  precioVenta: any
  precioCompra: any
  activo: boolean
}, mostrarCosto: boolean): ProductoResumen {
  return {
    id: p.id,
    nombre: p.nombre,
    stockActual: p.stockActual,
    stockMinimo: p.stockMinimo,
    categoria: p.categoria.nombre,
    laboratorio: p.laboratorio,
    precioVenta: Number(p.precioVenta),
    ...(mostrarCosto ? { precioCompra: Number(p.precioCompra) } : {}),
    activo: p.activo,
  }
}

// ---------------------------------------------------------------------------
// 1. getDashboardSummary
// ---------------------------------------------------------------------------

export async function getDashboardSummary(
  args: unknown,
  rol: UserRole
): Promise<ToolResult<DashboardSummaryResult>> {
  try {
    const ahora = new Date()
    const hace30dias = new Date(ahora); hace30dias.setDate(ahora.getDate() - 30)
    const hoy = new Date(ahora); hoy.setHours(0, 0, 0, 0)
    const tresMeses = new Date(ahora); tresMeses.setMonth(ahora.getMonth() + 3)

    const activeProducts = await prisma.producto.findMany({
      where: { activo: true },
      select: { stockActual: true, stockMinimo: true },
    })

    const totalProductos = activeProducts.length
    const totalStockUnidades = activeProducts.reduce((sum, p) => sum + p.stockActual, 0)
    const stockBajoCount = activeProducts.filter(
      (p) => p.stockMinimo !== null && p.stockActual <= p.stockMinimo
    ).length

    const [lotesVencidos, lotesPorVencer] = await Promise.all([
      prisma.lote.count({
        where: { activo: true, stockActual: { gt: 0 }, fechaVencimiento: { lt: ahora } },
      }),
      prisma.lote.count({
        where: { activo: true, stockActual: { gt: 0 }, fechaVencimiento: { gte: ahora, lte: tresMeses } },
      }),
    ])

    const result: DashboardSummaryResult = {
      totalProductos,
      totalStockUnidades,
      productosStockBajo: stockBajoCount,
      lotesPorVencer,
      lotesVencidos,
      fechaConsulta: ahora.toISOString().split("T")[0],
    }

    if (canViewFinancialData(rol)) {
      const [ventasHoy, ventasMes] = await Promise.all([
        prisma.venta.count({ where: { fecha: { gte: hoy }, estado: { not: "ANULADA" } } }),
        prisma.venta.aggregate({
          where: { fecha: { gte: hace30dias }, estado: { not: "ANULADA" } },
          _sum: { total: true },
        }),
      ])
      result.ventasHoy = ventasHoy
      result.ingresosMes = Number(ventasMes._sum.total ?? 0)
    }

    return {
      ok: true,
      data: result,
      meta: { fuenteDatos: "Inventario, Lotes y Ventas en tiempo real." },
    }
  } catch {
    return safeError("No se pudo obtener el resumen del sistema. Intenta nuevamente.")
  }
}

// ---------------------------------------------------------------------------
// 2. getLowStockProducts
// ---------------------------------------------------------------------------

export async function getLowStockProducts(
  args: unknown,
  rol: UserRole
): Promise<ToolResult<ProductoResumen[]>> {
  const parsed = safeParseToolArgs(GetLowStockProductsSchema, args ?? {})
  if (!parsed.success) return { ok: false, error: parsed.error, code: "INVALID_PARAMS" }
  const { limit, offset } = parsed.data

  try {
    const mostrarCosto = canViewFinancialData(rol)

    const activeProducts = await prisma.producto.findMany({
      where: { activo: true, stockMinimo: { not: null } },
      select: { id: true, stockActual: true, stockMinimo: true },
    })
    const lowStockIds = activeProducts
      .filter((p) => p.stockActual <= (p.stockMinimo ?? 0))
      .map((p) => p.id)

    const productos = await prisma.producto.findMany({
      where: {
        id: { in: lowStockIds },
      },
      select: {
        id: true, nombre: true, stockActual: true, stockMinimo: true,
        laboratorio: true, precioVenta: true, precioCompra: true, activo: true,
        categoria: { select: { nombre: true } },
      },
      orderBy: { stockActual: "asc" },
      take: limit,
      skip: offset,
    })

    const total = lowStockIds.length

    return {
      ok: true,
      data: productos.map((p) => formatearProducto(p, mostrarCosto)),
      meta: { total, limit, offset, fuenteDatos: "Inventario actual del catálogo de productos." },
    }
  } catch {
    return safeError("Error al consultar productos con stock bajo.")
  }
}

// ---------------------------------------------------------------------------
// 3. getExpiredProducts
// ---------------------------------------------------------------------------

export async function getExpiredProducts(
  args: unknown,
  rol: UserRole
): Promise<ToolResult<(ProductoResumen & { loteVencido: LoteResumen })[]>> {
  const parsed = safeParseToolArgs(GetExpiredProductsSchema, args ?? {})
  if (!parsed.success) return { ok: false, error: parsed.error, code: "INVALID_PARAMS" }
  const { limit, offset } = parsed.data

  try {
    const ahora = new Date()
    const mostrarCosto = canViewFinancialData(rol)

    const lotes = await prisma.lote.findMany({
      where: { activo: true, stockActual: { gt: 0 }, fechaVencimiento: { lt: ahora } },
      include: {
        producto: { select: { id: true, nombre: true, stockActual: true, stockMinimo: true, laboratorio: true, precioVenta: true, precioCompra: true, activo: true, categoria: { select: { nombre: true } } } },
      },
      orderBy: { fechaVencimiento: "asc" },
      take: limit,
      skip: offset,
    })

    const total = await prisma.lote.count({
      where: { activo: true, stockActual: { gt: 0 }, fechaVencimiento: { lt: ahora } },
    })

    return {
      ok: true,
      data: lotes.map((l) => ({
        ...formatearProducto(l.producto, mostrarCosto),
        loteVencido: formatearLote(l, ahora, mostrarCosto),
      })),
      meta: { total, limit, offset, fuenteDatos: `Lotes vencidos al ${ahora.toLocaleDateString("es-NI")}.` },
    }
  } catch {
    return safeError("Error al consultar productos vencidos.")
  }
}

// ---------------------------------------------------------------------------
// 4. getProductsNearExpiration
// ---------------------------------------------------------------------------

export async function getProductsNearExpiration(
  args: unknown,
  rol: UserRole
): Promise<ToolResult<(ProductoResumen & { lote: LoteResumen })[]>> {
  const parsed = safeParseToolArgs(GetProductsNearExpirationSchema, args ?? {})
  if (!parsed.success) return { ok: false, error: parsed.error, code: "INVALID_PARAMS" }
  const { dias, limit, offset } = parsed.data

  try {
    const ahora = new Date()
    const limite = new Date(ahora); limite.setDate(ahora.getDate() + dias)
    const mostrarCosto = canViewFinancialData(rol)

    const lotes = await prisma.lote.findMany({
      where: { activo: true, stockActual: { gt: 0 }, fechaVencimiento: { gte: ahora, lte: limite } },
      include: {
        producto: { select: { id: true, nombre: true, stockActual: true, stockMinimo: true, laboratorio: true, precioVenta: true, precioCompra: true, activo: true, categoria: { select: { nombre: true } } } },
      },
      orderBy: { fechaVencimiento: "asc" },
      take: limit,
      skip: offset,
    })

    const total = await prisma.lote.count({
      where: { activo: true, stockActual: { gt: 0 }, fechaVencimiento: { gte: ahora, lte: limite } },
    })

    return {
      ok: true,
      data: lotes.map((l) => ({
        ...formatearProducto(l.producto, mostrarCosto),
        lote: formatearLote(l, ahora, mostrarCosto),
      })),
      meta: {
        total, limit, offset,
        fuenteDatos: `Lotes próximos a vencer en los próximos ${dias} días (hasta el ${limite.toLocaleDateString("es-NI")}).`,
      },
    }
  } catch {
    return safeError("Error al consultar productos próximos a vencer.")
  }
}

// ---------------------------------------------------------------------------
// 5. searchProducts
// ---------------------------------------------------------------------------

export async function searchProducts(
  args: unknown,
  rol: UserRole
): Promise<ToolResult<ProductoResumen[]>> {
  const parsed = safeParseToolArgs(SearchProductsSchema, args)
  if (!parsed.success) return { ok: false, error: parsed.error, code: "INVALID_PARAMS" }
  const { query, limit, offset } = parsed.data

  if (!query || query.length < 2) {
    return { ok: false, error: "El término de búsqueda debe tener al menos 2 caracteres.", code: "INVALID_PARAMS" }
  }

  try {
    const mostrarCosto = canViewFinancialData(rol)
    const productos = await prisma.producto.findMany({
      where: {
        activo: true,
        OR: [
          { nombre: { contains: query, mode: "insensitive" } },
          { descripcion: { contains: query, mode: "insensitive" } },
          { laboratorio: { contains: query, mode: "insensitive" } },
          { concentracion: { contains: query, mode: "insensitive" } },
          { categoria: { nombre: { contains: query, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true, nombre: true, stockActual: true, stockMinimo: true,
        laboratorio: true, precioVenta: true, precioCompra: true, activo: true,
        categoria: { select: { nombre: true } },
      },
      orderBy: { nombre: "asc" },
      take: limit,
      skip: offset,
    })

    return {
      ok: true,
      data: productos.map((p) => formatearProducto(p, mostrarCosto)),
      meta: {
        total: productos.length, limit, offset,
        fuenteDatos: `Búsqueda en catálogo de productos activos. Término: "${query}".`,
      },
    }
  } catch {
    return safeError("Error al buscar productos.")
  }
}

// ---------------------------------------------------------------------------
// 6. getProductDetails
// ---------------------------------------------------------------------------

export async function getProductDetails(
  args: unknown,
  rol: UserRole
): Promise<ToolResult<ProductoConLotes>> {
  const parsed = safeParseToolArgs(GetProductDetailsSchema, args)
  if (!parsed.success) return { ok: false, error: parsed.error, code: "INVALID_PARAMS" }
  const { productoId } = parsed.data

  try {
    const ahora = new Date()
    const mostrarCosto = canViewFinancialData(rol)

    const producto = await prisma.producto.findUnique({
      where: { id: productoId, activo: true },
      select: {
        id: true, nombre: true, stockActual: true, stockMinimo: true,
        laboratorio: true, precioVenta: true, precioCompra: true, activo: true,
        categoria: { select: { nombre: true } },
        lotes: {
          where: { activo: true, stockActual: { gt: 0 } },
          select: { id: true, codigoLote: true, fechaVencimiento: true, stockActual: true, stockInicial: true, costoCompra: true },
          orderBy: { fechaVencimiento: "asc" },
        },
      },
    })

    if (!producto) {
      return { ok: false, error: `No se encontró el producto con ID ${productoId}.`, code: "NOT_FOUND" }
    }

    return {
      ok: true,
      data: {
        ...formatearProducto(producto, mostrarCosto),
        lotes: producto.lotes.map((l) => formatearLote(l, ahora, mostrarCosto)),
      },
      meta: { fuenteDatos: `Datos del producto ID ${productoId} con sus lotes activos (FEFO).` },
    }
  } catch {
    return safeError("Error al obtener detalles del producto.")
  }
}

// ---------------------------------------------------------------------------
// 7. getProductLots — FEFO: ordenados por fechaVencimiento ASC
// ---------------------------------------------------------------------------

export async function getProductLots(
  args: unknown,
  rol: UserRole
): Promise<ToolResult<{ producto: string; lotes: LoteResumen[] }>> {
  const parsed = safeParseToolArgs(GetProductLotsSchema, args)
  if (!parsed.success) return { ok: false, error: parsed.error, code: "INVALID_PARAMS" }
  const { productoId, soloActivos } = parsed.data

  try {
    const ahora = new Date()
    const mostrarCosto = canViewFinancialData(rol)

    const producto = await prisma.producto.findUnique({
      where: { id: productoId },
      select: {
        nombre: true,
        lotes: {
          where: soloActivos ? { activo: true, stockActual: { gt: 0 } } : {},
          select: { id: true, codigoLote: true, fechaVencimiento: true, stockActual: true, stockInicial: true, costoCompra: true },
          orderBy: { fechaVencimiento: "asc" }, // FEFO
        },
      },
    })

    if (!producto) {
      return { ok: false, error: `Producto con ID ${productoId} no encontrado.`, code: "NOT_FOUND" }
    }

    return {
      ok: true,
      data: {
        producto: producto.nombre,
        lotes: producto.lotes.map((l) => formatearLote(l, ahora, mostrarCosto)),
      },
      meta: { fuenteDatos: `Lotes del producto "${producto.nombre}" ordenados por vencimiento (FEFO).` },
    }
  } catch {
    return safeError("Error al consultar lotes del producto.")
  }
}

// ---------------------------------------------------------------------------
// 8. getTopSellingProducts
// ---------------------------------------------------------------------------

export async function getTopSellingProducts(
  args: unknown,
  rol: UserRole
): Promise<ToolResult<ProductoVendido[]>> {
  const parsed = safeParseToolArgs(GetTopSellingProductsSchema, args ?? {})
  if (!parsed.success) return { ok: false, error: parsed.error, code: "INVALID_PARAMS" }
  const { dias, limit } = parsed.data

  try {
    const mostrarFinanciero = canViewFinancialData(rol)
    const desde = new Date(); desde.setDate(desde.getDate() - dias)

    const detalles = await prisma.detalleVenta.findMany({
      where: { venta: { fecha: { gte: desde }, estado: { not: "ANULADA" } } },
      select: { cantidad: true, subtotal: true, producto: { select: { nombre: true } } },
    })

    const mapa = new Map<string, { cantidad: number; total: number }>()
    detalles.forEach((d) => {
      const prev = mapa.get(d.producto.nombre) ?? { cantidad: 0, total: 0 }
      mapa.set(d.producto.nombre, {
        cantidad: prev.cantidad + d.cantidad,
        total: prev.total + Number(d.subtotal),
      })
    })

    const sorted = Array.from(mapa.entries())
      .map(([nombre, stats]) => ({
        nombre,
        cantidadVendida: stats.cantidad,
        totalFacturado: mostrarFinanciero ? stats.total : 0,
      }))
      .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
      .slice(0, limit)

    const haceN = new Date(); haceN.setDate(haceN.getDate() - dias)
    return {
      ok: true,
      data: sorted,
      meta: {
        fuenteDatos: `Ventas del ${haceN.toLocaleDateString("es-NI")} al ${new Date().toLocaleDateString("es-NI")}.`,
      },
    }
  } catch {
    return safeError("Error al obtener los productos más vendidos.")
  }
}

// ---------------------------------------------------------------------------
// 9. getSalesSummary — Solo ADMIN
// ---------------------------------------------------------------------------

export async function getSalesSummary(
  args: unknown,
  rol: UserRole
): Promise<ToolResult<VentaResumen[]>> {
  if (!canViewFinancialData(rol)) {
    return { ok: false, error: "No tienes permiso para consultar el resumen de ventas.", code: "ACCESS_DENIED" }
  }

  const parsed = safeParseToolArgs(GetSalesSummarySchema, args ?? {})
  if (!parsed.success) return { ok: false, error: parsed.error, code: "INVALID_PARAMS" }
  const { fechaInicio, fechaFin } = parsed.data

  try {
    const hasta = fechaFin ? new Date(fechaFin + "T23:59:59") : new Date()
    const desde = fechaInicio ? new Date(fechaInicio) : new Date(hasta); 
    if (!fechaInicio) desde.setDate(desde.getDate() - 30)

    const ventas = await prisma.venta.findMany({
      where: { fecha: { gte: desde, lte: hasta }, estado: { not: "ANULADA" } },
      select: { fecha: true, total: true, metodoPago: true },
      orderBy: { fecha: "asc" },
    })

    // Agrupar por día
    const porDia = new Map<string, VentaResumen>()
    ventas.forEach((v) => {
      const dia = v.fecha.toISOString().split("T")[0]
      const prev = porDia.get(dia) ?? {
        fecha: dia,
        totalVentas: 0,
        cantidadFacturas: 0,
        totalMonto: 0,
        porMetodoPago: { EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0 },
      }
      prev.cantidadFacturas += 1
      prev.totalMonto += Number(v.total)
      const mp = v.metodoPago as keyof VentaResumen["porMetodoPago"]
      if (mp in prev.porMetodoPago) prev.porMetodoPago[mp] += Number(v.total)
      prev.totalVentas = prev.cantidadFacturas
      porDia.set(dia, prev)
    })

    return {
      ok: true,
      data: Array.from(porDia.values()),
      meta: {
        total: ventas.length,
        fuenteDatos: `Ventas del ${desde.toLocaleDateString("es-NI")} al ${hasta.toLocaleDateString("es-NI")}.`,
      },
    }
  } catch {
    return safeError("Error al consultar el resumen de ventas.")
  }
}

// ---------------------------------------------------------------------------
// 10. getInventoryMovements — Solo ADMIN
// ---------------------------------------------------------------------------

export async function getInventoryMovements(
  args: unknown,
  rol: UserRole
): Promise<ToolResult<MovimientoKardex[]>> {
  if (!canViewFinancialData(rol)) {
    return { ok: false, error: "No tienes permiso para consultar movimientos de inventario.", code: "ACCESS_DENIED" }
  }

  const parsed = safeParseToolArgs(GetInventoryMovementsSchema, args)
  if (!parsed.success) return { ok: false, error: parsed.error, code: "INVALID_PARAMS" }
  const { productoId, limit, offset } = parsed.data

  try {
    const movimientos = await prisma.movimientoInventario.findMany({
      where: { idProducto: productoId },
      select: {
        id: true, tipo: true, cantidad: true, stockResultante: true,
        referencia: true, observacion: true, createdAt: true,
        usuario: { select: { nombreCompleto: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    })

    const total = await prisma.movimientoInventario.count({ where: { idProducto: productoId } })

    return {
      ok: true,
      data: movimientos.map((m) => ({
        id: m.id,
        tipo: m.tipo,
        cantidad: m.cantidad,
        stockResultante: m.stockResultante,
        referencia: m.referencia,
        observacion: m.observacion,
        fecha: m.createdAt.toISOString().split("T")[0],
        usuario: m.usuario?.nombreCompleto ?? null,
      })),
      meta: { total, limit, offset, fuenteDatos: `Kardex del producto ID ${productoId}.` },
    }
  } catch {
    return safeError("Error al consultar el historial de movimientos.")
  }
}

// ---------------------------------------------------------------------------
// 11. getAuditAlerts — Solo ADMIN
// ---------------------------------------------------------------------------

export async function getAuditAlerts(
  args: unknown,
  rol: UserRole
): Promise<ToolResult<AlertaAuditoria[]>> {
  if (!canViewFinancialData(rol)) {
    return { ok: false, error: "No tienes permiso para consultar alertas de auditoría.", code: "ACCESS_DENIED" }
  }

  const parsed = safeParseToolArgs(GetAuditAlertsSchema, args ?? {})
  if (!parsed.success) return { ok: false, error: parsed.error, code: "INVALID_PARAMS" }
  const { dias, limit } = parsed.data

  try {
    const desde = new Date(); desde.setDate(desde.getDate() - dias)
    const ahora = new Date()
    const alertas: AlertaAuditoria[] = []

    // Detectar anulaciones inusuales por usuario
    const anulaciones = await prisma.venta.groupBy({
      by: ["idUsuario"],
      where: { estado: "ANULADA", fecha: { gte: desde } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    })

    for (const a of anulaciones) {
      if (a._count.id >= 3) {
        const usuario = await prisma.usuario.findUnique({
          where: { id: a.idUsuario }, select: { nombreCompleto: true },
        })
        alertas.push({
          tipo: "ANULACIONES_INUSUALES",
          descripcion: `Se detectaron ${a._count.id} anulaciones en los últimos ${dias} días.`,
          usuario: usuario?.nombreCompleto ?? `Usuario ID ${a.idUsuario}`,
          cantidad: a._count.id,
          fecha: ahora.toISOString().split("T")[0],
        })
      }
    }

    // Detectar ajustes manuales de inventario fuera del horario laboral (antes 7am o después 9pm)
    const ajustesFueraHorario = await prisma.movimientoInventario.findMany({
      where: {
        tipo: { in: ["AJUSTE_POSITIVO", "AJUSTE_NEGATIVO"] },
        createdAt: { gte: desde },
      },
      select: { createdAt: true, idProducto: true, cantidad: true, usuario: { select: { nombreCompleto: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    ajustesFueraHorario.forEach((mov) => {
      const hora = mov.createdAt.getHours()
      if (hora < 7 || hora >= 21) {
        alertas.push({
          tipo: "AJUSTE_MANUAL_FUERA_HORARIO",
          descripcion: `Ajuste manual de inventario (${mov.cantidad > 0 ? "+" : ""}${mov.cantidad} u.) registrado a las ${hora}:${String(mov.createdAt.getMinutes()).padStart(2, "0")} hrs.`,
          usuario: mov.usuario?.nombreCompleto ?? "Desconocido",
          fecha: mov.createdAt.toISOString().split("T")[0],
        })
      }
    })

    // Detectar inconsistencias en inventario (stock en producto vs suma de lotes)
    const inconsistencias = await prisma.$queryRaw<{ id: number; nombre: string; stockActual: number; sumaLotes: number }[]>`
      SELECT p.id, p.nombre, p."stockActual", COALESCE(SUM(l."stockActual"), 0)::int AS "sumaLotes"
      FROM "Producto" p
      LEFT JOIN "Lote" l ON l."idProducto" = p.id AND l.activo = true
      WHERE p.activo = true
      GROUP BY p.id, p.nombre, p."stockActual"
      HAVING p."stockActual" != COALESCE(SUM(l."stockActual"), 0)
      LIMIT 10
    `

    inconsistencias.forEach((inc) => {
      alertas.push({
        tipo: "INCONSISTENCIA_KARDEX",
        descripcion: `"${inc.nombre}": Stock registrado (${inc.stockActual} u.) no coincide con la suma de sus lotes (${inc.sumaLotes} u.).`,
        fecha: ahora.toISOString().split("T")[0],
      })
    })

    return {
      ok: true,
      data: alertas.slice(0, limit),
      meta: { total: alertas.length, fuenteDatos: `Auditoría de los últimos ${dias} días.` },
    }
  } catch {
    return safeError("Error al consultar alertas de auditoría.")
  }
}

// ---------------------------------------------------------------------------
// 12. getSuggestedPurchaseOrder — Solo ADMIN
// ---------------------------------------------------------------------------

export async function getSuggestedPurchaseOrder(
  args: unknown,
  rol: UserRole
): Promise<ToolResult<BorradorOrdenCompra>> {
  if (!canViewFinancialData(rol)) {
    return { ok: false, error: "No tienes permiso para generar órdenes de compra.", code: "ACCESS_DENIED" }
  }

  const parsed = safeParseToolArgs(GetSuggestedPurchaseOrderSchema, args ?? {})
  if (!parsed.success) return { ok: false, error: parsed.error, code: "INVALID_PARAMS" }
  const { diasAnalisis } = parsed.data

  try {
    const desde = new Date(); desde.setDate(desde.getDate() - diasAnalisis)

    // Productos con stock bajo
    const activeProducts = await prisma.producto.findMany({
      where: { activo: true, stockMinimo: { not: null } },
      select: { id: true, stockActual: true, stockMinimo: true },
    })
    const lowStockIds = activeProducts
      .filter((p) => p.stockActual <= (p.stockMinimo ?? 0))
      .map((p) => p.id)

    const productosStockBajo = await prisma.producto.findMany({
      where: { id: { in: lowStockIds } },
      select: {
        id: true, nombre: true, stockActual: true, stockMinimo: true, precioCompra: true,
        proveedores: { select: { proveedor: { select: { nombre: true } } }, take: 1 },
        detallesVenta: {
          where: { venta: { fecha: { gte: desde }, estado: { not: "ANULADA" } } },
          select: { cantidad: true },
        },
      },
      take: 30,
    })

    const items: ItemBorradorCompra[] = productosStockBajo.map((p) => {
      const vendidoEnPeriodo = p.detallesVenta.reduce((acc, d) => acc + d.cantidad, 0)
      const tasaDiaria = vendidoEnPeriodo / diasAnalisis
      const cantidadSugerida = Math.max(
        Math.ceil(tasaDiaria * 30),  // Reabastecimiento para 30 días
        (p.stockMinimo ?? 0) * 2     // Al menos el doble del mínimo
      )

      return {
        productoId: p.id,
        nombreProducto: p.nombre,
        cantidadSugerida,
        precioCompraUltimo: Number(p.precioCompra),
        proveedorSugerido: p.proveedores[0]?.proveedor.nombre ?? undefined,
        motivo: p.stockActual === 0
          ? "Sin stock — reabastecimiento urgente"
          : `Stock por debajo del mínimo (${p.stockActual} u. de mín. ${p.stockMinimo} u.)`,
      }
    })

    return {
      ok: true,
      data: {
        items,
        fechaGeneracion: new Date().toISOString().split("T")[0],
        notasIA: `Sugerencia generada analizando ventas de los últimos ${diasAnalisis} días y stock mínimo configurado. Requiere revisión y aprobación humana antes de crear la compra.`,
        requiereConfirmacionHumana: true,
      },
      meta: { fuenteDatos: `Stock actual + Ventas de los últimos ${diasAnalisis} días.` },
    }
  } catch {
    return safeError("Error al generar la sugerencia de orden de compra.")
  }
}

// ---------------------------------------------------------------------------
// 13. createPurchaseDraft — Solo ADMIN (Retorna borrador, no guarda aún en BD)
// ---------------------------------------------------------------------------

export async function createPurchaseDraft(
  args: unknown,
  rol: UserRole
): Promise<ToolResult<BorradorOrdenCompra>> {
  if (!canViewFinancialData(rol)) {
    return { ok: false, error: "No tienes permiso para crear borradores de compra.", code: "ACCESS_DENIED" }
  }

  const parsed = safeParseToolArgs(CreatePurchaseDraftSchema, args)
  if (!parsed.success) return { ok: false, error: parsed.error, code: "INVALID_PARAMS" }
  const { items, notasIA } = parsed.data

  try {
    // Verificar que los productoIds existen en el catálogo
    const ids = items.map((i) => i.productoId)
    const productosEnBD = await prisma.producto.findMany({
      where: { id: { in: ids }, activo: true },
      select: { id: true, nombre: true, precioCompra: true, proveedores: { select: { proveedor: { select: { nombre: true } } }, take: 1 } },
    })

    const mapaProductos = new Map(productosEnBD.map((p) => [p.id, p]))
    const itemsValidados: ItemBorradorCompra[] = []

    for (const item of items) {
      const prod = mapaProductos.get(item.productoId)
      if (!prod) continue // Ignorar IDs no encontrados en lugar de fallar
      itemsValidados.push({
        productoId: item.productoId,
        nombreProducto: prod.nombre,
        cantidadSugerida: item.cantidadSugerida,
        precioCompraUltimo: Number(prod.precioCompra),
        proveedorSugerido: prod.proveedores[0]?.proveedor.nombre ?? undefined,
        motivo: item.motivo,
      })
    }

    if (itemsValidados.length === 0) {
      return { ok: false, error: "Ninguno de los productos indicados existe en el catálogo activo.", code: "NOT_FOUND" }
    }

    return {
      ok: true,
      data: {
        items: itemsValidados,
        fechaGeneracion: new Date().toISOString().split("T")[0],
        notasIA: notasIA ?? "Borrador generado por la IA. Pendiente de revisión y aprobación.",
        requiereConfirmacionHumana: true,
      },
      meta: { fuenteDatos: "Catálogo de productos activos y proveedores asociados." },
    }
  } catch {
    return safeError("Error al crear el borrador de compra.")
  }
}

// ---------------------------------------------------------------------------
// 14. createInventoryAdjustmentDraft — Solo ADMIN (Retorna borrador, no aplica aún)
// ---------------------------------------------------------------------------

export async function createInventoryAdjustmentDraft(
  args: unknown,
  rol: UserRole
): Promise<ToolResult<BorradorAjusteInventario>> {
  if (!canViewFinancialData(rol)) {
    return { ok: false, error: "No tienes permiso para crear borradores de ajuste de inventario.", code: "ACCESS_DENIED" }
  }

  const parsed = safeParseToolArgs(CreateInventoryAdjustmentDraftSchema, args)
  if (!parsed.success) return { ok: false, error: parsed.error, code: "INVALID_PARAMS" }
  const { items, notasIA } = parsed.data

  try {
    const ids = items.map((i) => i.productoId)
    const productos = await prisma.producto.findMany({
      where: { id: { in: ids }, activo: true },
      select: { id: true, nombre: true, stockActual: true },
    })

    const mapaProductos = new Map(productos.map((p) => [p.id, p]))
    const itemsValidados = items
      .filter((i) => mapaProductos.has(i.productoId))
      .map((i) => {
        const prod = mapaProductos.get(i.productoId)!
        return {
          productoId: i.productoId,
          nombreProducto: prod.nombre,
          stockActualSistema: prod.stockActual,
          stockFisicoReportado: i.stockFisicoReportado,
          diferencia: i.stockFisicoReportado - prod.stockActual,
          motivo: i.motivo,
        }
      })

    if (itemsValidados.length === 0) {
      return { ok: false, error: "Ninguno de los productos indicados existe en el catálogo activo.", code: "NOT_FOUND" }
    }

    return {
      ok: true,
      data: {
        items: itemsValidados,
        fechaGeneracion: new Date().toISOString().split("T")[0],
        notasIA: notasIA ?? "Borrador de ajuste de inventario generado por la IA. Pendiente de revisión y aprobación del administrador.",
        requiereConfirmacionHumana: true,
      },
      meta: { fuenteDatos: "Stock actual del sistema vs. stock físico reportado." },
    }
  } catch {
    return safeError("Error al crear el borrador de ajuste de inventario.")
  }
}

// ---------------------------------------------------------------------------
// Dispatcher: ejecuta una herramienta por nombre
// ---------------------------------------------------------------------------

export async function executeTool(
  toolName: string,
  args: unknown,
  rol: UserRole
): Promise<ToolResult<unknown>> {
  switch (toolName) {
    case "getDashboardSummary":         return getDashboardSummary(args, rol)
    case "getLowStockProducts":         return getLowStockProducts(args, rol)
    case "getExpiredProducts":          return getExpiredProducts(args, rol)
    case "getProductsNearExpiration":   return getProductsNearExpiration(args, rol)
    case "searchProducts":              return searchProducts(args, rol)
    case "getProductDetails":           return getProductDetails(args, rol)
    case "getProductLots":              return getProductLots(args, rol)
    case "getTopSellingProducts":       return getTopSellingProducts(args, rol)
    case "getSalesSummary":             return getSalesSummary(args, rol)
    case "getInventoryMovements":       return getInventoryMovements(args, rol)
    case "getAuditAlerts":              return getAuditAlerts(args, rol)
    case "getSuggestedPurchaseOrder":   return getSuggestedPurchaseOrder(args, rol)
    case "createPurchaseDraft":         return createPurchaseDraft(args, rol)
    case "createInventoryAdjustmentDraft": return createInventoryAdjustmentDraft(args, rol)
    default:
      return { ok: false, error: `Herramienta desconocida: "${toolName}".`, code: "INTERNAL_ERROR" }
  }
}
