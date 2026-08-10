import { NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type ConversationContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: ConversationContext) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await context.params

  const conversacion = await prisma.iAConversacion.findFirst({
    where: { id, idUsuario: user.id },
    include: {
      mensajes: { orderBy: { createdAt: "asc" } },
      importaciones: {
        where: { estado: "BORRADOR" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { id: true, archivo: true },
      },
    },
  })

  if (!conversacion) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 })
  return NextResponse.json({
    conversacion: {
      ...conversacion,
      importacionActiva: conversacion.importaciones[0] ?? null,
      importaciones: undefined,
    },
  })
}

export async function PATCH(request: Request, context: ConversationContext) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await context.params
  const parsed = z.object({ titulo: z.string().trim().min(1).max(100) }).safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: "Título inválido" }, { status: 400 })

  const exists = await prisma.iAConversacion.findFirst({ where: { id, idUsuario: user.id }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 })

  const conversacion = await prisma.iAConversacion.update({ where: { id }, data: { titulo: parsed.data.titulo } })
  return NextResponse.json({ conversacion })
}

export async function DELETE(_request: Request, context: ConversationContext) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await context.params
  const deleted = await prisma.iAConversacion.deleteMany({ where: { id, idUsuario: user.id } })
  if (deleted.count === 0) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 })
  return NextResponse.json({ success: true })
}
