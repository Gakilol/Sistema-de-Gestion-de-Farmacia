import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { servicioSchema, emptyToNull } from "@/lib/validations"
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

    const servicios = await prisma.servicioPodologia.findMany({
      where,
      include: {
        _count: { select: { atenciones: true } }
      },
      orderBy: { nombre: "asc" },
    })

    return NextResponse.json(servicios)
  } catch (error) {
    console.error("Error fetching servicios:", error)
    return NextResponse.json({ error: "Error fetching servicios" }, { status: 500 })
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
    const validation = servicioSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const { nombre, descripcion, precio, duracion, activo } = validation.data

    const duplicate = await prisma.servicioPodologia.findFirst({
      where: { nombre: { equals: nombre, mode: "insensitive" } }
    })
    if (duplicate) {
      return NextResponse.json({ error: "Ya existe un servicio registrado con este nombre" }, { status: 400 })
    }

    const servicio = await prisma.servicioPodologia.create({
      data: {
        nombre,
        descripcion: emptyToNull(descripcion),
        precio,
        duracion,
        activo: activo ?? true,
      },
    })

    registrarLog({
      accion: "CREAR_SERVICIO",
      entidad: "ServicioPodologia",
      entidadId: servicio.id,
      idUsuario: user.id,
      modulo: "CLINICA",
      detalles: { nombre: servicio.nombre, precio: Number(servicio.precio) }
    })

    return NextResponse.json(servicio, { status: 201 })
  } catch (error: any) {
    console.error("Error creating servicio:", error)
    return NextResponse.json({ error: error.message || "Error al crear el servicio" }, { status: 500 })
  }
}
