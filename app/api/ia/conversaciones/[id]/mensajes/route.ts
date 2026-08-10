import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(20000),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await context.params
  const parsed = MessageSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 })

  const conversacion = await prisma.iAConversacion.findFirst({ where: { id, idUsuario: user.id }, select: { id: true } })
  if (!conversacion) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 })

  const [mensaje] = await prisma.$transaction([
    prisma.iAMensaje.create({
      data: {
        idConversacion: id,
        rol: parsed.data.role,
        contenido: parsed.data.content,
        metadata: parsed.data.metadata as Prisma.InputJsonValue | undefined,
      },
    }),
    prisma.iAConversacion.update({ where: { id }, data: { updatedAt: new Date() } }),
  ])

  return NextResponse.json({ mensaje }, { status: 201 })
}
