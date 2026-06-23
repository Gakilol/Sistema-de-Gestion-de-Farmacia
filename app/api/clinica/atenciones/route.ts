import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { atencionSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const idCliente = searchParams.get("idCliente")

    const whereClause: any = {}
    if (idCliente) {
      whereClause.idCliente = Number.parseInt(idCliente)
    }

    const atenciones = await prisma.atencionPodologica.findMany({
      where: whereClause,
      include: {
        cliente: true,
        usuario: { include: { rol: true } },
        cita: true,
        receta: {
          include: {
            detalles: {
              include: {
                producto: true
              }
            }
          }
        }
      },
      orderBy: { fecha: "desc" },
    })

    return NextResponse.json(atenciones)
  } catch (error) {
    console.error("Error fetching atenciones:", error)
    return NextResponse.json({ error: "Error al obtener atenciones" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })

    // Solo ADMIN y DOCTOR pueden registrar atenciones podológicas
    const allowedRoles = ["ADMIN", "DOCTOR"]
    if (!usuarioDb || !allowedRoles.includes(usuarioDb.rol.nombre)) {
      return NextResponse.json({ error: "Forbidden: Solo el administrador o doctor pueden registrar atenciones clínicas" }, { status: 403 })
    }

    const body = await request.json()
    const validation = atencionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const {
      idCita,
      idCliente,
      subjetivo,
      objetivo,
      analisis,
      plan
    } = validation.data

    const atencion = await prisma.$transaction(async (tx) => {
      // 1. Si hay cita, marcarla como completada
      if (idCita) {
        const cita = await tx.cita.findUnique({
          where: { id: idCita }
        })
        if (cita && cita.estado !== "CANCELADA") {
          await tx.cita.update({
            where: { id: idCita },
            data: { estado: "COMPLETADA" }
          })
        }
      }

      // 2. Determinar si es dato de prueba
      const esDatoPrueba = usuarioDb.esDatoPrueba

      // 3. Crear la atención podológica (SOAP)
      const nuevaAtencion = await tx.atencionPodologica.create({
        data: {
          idCita: idCita || null,
          idCliente,
          idUsuario: user.id,
          subjetivo,
          objetivo,
          analisis,
          plan,
          esDatoPrueba
        },
        include: {
          cliente: true,
          usuario: { include: { rol: true } },
          cita: true
        }
      })

      return nuevaAtencion
    })

    return NextResponse.json(atencion, { status: 201 })
  } catch (error: any) {
    console.error("Error creating atencion:", error)
    return NextResponse.json({ error: "Ocurrió un error inesperado al procesar la atención podológica." }, { status: 500 })
  }
}
