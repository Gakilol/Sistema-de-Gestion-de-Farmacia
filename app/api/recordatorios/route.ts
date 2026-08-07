import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { RecordatorioInterno } from "@/lib/reminders"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const ahora = new Date()
  const enSieteDias = new Date(ahora.getTime() + 7 * 86400000)
  const enNoventaDias = new Date(ahora.getTime() + 90 * 86400000)
  const recordatorios: RecordatorioInterno[] = []
  const esClinico = user.rolNombre === "ADMIN" || user.rolNombre === "DOCTOR"
  const esFarmacia = user.rolNombre === "ADMIN" || user.rolNombre === "EMPLEADO"

  const [citas, recetas, lotes, stockBajo] = await Promise.all([
    esClinico ? prisma.cita.findMany({
      where: { estado: "PENDIENTE", fecha: { lte: enSieteDias } },
      select: { id: true, fecha: true, motivo: true, cliente: { select: { nombreCompleto: true } } },
      orderBy: { fecha: "asc" }, take: 10,
    }) : Promise.resolve([]),
    esClinico ? prisma.receta.findMany({
      where: { estado: { in: ["EMITIDA", "EN_PREPARACION", "LISTA", "USADA_PARCIALMENTE"] } },
      select: { id: true, codigoReceta: true, createdAt: true, cliente: { select: { nombreCompleto: true } } },
      orderBy: { createdAt: "asc" }, take: 10,
    }) : Promise.resolve([]),
    esFarmacia ? prisma.lote.findMany({
      where: { activo: true, stockActual: { gt: 0 }, fechaVencimiento: { gt: ahora, lte: enNoventaDias } },
      select: { id: true, codigoLote: true, fechaVencimiento: true, producto: { select: { nombre: true } } },
      orderBy: { fechaVencimiento: "asc" }, take: 10,
    }) : Promise.resolve([]),
    esFarmacia ? prisma.$queryRaw<Array<{ id: number; nombre: string; stockActual: number; stockMinimo: number }>>`
      SELECT id, nombre, "stockActual", COALESCE("stockMinimo", 10)::int AS "stockMinimo"
      FROM "Producto"
      WHERE activo = true AND "esServicio" = false
        AND "stockActual" <= COALESCE("stockMinimo", 10)
      ORDER BY "stockActual" ASC LIMIT 10
    ` : Promise.resolve([]),
  ])

  for (const cita of citas) {
    const vencida = cita.fecha < ahora
    recordatorios.push({ id: `cita-${cita.id}`, tipo: vencida ? "CITA_PENDIENTE" : "CITA_PROXIMA", prioridad: vencida ? "ALTA" : "MEDIA", titulo: vencida ? "Cita pendiente" : "Próxima cita", detalle: `${cita.cliente.nombreCompleto}${cita.motivo ? ` - ${cita.motivo}` : ""}`, fechaObjetivo: cita.fecha.toISOString(), href: "/clinica", canalesDisponibles: ["INTERNO", "EMAIL", "SMS", "WHATSAPP"], canalActivo: "INTERNO" })
  }
  for (const receta of recetas) recordatorios.push({ id: `receta-${receta.id}`, tipo: "RECETA_SIN_USAR", prioridad: "MEDIA", titulo: `Receta ${receta.codigoReceta} pendiente`, detalle: receta.cliente.nombreCompleto, fechaObjetivo: receta.createdAt.toISOString(), href: "/clinica", canalesDisponibles: ["INTERNO", "EMAIL", "SMS", "WHATSAPP"], canalActivo: "INTERNO" })
  for (const lote of lotes) recordatorios.push({ id: `lote-${lote.id}`, tipo: "VENCIMIENTO", prioridad: "ALTA", titulo: `${lote.producto.nombre} próximo a vencer`, detalle: `Lote ${lote.codigoLote}`, fechaObjetivo: lote.fechaVencimiento?.toISOString(), href: "/inventario", canalesDisponibles: ["INTERNO"], canalActivo: "INTERNO" })
  for (const producto of stockBajo) recordatorios.push({ id: `stock-${producto.id}`, tipo: "STOCK_BAJO", prioridad: producto.stockActual === 0 ? "ALTA" : "MEDIA", titulo: `${producto.nombre}: stock bajo`, detalle: `${producto.stockActual} disponibles / mínimo ${producto.stockMinimo}`, href: "/compras", canalesDisponibles: ["INTERNO"], canalActivo: "INTERNO" })

  const orden = { ALTA: 0, MEDIA: 1, BAJA: 2 }
  recordatorios.sort((a, b) => orden[a.prioridad] - orden[b.prioridad])
  return NextResponse.json({ recordatorios: recordatorios.slice(0, 30), total: recordatorios.length, generadoEn: ahora.toISOString() })
}
