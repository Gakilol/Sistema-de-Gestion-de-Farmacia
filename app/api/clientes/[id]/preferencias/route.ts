import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { registrarLog } from "@/lib/audit"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  canalPreferido: z.enum(["INTERNO", "WHATSAPP", "EMAIL", "SMS"]),
  consentimientoWhatsApp: z.boolean(),
  consentimientoEmail: z.boolean(),
  consentimientoSms: z.boolean(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const idCliente = Number(id)
  const validation = schema.safeParse(await request.json().catch(() => null))
  if (!Number.isInteger(idCliente) || !validation.success) return NextResponse.json({ error: validation.success ? "Cliente inválido" : validation.error.issues[0]?.message }, { status: 400 })
  const cliente = await prisma.cliente.update({ where: { id: idCliente }, data: { ...validation.data, consentimientoActualizadoEn: new Date() } })
  registrarLog({ accion: "ACTUALIZAR_CONSENTIMIENTO", entidad: "Cliente", entidadId: idCliente, idUsuario: user.id, detalles: validation.data })
  return NextResponse.json(cliente)
}
