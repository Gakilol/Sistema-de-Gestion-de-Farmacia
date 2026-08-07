import { createHash, randomBytes } from "node:crypto"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { ocultarCedula, prepararCedulaBusqueda } from "@/lib/domain/patient-access"
import { prisma } from "@/lib/prisma"

const accesoPacienteSchema = z.object({
  cedula: z.string().trim().min(1, "Ingresa el número de cédula").max(32, "La cédula es demasiado larga"),
  horas: z.coerce.number().int().min(1).max(168).default(24),
  incluirResultados: z.boolean().default(true),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !["ADMIN", "DOCTOR"].includes(user.rolNombre)) {
      return NextResponse.json({ error: "Sin permiso" }, { status: user ? 403 : 401 })
    }

    const body = await request.json().catch(() => null)
    const validation = accesoPacienteSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0]?.message ?? "Solicitud inválida" }, { status: 400 })
    }

    const cedula = prepararCedulaBusqueda(validation.data.cedula)
    if (!cedula) {
      return NextResponse.json(
        { error: "Usa una cédula válida con el formato 001-010190-0001A" },
        { status: 400 },
      )
    }

    const paciente = await prisma.cliente.findFirst({
      where: {
        activo: true,
        tipoPerfil: { in: ["CLINICA", "AMBOS"] },
        cedula: { in: cedula.candidatas },
      },
      select: { id: true, nombreCompleto: true, cedula: true },
    })
    if (!paciente) {
      return NextResponse.json({ error: "No se encontró un paciente clínico activo con esa cédula" }, { status: 404 })
    }

    const { horas, incluirResultados } = validation.data
    const token = randomBytes(32).toString("base64url")
    const tokenHash = createHash("sha256").update(token).digest("hex")
    const acceso = await prisma.$transaction(async (tx) => {
      const creado = await tx.accesoPaciente.create({
        data: {
          tokenHash,
          idCliente: paciente.id,
          creadoPor: user.id,
          expiracion: new Date(Date.now() + horas * 3600000),
          incluirResultados,
        },
      })
      await tx.auditoriaLog.create({
        data: {
          accion: "CREAR_ACCESO_PACIENTE",
          entidad: "AccesoPaciente",
          entidadId: creado.id,
          idUsuario: user.id,
          modulo: "CLINICA",
          detalles: JSON.stringify({ idCliente: paciente.id, horas, incluirResultados: creado.incluirResultados }),
        },
      })
      return creado
    })

    return NextResponse.json(
      {
        url: `${request.nextUrl.origin}/paciente/resumen/${token}`,
        expiracion: acceso.expiracion,
        paciente: {
          nombreCompleto: paciente.nombreCompleto,
          cedula: ocultarCedula(paciente.cedula ?? cedula.formateada),
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error al crear acceso compartible del paciente:", error)
    return NextResponse.json({ error: "No se pudo generar el enlace temporal" }, { status: 500 })
  }
}
