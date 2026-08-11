import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { z } from "zod"

import { registrarLog } from "@/lib/audit"
import { getCurrentUser } from "@/lib/auth"
import { puedeRecibirOrden, validarRecepcionOrden, type EstadoOrdenCompra } from "@/lib/domain/purchase-orders"
import { prisma } from "@/lib/prisma"

const recepcionSchema = z.object({
  numeroFactura: z.string().trim().max(100).optional().nullable(),
  fechaCompra: z.string().optional().nullable(),
  detalles: z.array(z.object({
    idDetalleOrden: z.number().int().positive(),
    cantidad: z.number().int().positive().max(100000),
    lote: z.string().trim().min(1, "El lote es obligatorio").max(100),
    fechaVencimiento: z.string().trim().min(1, "La fecha de vencimiento es obligatoria"),
  })).min(1).max(100),
}).superRefine((data, ctx) => {
  const ids = data.detalles.map((detalle) => detalle.idDetalleOrden)
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: "custom", path: ["detalles"], message: "No repitas productos en una misma recepción" })
  }
  const inicioHoy = new Date()
  inicioHoy.setHours(0, 0, 0, 0)
  for (const [index, detalle] of data.detalles.entries()) {
    const vencimiento = new Date(`${detalle.fechaVencimiento}T00:00:00`)
    if (Number.isNaN(vencimiento.getTime()) || vencimiento < inicioHoy) {
      ctx.addIssue({ code: "custom", path: ["detalles", index, "fechaVencimiento"], message: "No se pueden recibir lotes vencidos" })
    }
  }
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!['ADMIN', 'EMPLEADO'].includes(user.rolNombre)) {
    return NextResponse.json({ error: "Sin permiso para recibir órdenes" }, { status: 403 })
  }
  const { id } = await params
  const idOrden = Number(id)
  if (!Number.isInteger(idOrden) || idOrden <= 0) return NextResponse.json({ error: "Orden inválida" }, { status: 400 })
  const validation = recepcionSchema.safeParse(await request.json().catch(() => null))
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0]?.message || "Datos inválidos", details: validation.error.issues }, { status: 400 })
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const orden = await tx.ordenCompra.findUnique({
        where: { id: idOrden },
        include: { proveedor: true, detalles: { include: { producto: true } } },
      })
      if (!orden) throw new Error("ORDEN_NO_ENCONTRADA")
      if (!puedeRecibirOrden(orden.estado as EstadoOrdenCompra)) throw new Error("ORDEN_NO_RECIBIBLE")

      const solicitados = new Map(validation.data.detalles.map((detalle) => [detalle.idDetalleOrden, detalle]))
      const avances = validation.data.detalles.map((detalle) => {
        const linea = orden.detalles.find((item) => item.id === detalle.idDetalleOrden)
        if (!linea) throw new Error("DETALLE_NO_PERTENECE")
        return { cantidadSolicitada: linea.cantidadSolicitada, cantidadRecibida: linea.cantidadRecibida, cantidadNueva: detalle.cantidad }
      })
      validarRecepcionOrden(avances)

      const total = orden.detalles.reduce((sum, linea) => {
        const recibido = solicitados.get(linea.id)?.cantidad || 0
        return sum + recibido * Number(linea.costoUnitario)
      }, 0)
      const compra = await tx.compra.create({
        data: {
          fechaCompra: validation.data.fechaCompra ? new Date(`${validation.data.fechaCompra}T12:00:00Z`) : new Date(),
          numeroFactura: validation.data.numeroFactura || null,
          idProveedor: orden.idProveedor,
          idUsuario: user.id,
          idOrdenCompra: orden.id,
          total,
          detalles: {
            create: orden.detalles.flatMap((linea) => {
              const recibido = solicitados.get(linea.id)
              if (!recibido) return []
              return [{
                idProducto: linea.idProducto,
                cantidad: recibido.cantidad,
                precioUnitario: Number(linea.costoUnitario),
                subtotal: recibido.cantidad * Number(linea.costoUnitario),
                lote: recibido.lote,
                fechaVencimiento: new Date(`${recibido.fechaVencimiento}T12:00:00Z`),
              }]
            }),
          },
        },
        include: { proveedor: true, detalles: { include: { producto: true } } },
      })

      for (const detalle of compra.detalles) {
        const costoUnitario = Number(detalle.precioUnitario)
        const cantidad = detalle.cantidad
        const existente = await tx.lote.findUnique({
          where: { idProducto_codigoLote: { idProducto: detalle.idProducto, codigoLote: detalle.lote! } },
        })
        const lote = existente
          ? await tx.lote.update({
              where: { id: existente.id },
              data: { stockInicial: { increment: cantidad }, stockActual: { increment: cantidad }, costoCompra: costoUnitario, idDetalleCompra: detalle.id, activo: true },
            })
          : await tx.lote.create({
              data: { idProducto: detalle.idProducto, codigoLote: detalle.lote!, fechaVencimiento: detalle.fechaVencimiento, stockInicial: cantidad, stockActual: cantidad, costoCompra: costoUnitario, idDetalleCompra: detalle.id },
            })

        const stockAnterior = detalle.producto.stockActual
        const nuevoStock = stockAnterior + cantidad
        const costoPromedio = nuevoStock > 0
          ? ((stockAnterior * Number(detalle.producto.precioCompra)) + (cantidad * costoUnitario)) / nuevoStock
          : costoUnitario
        await tx.producto.update({ where: { id: detalle.idProducto }, data: { stockActual: { increment: cantidad }, precioCompra: Math.round(costoPromedio * 100) / 100 } })
        await tx.proveedorProducto.upsert({
          where: { idProveedor_idProducto: { idProveedor: orden.idProveedor, idProducto: detalle.idProducto } },
          create: { idProveedor: orden.idProveedor, idProducto: detalle.idProducto, precioCompra: costoUnitario },
          update: { precioCompra: costoUnitario },
        })
        await tx.movimientoInventario.create({
          data: { idProducto: detalle.idProducto, idLote: lote.id, tipo: "ENTRADA_COMPRA", cantidad, stockResultante: nuevoStock, costoUnitario, referencia: `Recepción ${orden.codigo} · Compra #${compra.id}`, idUsuario: user.id, observacion: `Entrada por orden de compra. Lote: ${detalle.lote}` },
        })
      }

      for (const recibido of validation.data.detalles) {
        await tx.detalleOrdenCompra.update({ where: { id: recibido.idDetalleOrden }, data: { cantidadRecibida: { increment: recibido.cantidad } } })
      }
      const todosCompletos = orden.detalles.every((linea) => linea.cantidadRecibida + (solicitados.get(linea.id)?.cantidad || 0) === linea.cantidadSolicitada)
      const ordenActualizada = await tx.ordenCompra.update({
        where: { id: orden.id },
        data: { estado: todosCompletos ? "RECIBIDA" : "PARCIAL", recibidaEn: todosCompletos ? new Date() : null },
        include: { proveedor: true, creadoPor: true, aprobadoPor: true, detalles: { include: { producto: true } }, compras: true },
      })
      return { compra, orden: ordenActualizada }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 30000 })

    registrarLog({
      accion: "RECIBIR_ORDEN_COMPRA",
      entidad: "OrdenCompra",
      entidadId: idOrden,
      idUsuario: user.id,
      detalles: { idCompra: resultado.compra.id, estado: resultado.orden.estado, items: validation.data.detalles.length, total: Number(resultado.compra.total) },
    })
    return NextResponse.json(resultado, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ORDEN_NO_ENCONTRADA") return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 })
      if (error.message === "ORDEN_NO_RECIBIBLE") return NextResponse.json({ error: "La orden debe estar aprobada y con saldo pendiente" }, { status: 409 })
      if (error.message === "DETALLE_NO_PERTENECE") return NextResponse.json({ error: "Uno de los productos no pertenece a la orden" }, { status: 400 })
      if (error.message.includes("recepción") || error.message.includes("cantidad")) return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "Otra recepción se procesó al mismo tiempo; actualiza e intenta de nuevo" }, { status: 409 })
    }
    console.error("Error recibiendo orden de compra:", error)
    return NextResponse.json({ error: "No se pudo registrar la recepción" }, { status: 500 })
  }
}
