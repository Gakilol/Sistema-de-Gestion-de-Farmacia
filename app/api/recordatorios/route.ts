import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { integracionesComunicacion } from "@/lib/customer-engagement"
import { prisma } from "@/lib/prisma"
import type { CanalRecordatorio, RecordatorioInterno } from "@/lib/reminders"

type ClienteContacto = {
  id: number
  nombreCompleto: string
  telefono: string | null
  correo: string | null
  canalPreferido: string
  consentimientoWhatsApp: boolean
  consentimientoEmail: boolean
  consentimientoSms: boolean
}

function canalCliente(cliente: ClienteContacto): { canal: CanalRecordatorio; consentimiento: boolean } {
  const disponibles: Array<[CanalRecordatorio, boolean]> = [
    ["WHATSAPP", cliente.consentimientoWhatsApp && Boolean(cliente.telefono)],
    ["EMAIL", cliente.consentimientoEmail && Boolean(cliente.correo)],
    ["SMS", cliente.consentimientoSms && Boolean(cliente.telefono)],
  ]
  const preferido = disponibles.find(([canal, permitido]) => canal === cliente.canalPreferido && permitido)
  const fallback = disponibles.find(([, permitido]) => permitido)
  return { canal: preferido?.[0] || fallback?.[0] || "INTERNO", consentimiento: Boolean(preferido || fallback) }
}

function comunicacion(input: { id: string; tipo: RecordatorioInterno["tipo"]; prioridad: RecordatorioInterno["prioridad"]; titulo: string; detalle: string; fecha?: Date | null; href: string; cliente: ClienteContacto; asunto: string; mensaje: string }): RecordatorioInterno {
  const preferencia = canalCliente(input.cliente)
  return {
    id: input.id,
    tipo: input.tipo,
    prioridad: input.prioridad,
    titulo: input.titulo,
    detalle: input.detalle,
    fechaObjetivo: input.fecha?.toISOString() || null,
    href: input.href,
    canalesDisponibles: ["INTERNO", "EMAIL", "SMS", "WHATSAPP"],
    canalActivo: "INTERNO",
    idCliente: input.cliente.id,
    cliente: input.cliente.nombreCompleto,
    canalSugerido: preferencia.canal,
    consentimiento: preferencia.consentimiento,
    asunto: input.asunto,
    mensaje: input.mensaje,
  }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const ahora = new Date()
  const enSieteDias = new Date(ahora.getTime() + 7 * 86400000)
  const enNoventaDias = new Date(ahora.getTime() + 90 * 86400000)
  const hace25Dias = new Date(ahora.getTime() - 25 * 86400000)
  const hace90Dias = new Date(ahora.getTime() - 90 * 86400000)
  const recordatorios: RecordatorioInterno[] = []
  const esClinico = user.rolNombre === "ADMIN" || user.rolNombre === "DOCTOR"
  const esFarmacia = user.rolNombre === "ADMIN" || user.rolNombre === "EMPLEADO"
  const contacto = { id: true, nombreCompleto: true, telefono: true, correo: true, canalPreferido: true, consentimientoWhatsApp: true, consentimientoEmail: true, consentimientoSms: true } as const

  const [citas, recetas, pedidos, recompraClientes, lotes, stockBajo] = await Promise.all([
    esClinico ? prisma.cita.findMany({ where: { estado: "PENDIENTE", fecha: { lte: enSieteDias } }, select: { id: true, fecha: true, motivo: true, cliente: { select: contacto } }, orderBy: { fecha: "asc" }, take: 10 }) : Promise.resolve([]),
    esClinico || esFarmacia ? prisma.receta.findMany({ where: { estado: { in: ["EMITIDA", "EN_PREPARACION", "LISTA", "USADA_PARCIALMENTE"] } }, select: { id: true, codigoReceta: true, estado: true, createdAt: true, cliente: { select: contacto } }, orderBy: { createdAt: "asc" }, take: 10 }) : Promise.resolve([]),
    esFarmacia ? prisma.venta.findMany({ where: { estado: "COMPLETADA", estadoEntrega: "LISTO_PARA_RETIRAR", idCliente: { not: null } }, select: { id: true, fecha: true, cliente: { select: contacto } }, orderBy: { fecha: "asc" }, take: 10 }) : Promise.resolve([]),
    esFarmacia ? prisma.cliente.findMany({ where: { activo: true, ventas: { some: { estado: "COMPLETADA", fecha: { gte: hace90Dias, lte: hace25Dias } } } }, select: { ...contacto, ventas: { where: { estado: "COMPLETADA" }, select: { fecha: true }, orderBy: { fecha: "desc" }, take: 1 } }, take: 20 }) : Promise.resolve([]),
    esFarmacia ? prisma.lote.findMany({ where: { activo: true, stockActual: { gt: 0 }, fechaVencimiento: { gt: ahora, lte: enNoventaDias } }, select: { id: true, codigoLote: true, fechaVencimiento: true, producto: { select: { nombre: true } } }, orderBy: { fechaVencimiento: "asc" }, take: 10 }) : Promise.resolve([]),
    esFarmacia ? prisma.$queryRaw<Array<{ id: number; nombre: string; stockActual: number; stockMinimo: number }>>`SELECT id, nombre, "stockActual", COALESCE("stockMinimo", 10)::int AS "stockMinimo" FROM "Producto" WHERE activo = true AND "esServicio" = false AND "stockActual" <= COALESCE("stockMinimo", 10) ORDER BY "stockActual" ASC LIMIT 10` : Promise.resolve([]),
  ])

  for (const cita of citas) {
    const vencida = cita.fecha < ahora
    recordatorios.push(comunicacion({ id: `cita-${cita.id}`, tipo: vencida ? "CITA_PENDIENTE" : "CITA_PROXIMA", prioridad: vencida ? "ALTA" : "MEDIA", titulo: vencida ? "Cita pendiente" : "Cita próxima", detalle: cita.cliente.nombreCompleto, fecha: cita.fecha, href: "/clinica?tab=citas", cliente: cita.cliente, asunto: "Recordatorio de cita — FarmaPOS", mensaje: `Hola ${cita.cliente.nombreCompleto}, te recordamos tu cita podológica para ${cita.fecha.toLocaleString("es-NI", { timeZone: "America/Managua" })}.` }))
  }
  for (const receta of recetas) {
    const lista = receta.estado === "LISTA"
    recordatorios.push(comunicacion({ id: `receta-${receta.id}`, tipo: lista ? "RECETA_LISTA" : "RECETA_PENDIENTE", prioridad: lista ? "ALTA" : "MEDIA", titulo: lista ? `Receta ${receta.codigoReceta} lista` : `Receta ${receta.codigoReceta} pendiente`, detalle: receta.cliente.nombreCompleto, fecha: receta.createdAt, href: "/clinica?tab=recetas", cliente: receta.cliente, asunto: lista ? "Tu receta está lista — FarmaPOS" : "Seguimiento de receta — FarmaPOS", mensaje: lista ? `Hola ${receta.cliente.nombreCompleto}, tu receta ${receta.codigoReceta} está lista.` : `Hola ${receta.cliente.nombreCompleto}, tu receta ${receta.codigoReceta} sigue pendiente. Contáctanos si necesitas ayuda.` }))
  }
  for (const pedido of pedidos) if (pedido.cliente) recordatorios.push(comunicacion({ id: `pedido-${pedido.id}`, tipo: "PEDIDO_LISTO", prioridad: "ALTA", titulo: `Pedido #${pedido.id} listo para retirar`, detalle: pedido.cliente.nombreCompleto, fecha: pedido.fecha, href: "/ventas/historial", cliente: pedido.cliente, asunto: "Tu pedido está listo — FarmaPOS", mensaje: `Hola ${pedido.cliente.nombreCompleto}, tu pedido #${pedido.id} ya está listo para retirar.` }))
  for (const cliente of recompraClientes) {
    const ultima = cliente.ventas[0]?.fecha
    if (!ultima || ultima > hace25Dias) continue
    recordatorios.push(comunicacion({ id: `recompra-${cliente.id}`, tipo: "RECOMPRA", prioridad: "BAJA", titulo: "Seguimiento de recompra", detalle: cliente.nombreCompleto, fecha: ultima, href: `/clientes?cliente=${cliente.id}`, cliente, asunto: "¿Necesitas reponer tus productos? — FarmaPOS", mensaje: `Hola ${cliente.nombreCompleto}, han pasado varias semanas desde tu última compra. Podemos ayudarte a revisar si necesitas una reposición.` }))
  }
  for (const lote of lotes) recordatorios.push({ id: `lote-${lote.id}`, tipo: "VENCIMIENTO", prioridad: "ALTA", titulo: `${lote.producto.nombre} próximo a vencer`, detalle: `Lote ${lote.codigoLote}`, fechaObjetivo: lote.fechaVencimiento?.toISOString(), href: "/inventario?tab=alertas&tipo=por-vencer", canalesDisponibles: ["INTERNO"], canalActivo: "INTERNO" })
  for (const producto of stockBajo) recordatorios.push({ id: `stock-${producto.id}`, tipo: "STOCK_BAJO", prioridad: producto.stockActual === 0 ? "ALTA" : "MEDIA", titulo: `${producto.nombre}: stock bajo`, detalle: `${producto.stockActual} disponibles / mínimo ${producto.stockMinimo}`, href: "/compras/recomendaciones", canalesDisponibles: ["INTERNO"], canalActivo: "INTERNO" })

  const orden = { ALTA: 0, MEDIA: 1, BAJA: 2 }
  recordatorios.sort((a, b) => orden[a.prioridad] - orden[b.prioridad])
  return NextResponse.json({ recordatorios: recordatorios.slice(0, 50), total: recordatorios.length, integraciones: integracionesComunicacion(), generadoEn: ahora.toISOString() })
}
