import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const cliente = await prisma.cliente.findUnique({
      where: { id: Number.parseInt(id) },
    })

    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    return NextResponse.json(cliente)
  } catch (error) {
    console.error("Error fetching cliente:", error)
    return NextResponse.json({ error: "Error fetching cliente" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { nombreCompleto, telefono, correo, cedula, direccion, activo } = await request.json()

    const cliente = await prisma.cliente.update({
      where: { id: Number.parseInt(id) },
      data: {
        nombreCompleto,
        telefono: telefono || null,
        correo: correo || null,
        cedula: cedula || null,
        direccion: direccion || null,
        activo: activo ?? true, // 👈 nuevo
      },
    })

    return NextResponse.json(cliente)
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Cédula ya existe" }, { status: 400 })
    }
    console.error("Error updating cliente:", error)
    return NextResponse.json({ error: "Error updating cliente" }, { status: 500 })
  }
}

// 👇 NUEVO: activar / desactivar
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { activo } = await request.json()

    const cliente = await prisma.cliente.update({
      where: { id: Number.parseInt(id) },
      data: { activo },
    })

    return NextResponse.json(cliente)
  } catch (error) {
    console.error("Error patching cliente:", error)
    return NextResponse.json({ error: "Error patching cliente" }, { status: 500 })
  }
}
