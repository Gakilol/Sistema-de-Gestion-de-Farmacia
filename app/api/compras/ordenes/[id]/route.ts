import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { registrarLog } from "@/lib/audit"
import { getCurrentUser } from "@/lib/auth"
import { puedeAprobarOrden, type EstadoOrdenCompra } from "@/lib/domain/purchase-orders"
import { prisma } from "@/lib/prisma"

const actionSchema = z.object({ accion: z.enum(["APROBAR", "CANCELAR"]) })

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (user.rolNombre !== "ADMIN") {
    return NextResponse.json({ error: "Solo administración puede aprobar o cancelar órdenes" }, { status: 403 })
  }
  const { id } = await params
  const idOrden = Number(id)
  if (!Number.isInteger(idOrden) || idOrden <= 0) return NextResponse.json({ error: "Orden inválida" }, { status: 400 })
  const validation = actionSchema.safeParse(await request.json().catch(() => null))
  if (!validation.success) return NextResponse.json({ error: "Acción inválida" }, { status: 400 })

  const actual = await prisma.ordenCompra.findUnique({ where: { id: idOrden }, select: { id: true, estado: true } })
  if (!actual) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 })

  const accion = validation.data.accion
  if (accion === "APROBAR" && !puedeAprobarOrden(actual.estado as EstadoOrdenCompra)) {
    return NextResponse.json({ error: "Solo se puede aprobar una orden en borrador" }, { status: 409 })
  }
  if (accion === "CANCELAR" && !["BORRADOR", "APROBADA"].includes(actual.estado)) {
    return NextResponse.json({ error: "Una orden recibida total o parcialmente no puede cancelarse" }, { status: 409 })
  }

  const estado = accion === "APROBAR" ? "APROBADA" : "CANCELADA"
  const updated = await prisma.ordenCompra.updateMany({
    where: { id: idOrden, estado: actual.estado },
    data: accion === "APROBAR"
      ? { estado, idAprobadoPor: user.id, aprobadaEn: new Date() }
      : { estado },
  })
  if (updated.count !== 1) return NextResponse.json({ error: "La orden cambió mientras se procesaba; actualiza e intenta de nuevo" }, { status: 409 })

  const orden = await prisma.ordenCompra.findUnique({
    where: { id: idOrden },
    include: { proveedor: true, creadoPor: true, aprobadoPor: true, detalles: { include: { producto: true } }, compras: true },
  })
  registrarLog({ accion: `${accion}_ORDEN_COMPRA`, entidad: "OrdenCompra", entidadId: idOrden, idUsuario: user.id, detalles: { estadoAnterior: actual.estado, estado } })
  return NextResponse.json(orden)
}
