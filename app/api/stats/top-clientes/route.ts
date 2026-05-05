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

    // Query top clientes from ventas
    const topClientes = await prisma.$queryRaw`
      SELECT 
        c."nombreCompleto",
        c.id as "idCliente",
        COUNT(DISTINCT v.id)::int as "totalCompras",
        COALESCE(SUM(v.total), 0)::decimal as "totalGastado"
      FROM "Venta" v
      JOIN "Cliente" c ON c.id = v."idCliente"
      WHERE v.fecha >= ${startDate} AND v."idCliente" IS NOT NULL
      GROUP BY c.id, c."nombreCompleto"
      ORDER BY SUM(v.total) DESC
      LIMIT 5
    `

    return NextResponse.json(topClientes)
  } catch (error) {
    console.error("Error fetching top clientes:", error)
    return NextResponse.json([], { status: 500 })
  }
}
