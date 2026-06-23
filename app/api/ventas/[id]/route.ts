import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { registrarLog } from "@/lib/audit"

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

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const ventaId = Number.parseInt(id)
    if (isNaN(ventaId)) {
      return NextResponse.json({ error: "ID de venta inválido" }, { status: 400 })
    }

    // Ejecutar en una transacción para que sea atómico
    let ventaAnulada: any = null
    let attempts = 0
    const maxAttempts = 3
    let delayMs = 300

    while (attempts < maxAttempts) {
      try {
        ventaAnulada = await prisma.$transaction(async (tx: any) => {
          const venta = await tx.venta.findUnique({
            where: { id: ventaId },
            include: { detalles: true }
          })

          if (!venta) {
            throw new Error("Venta no encontrada")
          }

          if (venta.estado === "ANULADA") {
            // Idempotencia: Si ya fue anulada, devolvemos la venta sin realizar cambios
            return venta
          }

          // 1. Encontrar todos los movimientos de salida correspondientes a esta venta
          const movimientosSalida = await tx.movimientoInventario.findMany({
            where: {
              referencia: { startsWith: `Venta #${ventaId}` },
              tipo: "SALIDA_VENTA"
            }
          })

          // 2. Por cada movimiento, devolver la cantidad al stock del Lote y del Producto
          for (const mov of movimientosSalida) {
            if (mov.idLote) {
              // Devolver stock al lote
              await tx.lote.update({
                where: { id: mov.idLote },
                data: {
                  stockActual: { increment: mov.cantidad },
                  activo: true // Reactivar el lote si estaba agotado
                }
              })
            }

            // Devolver stock al producto
            await tx.producto.update({
              where: { id: mov.idProducto },
              data: {
                stockActual: { increment: mov.cantidad }
              }
            })

            // Obtener el stock actualizado del producto para el Kardex
            const prod = await tx.producto.findUnique({
              where: { id: mov.idProducto },
              select: { stockActual: true }
            })

            // Crear movimiento de entrada para registrar la devolución en el Kardex
            await tx.movimientoInventario.create({
              data: {
                idProducto: mov.idProducto,
                idLote: mov.idLote,
                tipo: "AJUSTE_POSITIVO",
                cantidad: mov.cantidad,
                stockResultante: prod?.stockActual || 0,
                costoUnitario: mov.costoUnitario,
                referencia: `Anulación de Venta #${ventaId}`,
                idUsuario: user.id
              }
            })
          }

          // Si hay detalles que por algún motivo no tuvieron movimiento registrado, hacemos un fallback seguro (no debería ocurrir)
          const productosConMovimiento = new Set(movimientosSalida.map((m: any) => m.idProducto))
          for (const detalle of venta.detalles) {
            if (!productosConMovimiento.has(detalle.idProducto)) {
              // Devolver stock al producto
              await tx.producto.update({
                where: { id: detalle.idProducto },
                data: {
                  stockActual: { increment: detalle.cantidad }
                }
              })

              const prod = await tx.producto.findUnique({
                where: { id: detalle.idProducto },
                select: { stockActual: true }
              })

              await tx.movimientoInventario.create({
                data: {
                  idProducto: detalle.idProducto,
                  tipo: "AJUSTE_POSITIVO",
                  cantidad: detalle.cantidad,
                  stockResultante: prod?.stockActual || 0,
                  referencia: `Anulación de Venta #${ventaId} (fallback)`,
                  idUsuario: user.id
                }
              })
            }
          }

          // 3. Cambiar estado de la venta a ANULADA
          const ventaActualizada = await tx.venta.update({
            where: { id: ventaId },
            data: { estado: "ANULADA" },
            include: { detalles: { include: { producto: true } } }
          })

          return ventaActualizada
        }, {
          maxWait: 10000,
          timeout: 20000,
        })
        
        break // Éxito, salir del loop
      } catch (error: any) {
        attempts++
        const isTransient = 
          error.code === "P2034" || 
          error.code === "P2028" ||
          error.message?.includes("Transaction not found") ||
          error.message?.includes("deadlock") ||
          error.message?.includes("lock timeout") ||
          error.message?.includes("serialization")
        
        if (isTransient && attempts < maxAttempts) {
          console.warn(`[Anulación] Conflicto transitorio. Reintentando ${attempts}/${maxAttempts} en ${delayMs}ms. Error: ${error.message}`)
          await new Promise(resolve => setTimeout(resolve, delayMs))
          delayMs *= 2
        } else {
          throw error
        }
      }
    }

    // Registrar log auditoría Next.js
    registrarLog({
      accion: "ANULAR_VENTA",
      entidad: "Venta",
      entidadId: ventaId,
      idUsuario: user.id,
      detalles: {
        total: Number(ventaAnulada.total),
        items: ventaAnulada.detalles.length,
        clienteId: ventaAnulada.idCliente
      }
    })

    return NextResponse.json({ success: true, venta: ventaAnulada })
  } catch (error: any) {
    console.error("Error al anular venta:", error)
    const errorMsg = error.message || ""
    
    if (errorMsg.includes("Venta no encontrada")) {
      return NextResponse.json({ error: errorMsg }, { status: 404 })
    }
    
    if (error.code === "P2028" || errorMsg.includes("Transaction not found") || errorMsg.includes("timeout")) {
      return NextResponse.json({
        error: "La transacción de anulación de venta expiró por sobrecarga. Por favor, reintente."
      }, { status: 503 })
    }
    
    if (error.code === "P2034" || errorMsg.includes("deadlock") || errorMsg.includes("serialization") || errorMsg.includes("conflict")) {
      return NextResponse.json({
        error: "Conflicto de concurrencia detectado al anular la venta. Por favor, reintente."
      }, { status: 409 })
    }

    return NextResponse.json({ error: "Error al anular la venta" }, { status: 500 })
  }
}
