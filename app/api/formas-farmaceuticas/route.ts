import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { registrarLog } from "@/lib/audit"

// GET /api/formas-farmaceuticas?estado=activos|todos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const estado = searchParams.get("estado") ?? "activos"
    const order = searchParams.get("order") ?? "orden"

    let where: any = {}
    if (estado === "activos") {
      where.activo = true
    }

    const formas = await prisma.formaFarmaceutica.findMany({
      where,
      orderBy: order === "orden" ? [
        { orden: "asc" },
        { nombre: "asc" }
      ] : { nombre: "asc" }
    })

    return NextResponse.json(formas)
  } catch (error) {
    console.error("Error fetching formas farmaceuticas:", error)
    return NextResponse.json({ error: "Error fetching formas farmaceuticas" }, { status: 500 })
  }
}

// POST /api/formas-farmaceuticas (ADMIN)
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
    const { nombre, descripcion, activo, orden } = body

    if (!nombre || nombre.trim() === "") {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })
    }

    const existe = await prisma.formaFarmaceutica.findUnique({
      where: { nombre: nombre.trim() }
    })

    if (existe) {
      return NextResponse.json({ error: "Ya existe una forma farmacéutica con ese nombre" }, { status: 400 })
    }

    const nuevaForma = await prisma.formaFarmaceutica.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        activo: activo !== undefined ? Boolean(activo) : true,
        orden: orden !== undefined ? Number(orden) : 0,
      }
    })

    // Registrar en auditoría
    registrarLog({
      accion: "CREAR_FORMA_FARMACEUTICA",
      entidad: "FormaFarmaceutica",
      entidadId: nuevaForma.id,
      idUsuario: user.id,
      detalles: { nombre: nuevaForma.nombre },
    })

    return NextResponse.json(nuevaForma, { status: 201 })
  } catch (error) {
    console.error("Error creating forma farmaceutica:", error)
    return NextResponse.json({ error: "Error al crear la forma farmacéutica" }, { status: 500 })
  }
}
