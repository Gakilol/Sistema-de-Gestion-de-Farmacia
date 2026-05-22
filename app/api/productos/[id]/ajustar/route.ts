import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { registrarLog } from "@/lib/audit"
import { z } from "zod"

const ajusteSchema = z.object({
  nuevoStock: z.number().int().min(0, "El stock no puede ser negativo"),
  motivo: z.string().min(3, "El motivo es requerido (mínimo 3 caracteres)"),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params
    const body = await request.json()
    const parsed = ajusteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      )
    }

    const { nuevoStock, motivo } = parsed.data
    const idProducto = Number.parseInt(id)

    // Obtener stock actual para log
    const productoActual = await prisma.producto.findUnique({
      where: { id: idProducto },
    })
    if (!productoActual) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    const stockAnterior = productoActual.stockActual

    // Llamar al procedimiento almacenado de PostgreSQL
    await prisma.$executeRaw`CALL sp_ajuste_inventario(${idProducto}, ${nuevoStock}, ${motivo})`

    // Retornar el producto actualizado (refrescar desde DB)
    const productoActualizado = await prisma.producto.findUnique({
      where: { id: idProducto },
      include: { categoria: true },
    })

    // Registrar auditoría de ajuste de stock
    registrarLog({
      accion: "AJUSTE_STOCK",
      entidad: "Producto",
      entidadId: idProducto,
      idUsuario: user.id,
      detalles: {
        nombre: productoActual.nombre,
        stockAnterior,
        nuevoStock,
        diferencia: nuevoStock - stockAnterior,
        motivo,
      },
    })

    return NextResponse.json({
      success: true,
      producto: productoActualizado,
      stockAnterior,
      nuevoStock,
      diferencia: nuevoStock - stockAnterior,
      motivo,
    })
  } catch (error) {
    console.error("Error ajustando stock:", error)
    return NextResponse.json({ error: "Error al ajustar el stock" }, { status: 500 })
  }
}
