import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { registrarLog } from "@/lib/audit"

// GET /api/clinica/tratamientos — Lista tratamientos activos
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const searchParams = request.nextUrl.searchParams
    const soloActivos = searchParams.get("soloActivos") !== "false"
    const query = searchParams.get("q")?.trim()

    const where: any = {}
    if (soloActivos) where.activo = true
    if (query) {
      where.OR = [
        { nombre: { contains: query, mode: "insensitive" } },
        { descripcion: { contains: query, mode: "insensitive" } },
      ]
    }

    const tratamientos = await prisma.tratamiento.findMany({
      where,
      orderBy: { nombre: "asc" },
    })

    return NextResponse.json(tratamientos)
  } catch (error) {
    console.error("Error fetching tratamientos:", error)
    return NextResponse.json({ error: "Error al obtener tratamientos" }, { status: 500 })
  }
}

// POST /api/clinica/tratamientos — Crear nuevo tratamiento (solo ADMIN o DOCTOR)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })
    if (!usuarioDb || !["ADMIN", "DOCTOR"].includes(usuarioDb.rol.nombre)) {
      return NextResponse.json({ error: "Forbidden: Solo ADMIN o DOCTOR pueden gestionar tratamientos" }, { status: 403 })
    }

    const body = await request.json()
    const { nombre, descripcion } = body

    if (!nombre || typeof nombre !== "string" || nombre.trim().length < 2) {
      return NextResponse.json({ error: "El nombre del tratamiento es obligatorio (mínimo 2 caracteres)" }, { status: 400 })
    }

    const existe = await prisma.tratamiento.findUnique({ where: { nombre: nombre.trim() } })
    if (existe) {
      return NextResponse.json({ error: "Ya existe un tratamiento con ese nombre" }, { status: 409 })
    }

    const tratamiento = await prisma.tratamiento.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        esDatoPrueba: usuarioDb.esDatoPrueba,
      },
    })

    registrarLog({
      accion: "CREAR_TRATAMIENTO",
      entidad: "Tratamiento",
      entidadId: tratamiento.id,
      idUsuario: user.id,
      detalles: { nombre: tratamiento.nombre },
    })

    return NextResponse.json(tratamiento, { status: 201 })
  } catch (error: any) {
    console.error("Error creating tratamiento:", error)
    return NextResponse.json({ error: "Error al crear tratamiento" }, { status: 500 })
  }
}
