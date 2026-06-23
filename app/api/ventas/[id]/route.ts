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
        detalles: {
          include: {
            producto: true,
            lotes: {
              include: {
                lote: true
              }
            }
          }
        },
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
            include: {
              detalles: {
                include: {
                  producto: true,
                  lotes: true
                }
              }
            }
          })

          if (!venta) {
            throw new Error("Venta no encontrada")
          }

          if (venta.estado === "ANULADA") {
            // Idempotencia: Si ya fue anulada, devolvemos la venta sin realizar cambios
            return venta
          }

          // 1. Restaurar stock a partir de DetalleVentaLote
          for (const detalle of venta.detalles) {
            const prod = detalle.producto

            if (prod.esServicio) {
              // Si es servicio, no tiene stock físico ni lotes que restaurar
              continue
            }

            let totalRestauradoProducto = 0

            if (detalle.lotes && detalle.lotes.length > 0) {
              for (const detLote of detalle.lotes) {
                // Devolver stock al lote
                await tx.lote.update({
                  where: { id: detLote.idLote },
                  data: {
                    stockActual: { increment: detLote.cantidad },
                    activo: true // Reactivar el lote si estaba inactivo
                  }
                })

                totalRestauradoProducto += detLote.cantidad

                // Registrar movimiento de entrada en el Kardex
                const dbProduct = await tx.producto.findUnique({
                  where: { id: detalle.idProducto },
                  select: { stockActual: true }
                })
                const stockInicial = dbProduct ? dbProduct.stockActual : prod.stockActual

                await tx.movimientoInventario.create({
                  data: {
                    idProducto: detalle.idProducto,
                    idLote: detLote.idLote,
                    tipo: "AJUSTE_POSITIVO",
                    cantidad: detLote.cantidad,
                    stockResultante: stockInicial + detLote.cantidad,
                    referencia: `Anulación de Venta #${ventaId}`,
                    idUsuario: user.id,
                    observacion: `Retorno de lote por anulación de venta`
                  }
                })
              }
            } else {
              // Fallback para ventas sin desglose de lotes (legacy o fallas excepcionales)
              totalRestauradoProducto = detalle.cantidad
              
              const dbProduct = await tx.producto.findUnique({
                where: { id: detalle.idProducto },
                select: { stockActual: true }
              })
              const stockInicial = dbProduct ? dbProduct.stockActual : prod.stockActual

              await tx.movimientoInventario.create({
                data: {
                  idProducto: detalle.idProducto,
                  tipo: "AJUSTE_POSITIVO",
                  cantidad: detalle.cantidad,
                  stockResultante: stockInicial + detalle.cantidad,
                  referencia: `Anulación de Venta #${ventaId} (fallback)`,
                  idUsuario: user.id,
                  observacion: `Retorno de stock general sin lote`
                }
              })
            }

            // Devolver stock al producto
            await tx.producto.update({
              where: { id: detalle.idProducto },
              data: {
                stockActual: { increment: totalRestauradoProducto }
              }
            })
          }

          // 2. Si hay receta asociada, restaurar cantidades de la receta
          if (venta.numeroReceta) {
            const receta = await tx.receta.findUnique({
              where: { codigoReceta: venta.numeroReceta },
              include: { detalles: true }
            })

            if (receta) {
              for (const detalle of venta.detalles) {
                // Calcular cantidad en unidades base vendidas
                const tipoUnidad = detalle.tipoUnidad || "UNIDAD"
                let cantidadUnidades = detalle.cantidad
                if (tipoUnidad === "BLISTER") {
                  cantidadUnidades = cantidadUnidades * (detalle.producto.unidadesPorBlister || 1)
                } else if (tipoUnidad === "CAJA") {
                  cantidadUnidades = cantidadUnidades * (detalle.producto.unidadesPorCaja || 1)
                }

                const recDet = receta.detalles.find((rd: any) => rd.idProducto === detalle.idProducto)
                if (recDet) {
                  const nuevaCantFacturada = Math.max(0, recDet.cantidadFacturada - cantidadUnidades)
                  await tx.detalleReceta.update({
                    where: { id: recDet.id },
                    data: { cantidadFacturada: nuevaCantFacturada }
                  })
                }
              }

              // Actualizar estado de la receta según el nuevo saldo
              const updatedDetalles = await tx.detalleReceta.findMany({
                where: { idReceta: receta.id }
              })

              const totalPrescribed = updatedDetalles.reduce((acc: number, cur: any) => acc + cur.cantidad, 0)
              const totalFacturado = updatedDetalles.reduce((acc: number, cur: any) => acc + cur.cantidadFacturada, 0)

              let nuevoEstado = "EMITIDA"
              if (totalFacturado >= totalPrescribed) {
                nuevoEstado = "USADA_COMPLETAMENTE"
              } else if (totalFacturado > 0) {
                nuevoEstado = "USADA_PARCIALMENTE"
              }

              await tx.receta.update({
                where: { id: receta.id },
                data: { estado: nuevoEstado }
              })
            }
          }

          // 3. Cambiar estado de la venta a ANULADA
          const ventaActualizada = await tx.venta.update({
            where: { id: ventaId },
            data: { estado: "ANULADA" },
            include: {
              detalles: {
                include: {
                  producto: true
                }
              }
            }
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
