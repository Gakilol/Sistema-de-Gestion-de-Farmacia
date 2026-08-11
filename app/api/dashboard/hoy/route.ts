import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const ahora = new Date()
  const enNoventaDias = new Date(ahora.getTime() + 90 * 86400000)
  const esFarmacia = user.rolNombre === "ADMIN" || user.rolNombre === "EMPLEADO"
  const puedeVerRecetas = ["ADMIN", "DOCTOR", "EMPLEADO"].includes(user.rolNombre)
  const esAdmin = user.rolNombre === "ADMIN"

  const [lotes, recetas, stock, diferencias] = await Promise.all([
    esFarmacia ? prisma.lote.findMany({
      where: { activo: true, stockActual: { gt: 0 }, fechaVencimiento: { gt: ahora, lte: enNoventaDias } },
      select: { id: true, codigoLote: true, fechaVencimiento: true, stockActual: true, producto: { select: { nombre: true } } },
      orderBy: { fechaVencimiento: "asc" }, take: 4,
    }) : Promise.resolve([]),
    puedeVerRecetas ? prisma.receta.findMany({
      where: { estado: { in: ["EMITIDA", "EN_PREPARACION", "LISTA", "USADA_PARCIALMENTE"] } },
      select: { id: true, codigoReceta: true, estado: true, cliente: { select: { nombreCompleto: true } } },
      orderBy: { createdAt: "asc" }, take: 4,
    }) : Promise.resolve([]),
    esFarmacia ? prisma.$queryRaw<Array<{ id: number; nombre: string; stockActual: number; stockMinimo: number }>>`
      SELECT id, nombre, "stockActual", COALESCE("stockMinimo", 10)::int AS "stockMinimo"
      FROM "Producto"
      WHERE activo = true AND "esServicio" = false AND "stockActual" <= COALESCE("stockMinimo", 10)
      ORDER BY "stockActual" ASC, nombre ASC LIMIT 4
    ` : Promise.resolve([]),
    esAdmin ? prisma.cajaSesion.findMany({
      where: { estado: "CERRADA", diferencia: { not: 0 } },
      select: { id: true, diferencia: true, cerradaEn: true, usuario: { select: { nombreCompleto: true } } },
      orderBy: { cerradaEn: "asc" }, take: 4,
    }) : Promise.resolve([]),
  ])

  const [totalLotes, totalRecetas, totalStock, totalDiferencias] = await Promise.all([
    esFarmacia ? prisma.lote.count({ where: { activo: true, stockActual: { gt: 0 }, fechaVencimiento: { gt: ahora, lte: enNoventaDias } } }) : 0,
    puedeVerRecetas ? prisma.receta.count({ where: { estado: { in: ["EMITIDA", "EN_PREPARACION", "LISTA", "USADA_PARCIALMENTE"] } } }) : 0,
    esFarmacia ? prisma.$queryRaw<Array<{ total: bigint }>>`SELECT COUNT(*)::bigint AS total FROM "Producto" WHERE activo=true AND "esServicio"=false AND "stockActual" <= COALESCE("stockMinimo",10)` : [],
    esAdmin ? prisma.cajaSesion.count({ where: { estado: "CERRADA", diferencia: { not: 0 } } }) : 0,
  ])

  const recetaHref = user.rolNombre === "EMPLEADO" ? "/ventas/nueva?modo=receta" : "/clinica?tab=recetas&estado=pendiente"
  const stockHref = esAdmin ? "/compras/recomendaciones?origen=stock-bajo" : "/inventario?tab=alertas&tipo=stock-bajo"
  return NextResponse.json({
    generadoEn: ahora.toISOString(),
    alertas: [
      ...(esFarmacia ? [{
        id: "lotes-por-vencer", tipo: "VENCIMIENTO", titulo: "Lotes por vencer", total: totalLotes,
        nivel: totalLotes ? "ATENCION" : "SANO", accion: "Revisar lotes", href: "/inventario?tab=alertas&tipo=por-vencer",
        detalle: lotes.map((lote) => ({ id: lote.id, principal: lote.producto.nombre, secundario: `Lote ${lote.codigoLote} · ${lote.stockActual} u.`, fecha: lote.fechaVencimiento })),
      }] : []),
      ...(puedeVerRecetas ? [{
        id: "recetas-pendientes", tipo: "RECETA", titulo: "Recetas pendientes", total: totalRecetas,
        nivel: totalRecetas ? "ATENCION" : "SANO", accion: user.rolNombre === "EMPLEADO" ? "Surtir receta" : "Gestionar recetas", href: recetaHref,
        detalle: recetas.map((receta) => ({ id: receta.id, principal: receta.codigoReceta, secundario: `${receta.cliente.nombreCompleto} · ${receta.estado.replaceAll("_", " ")}` })),
      }] : []),
      ...(esFarmacia ? [{
        id: "stock-bajo", tipo: "STOCK", titulo: "Stock bajo", total: Number(totalStock[0]?.total || 0),
        nivel: stock.some((producto) => producto.stockActual === 0) ? "CRITICO" : totalStock[0]?.total ? "ATENCION" : "SANO",
        accion: esAdmin ? "Preparar compra" : "Revisar inventario", href: stockHref,
        detalle: stock.map((producto) => ({ id: producto.id, principal: producto.nombre, secundario: `${producto.stockActual} disponibles · mínimo ${producto.stockMinimo}` })),
      }] : []),
      ...(esAdmin ? [{
        id: "diferencias-caja", tipo: "CAJA", titulo: "Diferencias de caja", total: totalDiferencias,
        nivel: totalDiferencias ? "ATENCION" : "SANO", accion: "Resolver diferencias", href: "/caja#diferencias-caja",
        detalle: diferencias.map((caja) => ({ id: caja.id, principal: `Caja #${caja.id} · ${caja.usuario.nombreCompleto}`, secundario: `Diferencia C$${Number(caja.diferencia).toFixed(2)}`, fecha: caja.cerradaEn })),
      }] : []),
    ],
  })
}
