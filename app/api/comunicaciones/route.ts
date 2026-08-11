import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { registrarLog } from "@/lib/audit"
import { getCurrentUser } from "@/lib/auth"
import { enviarMensajeCliente, integracionesComunicacion } from "@/lib/customer-engagement"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  idCliente: z.number().int().positive(),
  tipo: z.enum(["RECETA_PENDIENTE", "RECETA_LISTA", "CITA_PROXIMA", "RECOMPRA", "PEDIDO_LISTO"]),
  canal: z.enum(["WHATSAPP", "EMAIL", "SMS"]),
  asunto: z.string().trim().min(3).max(160),
  mensaje: z.string().trim().min(5).max(1200),
})

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const take = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("take") || 30)))
  const comunicaciones = await prisma.comunicacionCliente.findMany({
    take,
    include: { cliente: { select: { nombreCompleto: true } }, usuario: { select: { nombreCompleto: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ integraciones: integracionesComunicacion(), comunicaciones })
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!['ADMIN', 'EMPLEADO', 'DOCTOR'].includes(user.rolNombre)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  const validation = schema.safeParse(await request.json().catch(() => null))
  if (!validation.success) return NextResponse.json({ error: validation.error.issues[0]?.message }, { status: 400 })
  const cliente = await prisma.cliente.findUnique({ where: { id: validation.data.idCliente } })
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
  const consentimientos = { WHATSAPP: cliente.consentimientoWhatsApp, EMAIL: cliente.consentimientoEmail, SMS: cliente.consentimientoSms }
  if (!consentimientos[validation.data.canal]) return NextResponse.json({ error: `El cliente no ha dado consentimiento para ${validation.data.canal}` }, { status: 409 })
  const destinos = { WHATSAPP: cliente.telefono, SMS: cliente.telefono, EMAIL: cliente.correo }
  const destino = destinos[validation.data.canal]
  if (!destino) return NextResponse.json({ error: `El cliente no tiene destino para ${validation.data.canal}` }, { status: 409 })

  const comunicacion = await prisma.comunicacionCliente.create({ data: { ...validation.data, destino, idUsuario: user.id, estado: "PENDIENTE" } })
  const resultado = await enviarMensajeCliente({ canal: validation.data.canal, destino, asunto: validation.data.asunto, mensaje: validation.data.mensaje })
  const actualizada = await prisma.comunicacionCliente.update({
    where: { id: comunicacion.id },
    data: { estado: resultado.estado, resultado: resultado.resultado || null, proveedorId: resultado.proveedorId || null, enviadoEn: resultado.ok ? new Date() : null },
    include: { cliente: { select: { nombreCompleto: true } } },
  })
  registrarLog({ accion: "ENVIAR_RECORDATORIO", entidad: "ComunicacionCliente", entidadId: actualizada.id, idUsuario: user.id, detalles: { tipo: actualizada.tipo, canal: actualizada.canal, estado: actualizada.estado } })
  return NextResponse.json(actualizada, { status: resultado.ok ? 201 : 424 })
}
