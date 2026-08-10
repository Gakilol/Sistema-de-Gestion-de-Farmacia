import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { analyzeImportRows, formatImportAnalysis, normalizeSpreadsheetRows } from "@/lib/ia/product-import"

const StartImportSchema = z.object({
  archivo: z.string().trim().min(1).max(180),
  conversacionId: z.string().trim().min(1).optional(),
  filas: z.array(z.record(z.string(), z.unknown())).min(1).max(250),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (user.rolNombre !== "ADMIN") return NextResponse.json({ error: "Solo administración puede importar productos" }, { status: 403 })

  const parsed = StartImportSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: "El Excel debe contener entre 1 y 250 filas de productos" }, { status: 400 })

  if (parsed.data.conversacionId) {
    const ownConversation = await prisma.iAConversacion.findFirst({
      where: { id: parsed.data.conversacionId, idUsuario: user.id },
      select: { id: true },
    })
    if (!ownConversation) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 })
  }

  const rows = normalizeSpreadsheetRows(parsed.data.filas)
  if (rows.length === 0) return NextResponse.json({ error: "El archivo no contiene filas reconocibles" }, { status: 400 })
  const analysis = await analyzeImportRows(rows)
  const importacion = await prisma.iAImportacionProducto.create({
    data: {
      idUsuario: user.id,
      idConversacion: parsed.data.conversacionId,
      archivo: parsed.data.archivo,
      filas: rows as unknown as Prisma.InputJsonValue,
      resumen: {
        total: analysis.total,
        filasConProblemas: analysis.filasConProblemas,
        listo: analysis.listo,
      },
    },
  })

  return NextResponse.json({
    importacionId: importacion.id,
    text: formatImportAnalysis(analysis, parsed.data.archivo),
    resumen: importacion.resumen,
    listo: analysis.listo,
  }, { status: 201 })
}
