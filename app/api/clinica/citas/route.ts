import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { citaSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const idCliente = searchParams.get("idCliente")
    const estado = searchParams.get("estado")

    const whereClause: any = {}
    if (idCliente) {
      whereClause.idCliente = Number.parseInt(idCliente)
    }
    if (estado) {
      whereClause.estado = estado
    }

    const citas = await prisma.cita.findMany({
      where: whereClause,
      include: {
        cliente: true,
        atencion: {
          include: {
            receta: true
          }
        }
      },
      orderBy: { fecha: "desc" },
    })

    return NextResponse.json(citas)
  } catch (error) {
    console.error("Error fetching citas:", error)
    return NextResponse.json({ error: "Error al obtener citas" }, { status: 500 })
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

    if (!usuarioDb) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await request.json()
    const validation = citaSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const { idCliente, fecha, motivo, estado } = validation.data

    const cita = await prisma.cita.create({
      data: {
        idCliente,
        fecha: new Date(fecha),
        motivo,
        estado,
        esDatoPrueba: usuarioDb.esDatoPrueba
      },
      include: {
        cliente: true
      }
    })

    return NextResponse.json(cita, { status: 201 })
  } catch (error: any) {
    console.error("Error creating cita:", error)
    return NextResponse.json({ error: "Error al crear la cita" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, estado } = body

    if (!id || !estado) {
      return NextResponse.json({ error: "Id and estado are required" }, { status: 400 })
    }

    const updatedCita = await prisma.cita.update({
      where: { id: parseInt(id) },
      data: { estado }
    })

    return NextResponse.json(updatedCita)
  } catch (error) {
    console.error("Error updating cita:", error)
    return NextResponse.json({ error: "Error al actualizar la cita" }, { status: 500 })
  }
}
