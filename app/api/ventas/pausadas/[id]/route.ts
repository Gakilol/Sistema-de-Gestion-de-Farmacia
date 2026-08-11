import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { registrarLog } from "@/lib/audit"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const actionSchema = z.object({ accion: z.enum(["RECUPERAR", "CANCELAR"]) })

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!['ADMIN', 'EMPLEADO'].includes(user.rolNombre)) return NextResponse.json({ error: "Sin acceso al punto de venta" }, { status: 403 })
  const { id } = await params
  const idPausa = Number(id)
  const validation = actionSchema.safeParse(await request.json().catch(() => null))
  if (!Number.isInteger(idPausa) || !validation.success) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })

  const actual = await prisma.ventaPausada.findUnique({ where: { id: idPausa } })
  if (!actual) return NextResponse.json({ error: "Venta pausada no encontrada" }, { status: 404 })
  if (actual.estado !== "PAUSADA") return NextResponse.json({ error: "La venta ya no está disponible para recuperar" }, { status: 409 })
  const estado = validation.data.accion === "RECUPERAR" ? "RECUPERADA" : "CANCELADA"
  const updated = await prisma.ventaPausada.updateMany({
    where: { id: idPausa, estado: "PAUSADA" },
    data: { estado, recuperadaEn: estado === "RECUPERADA" ? new Date() : null },
  })
  if (updated.count !== 1) return NextResponse.json({ error: "La venta fue recuperada desde otra sesión" }, { status: 409 })
  registrarLog({ accion: `${validation.data.accion}_VENTA_PAUSADA`, entidad: "VentaPausada", entidadId: idPausa, idUsuario: user.id })
  return NextResponse.json({ ...actual, estado })
}
