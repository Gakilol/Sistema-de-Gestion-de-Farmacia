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
  const en90 = new Date(ahora.getTime() + 90 * 86400000)

  const [productos, total, ventas, vencimientos] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true, esServicio: false }, select: { id: true, nombre: true, stockActual: true, stockMinimo: true, proveedores: { select: { precioCompra: true, proveedor: { select: { id: true, nombre: true } } }, orderBy: { createdAt: "desc" } } }, orderBy: { nombre: "asc" }, skip: (page - 1) * take, take }),
    prisma.producto.count({ where: { activo: true, esServicio: false } }),
    prisma.detalleVenta.groupBy({ by: ["idProducto"], where: { venta: { fecha: { gte: hace30 }, estado: "COMPLETADA" } }, _sum: { cantidad: true } }),
    prisma.lote.groupBy({ by: ["idProducto"], where: { activo: true, stockActual: { gt: 0 }, fechaVencimiento: { gt: ahora, lte: en90 } }, _sum: { stockActual: true } }),
  ])
  const ventasMap = new Map(ventas.map((v) => [v.idProducto, v._sum.cantidad || 0]))
  const vencMap = new Map(vencimientos.map((v) => [v.idProducto, v._sum.stockActual || 0]))
  const recomendaciones = productos.map((p) => {
    const calculo = calcularRecomendacionCompra({ id: p.id, stockActual: p.stockActual, stockMinimo: p.stockMinimo, ventas30Dias: ventasMap.get(p.id) || 0, unidadesPorVencer: vencMap.get(p.id) || 0 })
    const proveedores = p.proveedores.filter((x) => x.precioCompra != null).sort((a, b) => Number(a.precioCompra) - Number(b.precioCompra)).map((x) => ({ id: x.proveedor.id, nombre: x.proveedor.nombre, ultimoCosto: Number(x.precioCompra) }))
    return { idProducto: p.id, producto: p.nombre, ...calculo, proveedores, proveedorSugerido: proveedores[0] || null, explicacion: `Demanda 30 días: ${calculo.variables.ventas30Dias}; stock útil: ${calculo.variables.stockUtil}; mínimo: ${calculo.variables.stockMinimo}; por vencer: ${calculo.variables.unidadesPorVencer}.` }
  }).filter((r) => r.cantidadSugerida > 0).sort((a, b) => b.cantidadSugerida - a.cantidadSugerida)
  return NextResponse.json({ recomendaciones, total, page, pages: Math.ceil(total / take), metodologia: "Promedio móvil de 30 días, cobertura objetivo de 30 días y descuento del inventario próximo a vencer." })
}
