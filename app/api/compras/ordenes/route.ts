import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { registrarLog } from "@/lib/audit"
import { getCurrentUser } from "@/lib/auth"
import { agruparSugerenciasPorProveedor } from "@/lib/domain/purchase-orders"
import { prisma } from "@/lib/prisma"

const crearOrdenesSchema = z.object({
  observaciones: z.string().trim().max(500).optional().nullable(),
  lineas: z.array(z.object({
    idProducto: z.number().int().positive(),
    idProveedor: z.number().int().positive(),
    cantidad: z.number().int().positive().max(100000),
    costoUnitario: z.number().nonnegative().max(10000000),
  })).min(1).max(100),
})

const includeOrden = {
  proveedor: { select: { id: true, nombre: true } },
  creadoPor: { select: { id: true, nombreCompleto: true } },
  aprobadoPor: { select: { id: true, nombreCompleto: true } },
  detalles: {
    include: { producto: { select: { id: true, nombre: true, codigoBarras: true } } },
    orderBy: { id: "asc" as const },
  },
  compras: { select: { id: true, fecha: true, numeroFactura: true, total: true }, orderBy: { fecha: "desc" as const } },
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!['ADMIN', 'EMPLEADO'].includes(user.rolNombre)) {
    return NextResponse.json({ error: "Sin permiso para consultar órdenes de compra" }, { status: 403 })
  }

  const estado = request.nextUrl.searchParams.get("estado")
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1))
  const take = 20
  const where = estado && estado !== "TODAS" ? { estado } : {}
  const [ordenes, total] = await Promise.all([
    prisma.ordenCompra.findMany({ where, include: includeOrden, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take }),
    prisma.ordenCompra.count({ where }),
  ])
  return NextResponse.json({ ordenes, total, page, pages: Math.max(1, Math.ceil(total / take)) })
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (user.rolNombre !== "ADMIN") {
    return NextResponse.json({ error: "Solo administración puede crear borradores de orden" }, { status: 403 })
  }

  const validation = crearOrdenesSchema.safeParse(await request.json().catch(() => null))
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0]?.message || "Datos inválidos" }, { status: 400 })
  }

  const grupos = agruparSugerenciasPorProveedor(validation.data.lineas)
  const productIds = [...new Set(validation.data.lineas.map((linea) => linea.idProducto))]
  const supplierIds = [...grupos.keys()]
  const [productos, proveedores] = await Promise.all([
    prisma.producto.findMany({ where: { id: { in: productIds }, activo: true, esServicio: false }, select: { id: true } }),
    prisma.proveedor.findMany({ where: { id: { in: supplierIds }, activo: true }, select: { id: true } }),
  ])
  if (productos.length !== productIds.length || proveedores.length !== supplierIds.length) {
    return NextResponse.json({ error: "Hay productos o proveedores inactivos/no válidos en la selección" }, { status: 400 })
  }

  const ordenes = await prisma.$transaction(async (tx) => {
    const creadas = []
    for (const [idProveedor, lineas] of grupos) {
      const totalEstimado = lineas.reduce((sum, linea) => sum + linea.cantidad * linea.costoUnitario, 0)
      const codigo = `OC-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 6).toUpperCase()}`
      const orden = await tx.ordenCompra.create({
        data: {
          codigo,
          idProveedor,
          idCreadoPor: user.id,
          totalEstimado,
          observaciones: validation.data.observaciones || null,
          detalles: {
            create: lineas.map((linea) => ({
              idProducto: linea.idProducto,
              cantidadSolicitada: linea.cantidad,
              costoUnitario: linea.costoUnitario,
            })),
          },
        },
        include: includeOrden,
      })
      creadas.push(orden)
    }
    return creadas
  })

  for (const orden of ordenes) {
    registrarLog({
      accion: "CREAR_ORDEN_COMPRA",
      entidad: "OrdenCompra",
      entidadId: orden.id,
      idUsuario: user.id,
      detalles: { codigo: orden.codigo, idProveedor: orden.proveedor.id, items: orden.detalles.length },
    })
  }
  return NextResponse.json({ ordenes, totalCreadas: ordenes.length }, { status: 201 })
}
