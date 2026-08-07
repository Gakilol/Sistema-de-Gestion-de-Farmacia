import { createHash } from "node:crypto"
import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  const tokenHash = createHash("sha256").update(token).digest("hex")
  const acceso = await prisma.accesoPaciente.findUnique({ where: { tokenHash }, select: { id: true, idCliente: true, expiracion: true, revocado: true, incluirResultados: true } })
  if (!acceso || acceso.revocado || acceso.expiracion <= new Date()) return NextResponse.json({ error: "El enlace no existe o ha expirado" }, { status: 410 })
  const [paciente, citas, recetas, examenes] = await Promise.all([
    prisma.cliente.findUnique({ where: { id: acceso.idCliente }, select: { nombreCompleto: true } }),
    prisma.cita.findMany({ where: { idCliente: acceso.idCliente, fecha: { gte: new Date() }, estado: "PENDIENTE" }, select: { id: true, fecha: true, motivo: true, estado: true }, orderBy: { fecha: "asc" }, take: 10 }),
    prisma.receta.findMany({ where: { idCliente: acceso.idCliente, estado: { not: "ANULADA" } }, select: { codigoReceta: true, estado: true, createdAt: true, fechaVencimiento: true, detalles: { select: { cantidad: true, cantidadFacturada: true, indicaciones: true, producto: { select: { nombre: true } } } } }, orderBy: { createdAt: "desc" }, take: 10 }),
    acceso.incluirResultados ? prisma.examenPaciente.findMany({ where: { idPaciente: acceso.idCliente, activo: true, autorizadoPortal: true, deletedAt: null }, select: { nombre: true, tipo: true, fechaExamen: true, resultado: true, interpretacion: true }, orderBy: { fechaExamen: "desc" }, take: 10 }) : Promise.resolve([]),
  ])
  await prisma.accesoPaciente.update({ where: { id: acceso.id }, data: { ultimoAcceso: new Date() } })
  return NextResponse.json({ paciente, citas, recetas, examenes, expiracion: acceso.expiracion })
}
