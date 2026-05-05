import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get("periodo") || "mensual"

    let days = 30
    switch (periodo) {
      case "diario": days = 1; break
      case "semanal": days = 7; break
      case "quincenal": days = 15; break
      case "mensual": days = 30; break
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Query top productos from the trigger stats table
    const topProductos = await prisma.$queryRaw`
      SELECT 
        p.nombre,
        p.id as "idProducto",
        COALESCE(SUM(dv.cantidad), 0)::int as "totalUnidades",
        COUNT(dv.id)::int as "vecesVendido",
        COALESCE(SUM(dv.subtotal), 0)::decimal as "ingresoTotal"
      FROM "DetalleVenta" dv
      JOIN "Producto" p ON p.id = dv."idProducto"
      JOIN "Venta" v ON v.id = dv."idVenta"
      WHERE v.fecha >= ${startDate}
      GROUP BY p.id, p.nombre
      ORDER BY SUM(dv.cantidad) DESC
      LIMIT 5
    `

    return NextResponse.json(topProductos)
  } catch (error) {
    console.error("Error fetching top productos:", error)
    return NextResponse.json([], { status: 500 })
  }
}
