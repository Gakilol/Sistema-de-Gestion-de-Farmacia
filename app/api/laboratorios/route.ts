import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { laboratorioSchema, emptyToNull } from "@/lib/validations"
import { registrarLog } from "@/lib/audit"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const estado = searchParams.get("estado") ?? "activos" // todos, activos, inactivos

    const where: any = {
      nombre: { contains: search, mode: "insensitive" },
    }

    if (estado === "activos") {
      where.activo = true
    } else if (estado === "inactivos") {
      where.activo = false
    }

    const laboratorios = await prisma.laboratorio.findMany({
      where,
      include: {
        _count: {
          select: { productos: true }
        }
      },
      orderBy: { nombre: "asc" },
    })

    return NextResponse.json(laboratorios)
  } catch (error) {
    console.error("Error fetching laboratorios:", error)
    return NextResponse.json({ error: "Error fetching laboratorios" }, { status: 500 })
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

    if (usuarioDb?.rol.nombre !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validation = laboratorioSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const { nombre, pais, direccion, telefono, correo, contacto, observaciones, activo } = validation.data

    const duplicate = await prisma.laboratorio.findFirst({
      where: { nombre: { equals: nombre, mode: "insensitive" } }
    })
    if (duplicate) {
      return NextResponse.json({ error: "Ya existe un laboratorio registrado con este nombre" }, { status: 400 })
    }

    const laboratorio = await prisma.laboratorio.create({
      data: {
        nombre,
        pais: emptyToNull(pais),
        direccion: emptyToNull(direccion),
        telefono: emptyToNull(telefono),
        correo: emptyToNull(correo),
        contacto: emptyToNull(contacto),
        observaciones: emptyToNull(observaciones),
        activo: activo ?? true,
      },
    })

    registrarLog({
      accion: "CREAR_LABORATORIO",
      entidad: "Laboratorio",
      entidadId: laboratorio.id,
      idUsuario: user.id,
      detalles: { nombre: laboratorio.nombre }
    })

    return NextResponse.json(laboratorio, { status: 201 })
  } catch (error: any) {
    console.error("Error creating laboratorio:", error)
    return NextResponse.json({ error: error.message || "Error al crear el laboratorio" }, { status: 500 })
  }
}
