import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { registrarLog } from "@/lib/audit"
import { z } from "zod"

const loteUpdateSchema = z.object({
  codigoLote: z.string().trim().min(1, "El código de lote es requerido"),
  fechaVencimiento: z.string().trim().nullable().optional(),
})

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })

    if (usuarioDb?.rol.nombre !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const loteId = Number.parseInt(id)
    if (isNaN(loteId)) {
      return NextResponse.json({ error: "ID de lote inválido" }, { status: 400 })
    }

    const body = await request.json()
    const parsed = loteUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { codigoLote, fechaVencimiento } = parsed.data

    const loteOriginal = await prisma.lote.findUnique({
      where: { id: loteId },
      include: { producto: true }
    })

    if (!loteOriginal) {
      return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 })
    }

    const loteActualizado = await prisma.lote.update({
      where: { id: loteId },
      data: {
        codigoLote,
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
      },
    })

    // Log audit
    registrarLog({
      accion: "EDITAR_LOTE",
      entidad: "Lote",
      entidadId: loteId,
      idUsuario: user.id,
      detalles: {
        producto: loteOriginal.producto.nombre,
        codigoOriginal: loteOriginal.codigoLote,
        codigoNuevo: codigoLote,
        vencimientoOriginal: loteOriginal.fechaVencimiento,
        vencimientoNuevo: fechaVencimiento,
      }
    })

    return NextResponse.json(loteActualizado)
  } catch (error) {
    console.error("Error al actualizar lote:", error)
    return NextResponse.json({ error: "Error al actualizar lote" }, { status: 500 })
  }
}
