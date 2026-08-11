import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calcularRecomendacionCompra } from "@/lib/domain/purchase-recommendations"

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.rolNombre !== "ADMIN") return NextResponse.json({ error: "Solo administración puede consultar recomendaciones de compra" }, { status: user ? 403 : 401 })
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1))
  const take = 25
  const ahora = new Date()
  const hace30 = new Date(ahora.getTime() - 30 * 86400000)
  const hace90 = new Date(ahora.getTime() - 90 * 86400000)
  const en90 = new Date(ahora.getTime() + 90 * 86400000)

  const [productos, total, ventas, ventas90, vencimientos, lotesRiesgo] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true, esServicio: false }, select: { id: true, nombre: true, stockActual: true, stockMinimo: true, precioCompra: true, precioVenta: true, margenUtilidad: true, proveedores: { select: { precioCompra: true, tiempoEntregaDias: true, proveedor: { select: { id: true, nombre: true } } }, orderBy: { createdAt: "desc" } } }, orderBy: { nombre: "asc" }, skip: (page - 1) * take, take }),
    prisma.producto.count({ where: { activo: true, esServicio: false } }),
    prisma.detalleVenta.groupBy({ by: ["idProducto"], where: { venta: { fecha: { gte: hace30 }, estado: "COMPLETADA" } }, _sum: { cantidad: true } }),
    prisma.detalleVenta.groupBy({ by: ["idProducto"], where: { venta: { fecha: { gte: hace90 }, estado: "COMPLETADA" } }, _sum: { cantidad: true } }),
    prisma.lote.groupBy({ by: ["idProducto"], where: { activo: true, stockActual: { gt: 0 }, fechaVencimiento: { gt: ahora, lte: en90 } }, _sum: { stockActual: true } }),
    prisma.lote.findMany({ where: { activo: true, stockActual: { gt: 0 }, fechaVencimiento: { gt: ahora, lte: en90 } }, select: { id: true, codigoLote: true, stockActual: true, fechaVencimiento: true, producto: { select: { id: true, nombre: true, precioVenta: true } } }, orderBy: { fechaVencimiento: "asc" }, take: 20 }),
  ])
  const ultimosCostos = await prisma.detalleCompra.findMany({
    where: { idProducto: { in: productos.map((producto) => producto.id) } },
    select: { idProducto: true, precioUnitario: true, compra: { select: { idProveedor: true, fecha: true } } },
    orderBy: { compra: { fecha: "desc" } },
  })
  const costoMap = new Map<string, number>()
  for (const costo of ultimosCostos) {
    const key = `${costo.idProducto}:${costo.compra.idProveedor}`
    if (!costoMap.has(key)) costoMap.set(key, Number(costo.precioUnitario))
  }
  const ventasMap = new Map(ventas.map((v) => [v.idProducto, v._sum.cantidad || 0]))
  const ventas90Map = new Map(ventas90.map((v) => [v.idProducto, v._sum.cantidad || 0]))
  const vencMap = new Map(vencimientos.map((v) => [v.idProducto, v._sum.stockActual || 0]))
  const recomendaciones = productos.map((p) => {
    const margen = p.margenUtilidad == null ? (Number(p.precioCompra) > 0 ? ((Number(p.precioVenta) - Number(p.precioCompra)) / Number(p.precioCompra)) * 100 : 0) : Number(p.margenUtilidad)
    const calculo = calcularRecomendacionCompra({ id: p.id, stockActual: p.stockActual, stockMinimo: p.stockMinimo, ventas30Dias: ventasMap.get(p.id) || 0, ventas90Dias: ventas90Map.get(p.id) || 0, unidadesPorVencer: vencMap.get(p.id) || 0, tiempoEntregaDias: Math.min(...p.proveedores.map((proveedor) => proveedor.tiempoEntregaDias), 7), margenPorcentaje: margen })
    const proveedores = p.proveedores
      .map((x) => ({ id: x.proveedor.id, nombre: x.proveedor.nombre, ultimoCosto: costoMap.get(`${p.id}:${x.proveedor.id}`) ?? (x.precioCompra == null ? null : Number(x.precioCompra)), tiempoEntregaDias: x.tiempoEntregaDias }))
      .filter((x): x is { id: number; nombre: string; ultimoCosto: number; tiempoEntregaDias: number } => x.ultimoCosto != null)
      .sort((a, b) => a.ultimoCosto - b.ultimoCosto)
    const cobertura = calculo.variables.diasCobertura == null ? "sin demanda" : `${calculo.variables.diasCobertura} días`
    return { idProducto: p.id, producto: p.nombre, ...calculo, proveedores, proveedorSugerido: proveedores[0] || null, explicacion: `Cobertura: ${cobertura}; entrega: ${calculo.variables.tiempoEntregaDias} días; margen: ${calculo.variables.margenPorcentaje}%; riesgo de vencimiento: ${calculo.variables.riesgoVencimiento}%.` }
  }).filter((r) => r.cantidadSugerida > 0).sort((a, b) => b.cantidadSugerida - a.cantidadSugerida)
  const accionesLiquidacion = lotesRiesgo.map((lote) => {
    const dias = Math.max(0, Math.ceil((lote.fechaVencimiento!.getTime() - ahora.getTime()) / 86400000))
    const descuentoSugerido = dias <= 30 ? 25 : dias <= 60 ? 15 : 10
    return { idLote: lote.id, idProducto: lote.producto.id, producto: lote.producto.nombre, codigoLote: lote.codigoLote, unidades: lote.stockActual, venceEnDias: dias, descuentoSugerido, precioLiquidacion: Math.round(Number(lote.producto.precioVenta) * (1 - descuentoSugerido / 100) * 100) / 100, accion: dias <= 30 ? "Priorizar exhibición y campaña inmediata" : "Crear promoción segmentada" }
  })
  return NextResponse.json({ recomendaciones, accionesLiquidacion, total, page, pages: Math.ceil(total / take), metodologia: "Demanda ponderada de 90 días, cobertura según tiempo de entrega + 14 días de seguridad, margen y descuento del stock con riesgo de vencimiento." })
}
