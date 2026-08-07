import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toManaguaEndOfDay, toManaguaStartOfDay } from "@/lib/timezone"

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.rolNombre !== "ADMIN") return NextResponse.json({ error: "Solo administración puede ver indicadores gerenciales" }, { status: user ? 403 : 401 })
  const inicio = request.nextUrl.searchParams.get("startDate") || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const fin = request.nextUrl.searchParams.get("endDate") || new Date().toISOString().slice(0, 10)
  const rango = { gte: toManaguaStartOfDay(inicio), lte: toManaguaEndOfDay(fin) }
  const ahora = new Date()
  const en90 = new Date(ahora.getTime() + 90 * 86400000)

  const [ventas, cogs, stockBajo, porVencer, top, inmovilizado, diferencias] = await Promise.all([
    prisma.venta.aggregate({ where: { estado: "COMPLETADA", fecha: rango }, _sum: { total: true }, _count: true }),
    prisma.movimientoInventario.findMany({ where: { tipo: "SALIDA_VENTA", createdAt: rango, costoUnitario: { not: null } }, select: { cantidad: true, costoUnitario: true } }),
    prisma.$queryRaw<Array<{ total: bigint }>>`SELECT COUNT(*)::bigint AS total FROM "Producto" WHERE activo=true AND "esServicio"=false AND "stockActual" <= COALESCE("stockMinimo",10)`,
    prisma.lote.count({ where: { activo: true, stockActual: { gt: 0 }, fechaVencimiento: { gt: ahora, lte: en90 } } }),
    prisma.detalleVenta.groupBy({ by: ["idProducto"], where: { venta: { estado: "COMPLETADA", fecha: rango } }, _sum: { cantidad: true, subtotal: true }, orderBy: { _sum: { cantidad: "desc" } }, take: 10 }),
    prisma.$queryRaw<Array<{ productos: bigint; valor: unknown }>>`
      SELECT COUNT(*)::bigint AS productos, COALESCE(SUM(p."stockActual" * p."precioCompra"),0) AS valor
      FROM "Producto" p WHERE p.activo=true AND p."esServicio"=false AND p."stockActual">0
      AND NOT EXISTS (SELECT 1 FROM "DetalleVenta" d JOIN "Venta" v ON v.id=d."idVenta" WHERE d."idProducto"=p.id AND v.estado='COMPLETADA' AND v.fecha >= ${new Date(Date.now() - 90 * 86400000)})
    `,
    prisma.cajaSesion.aggregate({ where: { diferencia: { not: 0 }, estado: "CERRADA" }, _count: true, _sum: { diferencia: true } }),
  ])
  const topInfo = await prisma.producto.findMany({ where: { id: { in: top.map((x) => x.idProducto) } }, select: { id: true, nombre: true } })
  const nombres = new Map(topInfo.map((p) => [p.id, p.nombre]))
  const ingreso = Number(ventas._sum.total || 0)
  const costo = cogs.reduce((s, m) => s + Number(m.costoUnitario) * m.cantidad, 0)
  return NextResponse.json({ rango: { inicio, fin }, ventas: { cantidad: ventas._count, total: ingreso }, gananciaEstimada: ingreso - costo, costoVendido: costo, stockBajo: Number(stockBajo[0]?.total || 0), lotesPorVencer: porVencer, productosMasVendidos: top.map((x) => ({ idProducto: x.idProducto, nombre: nombres.get(x.idProducto) || `Producto ${x.idProducto}`, cantidad: x._sum.cantidad || 0, total: Number(x._sum.subtotal || 0) })), inventarioInmovilizado: { productos: Number(inmovilizado[0]?.productos || 0), valor: Number(inmovilizado[0]?.valor || 0) }, diferenciasCaja: { pendientes: diferencias._count, neto: Number(diferencias._sum.diferencia || 0) } })
}
