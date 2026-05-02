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
    const compra = await prisma.compra.findUnique({
      where: { id: Number.parseInt(id) },
      include: {
        proveedor: true,
        usuario: { include: { rol: true } },
        detalles: { include: { producto: true } },
      },
    })

    if (!compra) {
      return NextResponse.json({ error: "Compra no encontrada" }, { status: 404 })
    }

    return NextResponse.json(compra)
  } catch (error) {
    console.error("Error fetching compra:", error)
    return NextResponse.json({ error: "Error fetching compra" }, { status: 500 })
  }
}
