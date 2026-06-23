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

    // Execute within a transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      const productoActual = await tx.producto.findUnique({
        where: { id: idProducto },
      })
      if (!productoActual) {
        throw new Error("Producto no encontrado")
      }

      const stockAnterior = productoActual.stockActual
      const diferencia = nuevoStock - stockAnterior

      if (diferencia === 0) {
        return { stockAnterior, nuevoStock, diferencia: 0, producto: productoActual }
      }

      if (diferencia > 0) {
        // INCREASE: Create an adjustment batch and log AJUSTE_POSITIVO
        const loteAjuste = await tx.lote.create({
          data: {
            idProducto,
            codigoLote: `AJUSTE-${Date.now()}`,
            stockInicial: diferencia,
            stockActual: diferencia,
            costoCompra: productoActual.precioCompra,
            activo: true,
          },
        })

        await tx.movimientoInventario.create({
          data: {
            idProducto,
            idLote: loteAjuste.id,
            tipo: "AJUSTE_POSITIVO",
            cantidad: diferencia,
            stockResultante: nuevoStock,
            costoUnitario: productoActual.precioCompra,
            referencia: `Ajuste: ${motivo}`,
            idUsuario: user.id,
          },
        })
      } else {
        // DECREASE: Deduct via FIFO across active batches
        let pendiente = Math.abs(diferencia)
        const lotes = await tx.lote.findMany({
          where: { idProducto, activo: true, stockActual: { gt: 0 } },
          orderBy: { fechaVencimiento: "asc" },
        })

        for (const lote of lotes) {
          if (pendiente <= 0) break

          const deducir = Math.min(pendiente, lote.stockActual)
          await tx.lote.update({
            where: { id: lote.id },
            data: {
              stockActual: { decrement: deducir },
              activo: lote.stockActual - deducir > 0,
            },
          })

          await tx.movimientoInventario.create({
            data: {
              idProducto,
              idLote: lote.id,
              tipo: "AJUSTE_NEGATIVO",
              cantidad: deducir,
              stockResultante: nuevoStock,
              costoUnitario: lote.costoCompra,
              referencia: `Ajuste: ${motivo}`,
              idUsuario: user.id,
            },
          })

          pendiente -= deducir
        }

        // If we couldn't deduct everything from batches, log the remainder
        if (pendiente > 0) {
          await tx.movimientoInventario.create({
            data: {
              idProducto,
              tipo: "AJUSTE_NEGATIVO",
              cantidad: pendiente,
              stockResultante: nuevoStock,
              referencia: `Ajuste (sin lote): ${motivo}`,
              idUsuario: user.id,
            },
          })
        }
      }

      // Update product stock
      const productoActualizado = await tx.producto.update({
        where: { id: idProducto },
        data: { stockActual: nuevoStock },
        include: { categoria: true },
      })

      return { stockAnterior, nuevoStock, diferencia, producto: productoActualizado }
    }, {
      maxWait: 10000,
      timeout: 20000,
    })

    // Registrar auditoría
    registrarLog({
      accion: "AJUSTE_STOCK",
      entidad: "Producto",
      entidadId: idProducto,
      idUsuario: user.id,
      detalles: {
        nombre: result.producto.nombre,
        stockAnterior: result.stockAnterior,
        nuevoStock: result.nuevoStock,
        diferencia: result.diferencia,
        motivo,
      },
    })

    return NextResponse.json({
      success: true,
      producto: result.producto,
      stockAnterior: result.stockAnterior,
      nuevoStock: result.nuevoStock,
      diferencia: result.diferencia,
      motivo,
    })
  } catch (error: any) {
    console.error("Error ajustando stock:", error)
    return NextResponse.json({ error: error.message || "Error al ajustar el stock" }, { status: 500 })
  }
}
