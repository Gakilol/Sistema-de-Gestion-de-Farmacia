"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, TrendingUp, ShoppingCart, Package } from "lucide-react"
import useSWR from "swr"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"


interface DashboardData {
  ventasHoy: number
  totalVentasHoy: number
  productosBajoStock: Array<{
    id: number
    nombre: string
    stockActual: number
    stockMinimo: number | null
  }>
}

type Periodo = "diario" | "semanal" | "quincenal" | "mensual"

export default function Dashboard() {
  const router = useRouter()
  const [periodo, setPeriodo] = useState<Periodo>("diario")

  const { data: dashboardData, isLoading: loading } = useSWR(["dashboard", periodo], async ([_, p]) => {
    // Calcular fechas para el periodo
    const hoy = new Date()
    let startDate = new Date()
    
    switch (p) {
      case "diario":
        startDate.setDate(hoy.getDate())
        break
      case "semanal":
        startDate.setDate(hoy.getDate() - 7)
        break
      case "quincenal":
        startDate.setDate(hoy.getDate() - 15)
        break
      case "mensual":
        startDate.setDate(hoy.getDate() - 30)
        break
    }

    const startDateStr = startDate.toISOString().split("T")[0]
    
    // Ventas
    const resVentas = await fetch("/api/ventas?startDate=" + startDateStr)
    const ventas = await resVentas.json()

    // Productos
    const resProductos = await fetch("/api/productos")
    const productos = await resProductos.json()

    const ventasPeriodoCount = ventas.length

    // Calcular Ventas del Periodo
    const totalVentasPeriodo = ventas.reduce((sum: number, v: any) => sum + Number.parseFloat(v.total), 0)

    const productosBajoStock = Array.isArray(productos) 
      ? productos.filter((p: any) => p.stockMinimo && p.stockActual <= p.stockMinimo)
      : []

    // Agrupar datos para la gráfica por fecha
    const salesByDate: Record<string, number> = {}
    ventas.forEach((v: any) => {
       const d = new Date(v.fecha).toISOString().split("T")[0]
       if (!salesByDate[d]) salesByDate[d] = 0
       salesByDate[d] += Number.parseFloat(v.total)
    })

    const formattedChartData = Object.keys(salesByDate).sort().map(date => {
       const [y, m, d] = date.split("-")
       return {
         name: `${d}/${m}`,
         total: salesByDate[date],
       }
    })

    return {
      data: {
        ventasHoy: ventasPeriodoCount,
        totalVentasHoy: totalVentasPeriodo,
        productosBajoStock,
      },
      chartData: formattedChartData,
      userInfo: {
        name: "Administrador",
        role: "ADMIN",
      }
    }
  })

  const { data, chartData, userInfo } = dashboardData || { 
    data: null, 
    chartData: [], 
    userInfo: { name: "Administrador", role: "ADMIN" } 
  }

  if (loading && !data) {
    return (
      <div className="flex h-screen bg-gray-50/50">
        <Sidebar />
        <main className="flex-1 overflow-auto md:p-8 p-4 pt-16 md:pt-8">
          <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
            <div>
              <Skeleton className="h-10 w-48 mb-2" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Bienvenido al sistema de gestión de farmacia</p>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
              <span className="text-sm font-medium text-gray-700">Ver:</span>
              <select
                className="bg-transparent border-none text-sm font-semibold text-gray-900 focus:ring-0 cursor-pointer outline-none"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value as Periodo)}
              >
                <option value="diario">Hoy</option>
                <option value="semanal">Últimos 7 días</option>
                <option value="quincenal">Últimos 15 días</option>
                <option value="mensual">Últimos 30 días</option>
              </select>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-sm border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Ventas ({periodo === "diario" ? "Hoy" : periodo})
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{data?.ventasHoy || 0}</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-sm border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Total Periodo ({periodo})
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">C${data?.totalVentasHoy.toFixed(2) || "0.00"}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                  <ShoppingCart className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-sm border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Stock Bajo</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{data?.productosBajoStock.length || 0}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                  <Package className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </Card>
          </div>
          
          {/* Chart Card */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-sm border-gray-100 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Gráfico de Ventas</h2>
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} dx={-10} tickFormatter={(value) => `C$${value}`} />
                    <Tooltip 
                      formatter={(value: number) => [`C$${value.toFixed(2)}`, "Ventas"]} 
                      cursor={{fill: '#F3F4F6'}} 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="total" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No hay datos de ventas para el periodo seleccionado.
                </div>
              )}
            </div>
          </Card>

          {/* Productos con stock bajo */}
          {data && data.productosBajoStock.length > 0 && (
            <Card className="p-6 bg-white shadow-sm border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <h2 className="text-lg font-bold text-gray-900">Productos con Stock Bajo</h2>
              </div>
              <div className="space-y-3">
                {data.productosBajoStock.map((producto) => (
                  <div key={producto.id} className="flex items-center justify-between p-4 bg-orange-50/50 hover:bg-orange-50 transition-colors border border-orange-100/50 rounded-xl">
                    <div>
                      <p className="font-semibold text-gray-900">{producto.nombre}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Stock disponible: <span className="font-medium text-orange-600">{producto.stockActual}</span> (Mínimo: {producto.stockMinimo})
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 shadow-sm"
                      onClick={() => {
                        router.push("/compras")
                      }}
                    >
                      Comprar
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
