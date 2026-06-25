import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { registrarLog } from "@/lib/audit"

// GET /api/clinica/diagnosticos — Lista diagnósticos activos
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
        { codigo: { contains: query, mode: "insensitive" } },
        { descripcion: { contains: query, mode: "insensitive" } },
      ]
    }

    const diagnosticos = await prisma.diagnostico.findMany({
      where,
      orderBy: { nombre: "asc" },
    })

    return NextResponse.json(diagnosticos)
  } catch (error) {
    console.error("Error fetching diagnosticos:", error)
    return NextResponse.json({ error: "Error al obtener diagnósticos" }, { status: 500 })
  }
}

// POST /api/clinica/diagnosticos — Crear nuevo diagnóstico (solo ADMIN o DOCTOR)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })
    if (!usuarioDb || !["ADMIN", "DOCTOR"].includes(usuarioDb.rol.nombre)) {
      return NextResponse.json({ error: "Forbidden: Solo ADMIN o DOCTOR pueden gestionar diagnósticos" }, { status: 403 })
    }

    const body = await request.json()
    const { nombre, codigo, descripcion } = body

    if (!nombre || typeof nombre !== "string" || nombre.trim().length < 2) {
      return NextResponse.json({ error: "El nombre del diagnóstico es obligatorio (mínimo 2 caracteres)" }, { status: 400 })
    }

    // Verificar que no exista un diagnóstico con el mismo nombre
    const existe = await prisma.diagnostico.findUnique({ where: { nombre: nombre.trim() } })
    if (existe) {
      return NextResponse.json({ error: "Ya existe un diagnóstico con ese nombre" }, { status: 409 })
    }

    // Verificar código único si se provee
    if (codigo) {
      const existeCodigo = await prisma.diagnostico.findUnique({ where: { codigo: codigo.trim() } })
      if (existeCodigo) {
        return NextResponse.json({ error: "Ya existe un diagnóstico con ese código CIE-10" }, { status: 409 })
      }
    }

    const diagnostico = await prisma.diagnostico.create({
      data: {
        nombre: nombre.trim(),
        codigo: codigo?.trim() || null,
        descripcion: descripcion?.trim() || null,
        esDatoPrueba: usuarioDb.esDatoPrueba,
      },
    })

    registrarLog({
      accion: "CREAR_DIAGNOSTICO",
      entidad: "Diagnostico",
      entidadId: diagnostico.id,
      idUsuario: user.id,
      detalles: { nombre: diagnostico.nombre, codigo: diagnostico.codigo },
    })

    return NextResponse.json(diagnostico, { status: 201 })
  } catch (error: any) {
    console.error("Error creating diagnostico:", error)
    return NextResponse.json({ error: "Error al crear diagnóstico" }, { status: 500 })
  }
}
