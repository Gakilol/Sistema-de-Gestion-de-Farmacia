import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const whereClause: any = {}

    if (startDate && endDate) {
      whereClause.fecha = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const compras = await prisma.compra.findMany({
      where: whereClause,
      include: {
        proveedor: true,
        usuario: { include: { rol: true } },
        detalles: {
          include: { producto: true },
        },
      },
      orderBy: { fecha: "desc" },
    })

    return NextResponse.json(compras)
  } catch (error) {
    console.error("Error fetching compras:", error)
    return NextResponse.json({ error: "Error fetching compras" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { compraSchema } = require('@/lib/validations')
    const validation = compraSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message, details: validation.error.errors },
        { status: 400 }
      )
    }

    const { idProveedor, detalles } = validation.data

    // Calcular total y validar stock
    let total = 0
    for (const detalle of detalles) {
      const subtotal = Number.parseFloat(detalle.precioUnitario) * Number.parseInt(detalle.cantidad)
      total += subtotal
    }

    // Crear compra dentro de una transacción
    const compra = await prisma.compra.create({
      data: {
        fecha: new Date(),
        idProveedor,
        idUsuario: user.id,
        total: total,
        detalles: {
          create: detalles.map((d: any) => ({
            idProducto: d.idProducto,
            cantidad: Number.parseInt(d.cantidad),
            precioUnitario: Number.parseFloat(d.precioUnitario),
            subtotal: Number.parseFloat(d.precioUnitario) * Number.parseInt(d.cantidad),
          })),
        },
      },
      include: {
        detalles: { include: { producto: true } },
        proveedor: true,
        usuario: { include: { rol: true } },
      },
    })

    // Actualizar stock de productos
    for (const detalle of detalles) {
      await prisma.producto.update({
        where: { id: detalle.idProducto },
        data: {
          stockActual: {
            increment: Number.parseInt(detalle.cantidad),
          },
        },
      })
    }

    return NextResponse.json(compra, { status: 201 })
  } catch (error) {
    console.error("Error creating compra:", error)
    return NextResponse.json({ error: "Error creating compra" }, { status: 500 })
  }
}
