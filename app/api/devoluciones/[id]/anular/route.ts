import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { registrarLog } from "@/lib/audit"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })

    // Restricción: Solo administradores pueden anular devoluciones
    if (usuarioDb?.rol.nombre !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Solo el administrador puede anular devoluciones" }, { status: 403 })
    }

    const { id } = await params
    const devolucionId = Number.parseInt(id)
    if (isNaN(devolucionId)) {
      return NextResponse.json({ error: "ID de devolución inválido" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { motivoAnulacion } = body

    let devolucionAnulada: any = null

    try {
      devolucionAnulada = await prisma.$transaction(async (tx: any) => {
        // 1. Obtener la devolución y bloquear filas relacionadas
        const dev = await tx.devolucionProveedor.findUnique({
          where: { id: devolucionId }
        })

        if (!dev) {
          throw new Error("NOT_FOUND")
        }

        if (dev.estado === "ANULADA") {
          // Idempotencia: Si ya está anulada, no hacemos nada
          return dev
        }

        // 2. Lock del producto y lote
        await tx.$executeRawUnsafe(
          `SELECT id FROM "Producto" WHERE id = $1 FOR UPDATE`,
          dev.idProducto
        )
        await tx.$executeRawUnsafe(
          `SELECT id FROM "Lote" WHERE id = $1 FOR UPDATE`,
          dev.idLote
        )

        // Cargar lote y producto actualizados bajo bloqueo
        const lote = await tx.lote.findUnique({
          where: { id: dev.idLote },
          include: { producto: true }
        })

        if (!lote) {
          throw new Error("LOTE_NOT_FOUND")
        }

        const nuevoStockProducto = lote.producto.stockActual + dev.cantidad
        const nuevoStockLote = lote.stockActual + dev.cantidad

        // 3. Crear movimiento de entrada compensatorio en Kardex
        await tx.movimientoInventario.create({
          data: {
            idProducto: dev.idProducto,
            idLote: dev.idLote,
            tipo: "AJUSTE_POSITIVO", // Entrada compensatoria
            cantidad: dev.cantidad,
            stockResultante: nuevoStockProducto,
            costoUnitario: lote.costoCompra,
            referencia: `Anulación Devolución #${dev.id}`,
            idUsuario: user.id,
            observacion: `Reversión de devolución. Motivo anulación: ${motivoAnulacion || "No especificado"}`
          }
        })

        // 4. Devolver stock al Lote y Producto
        await tx.lote.update({
          where: { id: dev.idLote },
          data: {
            stockActual: nuevoStockLote,
            activo: true // Reactivar el lote si estaba inactivo
          }
        })

        await tx.producto.update({
          where: { id: dev.idProducto },
          data: {
            stockActual: nuevoStockProducto
          }
        })

        // 5. Actualizar estado de la devolución
        const devActualizada = await tx.devolucionProveedor.update({
          where: { id: devolucionId },
          data: {
            estado: "ANULADA",
            motivoAnulacion: motivoAnulacion || "Anulado por administrador",
          },
          include: {
            producto: true,
            lote: true,
            usuario: { include: { rol: true } }
          }
        })

        return devActualizada
      }, {
        maxWait: 10000,
        timeout: 15000,
      })

    } catch (txError: any) {
      if (txError.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Devolución no encontrada" }, { status: 404 })
      }
      if (txError.message === "LOTE_NOT_FOUND") {
        return NextResponse.json({ error: "Lote asociado a la devolución no encontrado" }, { status: 404 })
      }
      throw txError
    }

    // Registrar log auditoría Next.js
    registrarLog({
      accion: "ANULAR_DEVOLUCION",
      entidad: "DevolucionProveedor",
      entidadId: devolucionAnulada.id,
      idUsuario: user.id,
      detalles: {
        idProducto: devolucionAnulada.idProducto,
        lote: devolucionAnulada.lote.codigoLote,
        cantidad: devolucionAnulada.cantidad,
        motivoAnulacion: devolucionAnulada.motivoAnulacion
      }
    })

    return NextResponse.json({ success: true, devolucion: devolucionAnulada })
  } catch (error: any) {
    console.error("Error anular devolucion:", error)
    return NextResponse.json({ error: "Ocurrió un error inesperado al anular la devolución." }, { status: 500 })
  }
}
