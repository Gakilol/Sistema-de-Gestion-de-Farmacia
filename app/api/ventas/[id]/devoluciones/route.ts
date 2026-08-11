import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { z } from "zod"

import { registrarLog } from "@/lib/audit"
import { getCurrentUser } from "@/lib/auth"
import { asignarReintegroALotes, factorUnidadVenta, validarCantidadDevolucion } from "@/lib/domain/sale-returns"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  idempotencyKey: z.string().uuid(),
  tipo: z.enum(["DEVOLUCION", "CAMBIO"]),
  motivo: z.enum(["PRODUCTO_INCORRECTO", "DEFECTUOSO", "REACCION_ADVERSA", "ERROR_COBRO", "OTRO"]),
  observacion: z.string().trim().max(500).optional().nullable(),
  reintegrarStock: z.boolean().default(false),
  detalles: z.array(z.object({ idDetalleVenta: z.number().int().positive(), cantidad: z.number().int().positive() })).min(1).max(100),
}).superRefine((data, ctx) => {
  const ids = data.detalles.map((detalle) => detalle.idDetalleVenta)
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: ["detalles"], message: "No repitas artículos en la devolución" })
})

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const devoluciones = await prisma.devolucionVenta.findMany({
    where: { idVenta: Number(id) },
    include: { usuario: { select: { nombreCompleto: true } }, detalles: { include: { detalleVenta: { include: { producto: true } } } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ devoluciones })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!['ADMIN', 'EMPLEADO'].includes(user.rolNombre)) return NextResponse.json({ error: "Sin permiso para gestionar devoluciones" }, { status: 403 })
  const { id } = await params
  const idVenta = Number(id)
  const validation = schema.safeParse(await request.json().catch(() => null))
  if (!Number.isInteger(idVenta) || idVenta <= 0 || !validation.success) {
    return NextResponse.json({ error: validation.success ? "Venta inválida" : validation.error.issues[0]?.message }, { status: 400 })
  }
  if (validation.data.reintegrarStock && user.rolNombre !== "ADMIN") {
    return NextResponse.json({ error: "Solo administración puede autorizar el reintegro al inventario" }, { status: 403 })
  }

  const existente = await prisma.devolucionVenta.findUnique({ where: { idempotencyKey: validation.data.idempotencyKey } })
  if (existente) return NextResponse.json(existente)

  try {
    const devolucion = await prisma.$transaction(async (tx) => {
      const venta = await tx.venta.findUnique({
        where: { id: idVenta },
        include: {
          detalles: { include: { producto: true, lotes: { include: { lote: true }, orderBy: { id: "asc" } } } },
        },
      })
      if (!venta) throw new Error("VENTA_NO_ENCONTRADA")
      if (venta.estado !== "COMPLETADA") throw new Error("VENTA_NO_DEVOLVIBLE")

      const gross = venta.detalles.reduce((sum, detalle) => sum + Number(detalle.subtotal), 0)
      const factorNeto = gross > 0 ? Math.min(1, Number(venta.total) / gross) : 1
      const lineasCreadas: Array<{ idDetalleVenta: number; cantidad: number; cantidadBase: number; monto: number; lotes: Array<{ idLote: number; cantidad: number }> }> = []

      for (const solicitada of validation.data.detalles) {
        const detalle = venta.detalles.find((item) => item.id === solicitada.idDetalleVenta)
        if (!detalle) throw new Error("DETALLE_NO_PERTENECE")
        const previas = await tx.detalleDevolucionVenta.aggregate({ where: { idDetalleVenta: detalle.id }, _sum: { cantidad: true, cantidadBase: true } })
        validarCantidadDevolucion(detalle.cantidad, previas._sum.cantidad || 0, solicitada.cantidad)
        const factor = detalle.producto.esServicio ? 0 : factorUnidadVenta(detalle.tipoUnidad, detalle.producto.unidadesPorBlister, detalle.producto.unidadesPorCaja)
        const cantidadBase = solicitada.cantidad * factor
        const monto = Math.round(Number(detalle.precioUnitario) * solicitada.cantidad * factorNeto * 100) / 100
        const lotesReintegrados: Array<{ idLote: number; cantidad: number }> = []

        if (validation.data.reintegrarStock && !detalle.producto.esServicio) {
          const asignaciones = asignarReintegroALotes(
            detalle.lotes.map((item) => ({ idLote: item.idLote, cantidad: item.cantidad })),
            previas._sum.cantidadBase || 0,
            cantidadBase,
          )
          for (const asignacion of asignaciones) {
            const loteVenta = detalle.lotes.find((item) => item.idLote === asignacion.idLote)!
            if (loteVenta.lote.fechaVencimiento && loteVenta.lote.fechaVencimiento <= new Date()) throw new Error("LOTE_DEVUELTO_VENCIDO")
            const productoActual = await tx.producto.findUnique({ where: { id: detalle.idProducto }, select: { stockActual: true } })
            await tx.lote.update({ where: { id: asignacion.idLote }, data: { stockActual: { increment: asignacion.cantidad }, activo: true } })
            await tx.producto.update({ where: { id: detalle.idProducto }, data: { stockActual: { increment: asignacion.cantidad } } })
            await tx.movimientoInventario.create({
              data: { idProducto: detalle.idProducto, idLote: asignacion.idLote, tipo: "DEVOLUCION_VENTA", cantidad: asignacion.cantidad, stockResultante: (productoActual?.stockActual || 0) + asignacion.cantidad, costoUnitario: loteVenta.lote.costoCompra, referencia: `${validation.data.tipo === "CAMBIO" ? "Cambio" : "Devolución"} de Venta #${venta.id}`, observacion: validation.data.motivo, idUsuario: user.id },
            })
            lotesReintegrados.push(asignacion)
          }
        }
        lineasCreadas.push({ idDetalleVenta: detalle.id, cantidad: solicitada.cantidad, cantidadBase, monto, lotes: lotesReintegrados })
      }

      const total = lineasCreadas.reduce((sum, linea) => sum + linea.monto, 0)
      const creada = await tx.devolucionVenta.create({
        data: {
          idempotencyKey: validation.data.idempotencyKey,
          idVenta,
          tipo: validation.data.tipo,
          motivo: validation.data.motivo,
          observacion: validation.data.observacion || null,
          reintegrarStock: validation.data.reintegrarStock,
          total,
          creditoGenerado: validation.data.tipo === "CAMBIO" ? total : 0,
          idUsuario: user.id,
          detalles: { create: lineasCreadas.map((linea) => ({ ...linea, lotes: linea.lotes })) },
        },
        include: { detalles: { include: { detalleVenta: { include: { producto: true } } } }, usuario: { select: { nombreCompleto: true } } },
      })
      if (validation.data.tipo === "CAMBIO" && venta.idCliente && total > 0) {
        await tx.cliente.update({ where: { id: venta.idCliente }, data: { saldoFavor: { increment: total } } })
        await tx.movimientoFidelizacion.create({ data: { idCliente: venta.idCliente, tipo: "CREDITO_CAMBIO", monto: total, idVenta: venta.id, referencia: `Cambio #${creada.id} de venta #${venta.id}`, idUsuario: user.id } })
      }
      return creada
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 30000 })

    registrarLog({ accion: validation.data.tipo === "CAMBIO" ? "REGISTRAR_CAMBIO_VENTA" : "REGISTRAR_DEVOLUCION_VENTA", entidad: "DevolucionVenta", entidadId: devolucion.id, idUsuario: user.id, detalles: { idVenta, total: Number(devolucion.total), reintegrarStock: devolucion.reintegrarStock } })
    return NextResponse.json(devolucion, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      const messages: Record<string, [string, number]> = {
        VENTA_NO_ENCONTRADA: ["Venta no encontrada", 404],
        VENTA_NO_DEVOLVIBLE: ["La venta anulada no admite devoluciones", 409],
        DETALLE_NO_PERTENECE: ["Uno de los artículos no pertenece a la venta", 400],
        LOTE_DEVUELTO_VENCIDO: ["El lote original ya venció y no puede reintegrarse al inventario", 409],
      }
      if (messages[error.message]) return NextResponse.json({ error: messages[error.message][0] }, { status: messages[error.message][1] })
      if (error.message.includes("devolución") || error.message.includes("asignación")) return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "La venta cambió durante la devolución; actualiza e intenta de nuevo" }, { status: 409 })
    console.error("Error registrando devolución de venta:", error)
    return NextResponse.json({ error: "No se pudo registrar la devolución" }, { status: 500 })
  }
}
