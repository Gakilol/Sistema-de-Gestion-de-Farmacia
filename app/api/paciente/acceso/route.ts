import { createHash, randomBytes } from "node:crypto"
import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !["ADMIN", "DOCTOR"].includes(user.rolNombre)) return NextResponse.json({ error: "Sin permiso" }, { status: user ? 403 : 401 })
  const body = await request.json()
  const idCliente = Number(body.idCliente)
  const horas = Math.min(168, Math.max(1, Number(body.horas || 24)))
  const existe = await prisma.cliente.count({ where: { id: idCliente, activo: true } })
  if (!existe) return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })
  const token = randomBytes(32).toString("base64url")
  const tokenHash = createHash("sha256").update(token).digest("hex")
  const acceso = await prisma.$transaction(async (tx) => {
    const creado = await tx.accesoPaciente.create({ data: { tokenHash, idCliente, creadoPor: user.id, expiracion: new Date(Date.now() + horas * 3600000), incluirResultados: Boolean(body.incluirResultados) } })
    await tx.auditoriaLog.create({ data: { accion: "CREAR_ACCESO_PACIENTE", entidad: "AccesoPaciente", entidadId: creado.id, idUsuario: user.id, modulo: "CLINICA", detalles: JSON.stringify({ idCliente, horas, incluirResultados: creado.incluirResultados }) } })
    return creado
  })
  return NextResponse.json({ url: `${request.nextUrl.origin}/paciente/resumen/${token}`, expiracion: acceso.expiracion }, { status: 201 })
}
