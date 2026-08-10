import { NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const CreateConversationSchema = z.object({
  titulo: z.string().trim().min(1).max(100).optional(),
})

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const conversaciones = await prisma.iAConversacion.findMany({
    where: { idUsuario: user.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      titulo: true,
      createdAt: true,
      updatedAt: true,
      mensajes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { contenido: true },
      },
      importaciones: {
        where: { estado: "BORRADOR" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { id: true, archivo: true },
      },
    },
  })

  return NextResponse.json({
    conversaciones: conversaciones.map((item) => ({
      ...item,
      vistaPrevia: item.mensajes[0]?.contenido ?? "Sin mensajes",
      importacionActiva: item.importaciones[0] ?? null,
      mensajes: undefined,
      importaciones: undefined,
    })),
  })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const parsed = CreateConversationSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: "Título inválido" }, { status: 400 })

  const conversacion = await prisma.iAConversacion.create({
    data: {
      idUsuario: user.id,
      titulo: parsed.data.titulo || "Nueva conversación",
    },
  })

  return NextResponse.json({ conversacion }, { status: 201 })
}
