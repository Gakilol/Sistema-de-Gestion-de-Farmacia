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
    const venta = await prisma.venta.findUnique({
      where: { id: Number.parseInt(id) },
      include: {
        cliente: true,
        usuario: { include: { rol: true } },
        detalles: { include: { producto: true } },
      },
    })

    if (!venta) {
      return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 })
    }

    return NextResponse.json(venta)
  } catch (error) {
    console.error("Error fetching venta:", error)
    return NextResponse.json({ error: "Error fetching venta" }, { status: 500 })
  }
}
