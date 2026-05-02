import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const estado = searchParams.get("estado") ?? "activos" // 👈 nuevo

    const baseWhere = {
      OR: [
        { nombreCompleto: { contains: search, mode: "insensitive" } },
        { cedula: { contains: search, mode: "insensitive" } },
      ],
    }

    const where: any = { ...baseWhere }

    if (estado === "activos") {
      where.activo = true
    } else if (estado === "inactivos") {
      where.activo = false
    }
    // "todos" => no filtramos por activo

    const clientes = await prisma.cliente.findMany({
      where,
      orderBy: { nombreCompleto: "asc" },
    })

    return NextResponse.json(clientes)
  } catch (error) {
    console.error("Error fetching clientes:", error)
    return NextResponse.json({ error: "Error fetching clientes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { nombreCompleto, telefono, correo, cedula, direccion } = await request.json()

    if (!nombreCompleto) {
      return NextResponse.json({ error: "Nombre completo es requerido" }, { status: 400 })
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombreCompleto,
        telefono: telefono || null,
        correo: correo || null,
        cedula: cedula || null,
        direccion: direccion || null,
        activo: true, // 👈 nuevo
      },
    })

    return NextResponse.json(cliente, { status: 201 })
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Cédula ya existe" }, { status: 400 })
    }
    console.error("Error creating cliente:", error)
    return NextResponse.json({ error: "Error creating cliente" }, { status: 500 })
  }
}
