"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, TrendingUp, ShoppingCart, Package, Trophy, Users, Crown } from "lucide-react"
import useSWR from "swr"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

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

const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32", "#94a3b8", "#64748b"]
const medalEmojis = ["🥇", "🥈", "🥉", "4°", "5°"]
const barColors = ["#34d399", "#22d3ee", "#a78bfa", "#fbbf24", "#fb7185"]

export default function Dashboard() {
  const router = useRouter()
  const [periodo, setPeriodo] = useState<Periodo>("semanal")

  const { data: dashboardData, isLoading: loading } = useSWR(["dashboard", periodo], async ([_, p]) => {
    const hoy = new Date()
    let startDate = new Date()

    switch (p) {
      case "diario": startDate.setDate(hoy.getDate()); break
      case "semanal": startDate.setDate(hoy.getDate() - 7); break
      case "quincenal": startDate.setDate(hoy.getDate() - 15); break
      case "mensual": startDate.setDate(hoy.getDate() - 30); break
    }

    const startDateStr = startDate.toISOString().split("T")[0]

    const [resVentas, resProductos, resTopProductos, resTopClientes] = await Promise.all([
      fetch("/api/ventas?startDate=" + startDateStr),
      fetch("/api/productos"),
      fetch("/api/stats/top-productos?periodo=" + p),
      fetch("/api/stats/top-clientes?periodo=" + p),
    ])

    const ventas = await resVentas.json()
    const productos = await resProductos.json()
    const topProductos = await resTopProductos.json()
    const topClientes = await resTopClientes.json()

    const ventasPeriodoCount = ventas.length
    const totalVentasPeriodo = ventas.reduce((sum: number, v: any) => sum + Number.parseFloat(v.total), 0)

    const productosBajoStock = Array.isArray(productos)
      ? productos.filter((p: any) => p.stockMinimo && p.stockActual <= p.stockMinimo)
      : []

    const salesByDate: Record<string, number> = {}
    ventas.forEach((v: any) => {
      const d = new Date(v.fecha).toISOString().split("T")[0]
      if (!salesByDate[d]) salesByDate[d] = 0
      salesByDate[d] += Number.parseFloat(v.total)
    })

    const formattedChartData = Object.keys(salesByDate).sort().map(date => {
      const [y, m, d] = date.split("-")
      return { name: `${d}/${m}`, total: salesByDate[date] }
    })

    return {
      data: { ventasHoy: ventasPeriodoCount, totalVentasHoy: totalVentasPeriodo, productosBajoStock },
      chartData: formattedChartData,
      topProductos: Array.isArray(topProductos) ? topProductos : [],
      topClientes: Array.isArray(topClientes) ? topClientes : [],
    }
  })

  const { data, chartData, topProductos, topClientes } = dashboardData || {
    data: null,
    chartData: [],
    topProductos: [],
    topClientes: [],
  }

  const periodoLabels: Record<Periodo, string> = {
    diario: "Hoy",
    semanal: "7 días",
    quincenal: "15 días",
    mensual: "30 días",
  }

  if (loading && !data) {
    return (
      <div className="flex h-screen bg-background">
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

  const maxProductoUnidades = topProductos.length > 0 ? Math.max(...topProductos.map((p: any) => Number(p.totalUnidades))) : 1
  const maxClienteGastado = topClientes.length > 0 ? Math.max(...topClientes.map((c: any) => Number(c.totalGastado))) : 1

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">Bienvenido al sistema de gestión de farmacia</p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border">
              {(["diario", "semanal", "quincenal", "mensual"] as Periodo[]).map((p) => (
                <button
                  key={p}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    periodo === p
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setPeriodo(p)}
                >
                  {periodoLabels[p]}
                </button>
              ))}
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="glass-card glow-hover p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Ventas ({periodoLabels[periodo]})
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-2">{data?.ventasHoy || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="glass-card glow-hover p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Ingresos ({periodoLabels[periodo]})
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    C${data?.totalVentasHoy.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <ShoppingCart className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
            </Card>

            <Card className="glass-card glow-hover p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Stock Bajo</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{data?.productosBajoStock.length || 0}</p>
                </div>
                <div className={`p-3 rounded-xl ${
                  (data?.productosBajoStock.length || 0) > 0
                    ? "bg-amber-500/10 border border-amber-500/20"
                    : "bg-emerald-500/10 border border-emerald-500/20"
                }`}>
                  <Package className={`w-6 h-6 ${
                    (data?.productosBajoStock.length || 0) > 0 ? "text-amber-500" : "text-emerald-500"
                  }`} />
                </div>
              </div>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Gráfico de Ventas */}
            <Card className="glass-card p-6">
              <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Gráfico de Ventas
              </h2>
              <div className="h-[280px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} dx={-10} tickFormatter={(value) => `C$${value}`} />
                      <Tooltip
                        formatter={(value: number) => [`C$${value.toFixed(2)}`, "Ventas"]}
                        cursor={{ fill: 'var(--muted)' }}
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid var(--border)',
                          boxShadow: '0 10px 30px -5px rgba(0,0,0,0.3)',
                          backgroundColor: 'var(--card)',
                          color: 'var(--foreground)'
                        }}
                      />
                      <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={35}>
                        {chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No hay datos de ventas para este periodo.
                  </div>
                )}
              </div>
            </Card>

            {/* Top 5 Productos Más Vendidos */}
            <Card className="glass-card p-6">
              <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Top Productos Vendidos
              </h2>
              {topProductos.length > 0 ? (
                <div className="space-y-4">
                  {topProductos.map((producto: any, index: number) => (
                    <div key={producto.idProducto} className="flex items-center gap-3">
                      <span className="text-lg w-8 text-center">{medalEmojis[index]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-foreground truncate">{producto.nombre}</p>
                          <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                            {Number(producto.totalUnidades)} uds
                          </span>
                        </div>
                        <div className="w-full bg-muted/50 rounded-full h-2">
                          <div
                            className="h-2 rounded-full progress-bar"
                            style={{
                              width: `${(Number(producto.totalUnidades) / maxProductoUnidades) * 100}%`,
                              backgroundColor: barColors[index],
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  Aún no hay datos de ventas para este periodo.
                </div>
              )}
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top 5 Compradores */}
            <Card className="glass-card p-6">
              <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-500" />
                Top Compradores
              </h2>
              {topClientes.length > 0 ? (
                <div className="space-y-4">
                  {topClientes.map((cliente: any, index: number) => {
                    const initials = cliente.nombreCompleto
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()
                    return (
                      <div key={cliente.idCliente} className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${barColors[index]}, ${barColors[(index + 1) % barColors.length]})`,
                          }}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-foreground truncate">{cliente.nombreCompleto}</p>
                            <span className="text-xs font-semibold text-primary ml-2 whitespace-nowrap">
                              C${Number(cliente.totalGastado).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted/50 rounded-full h-2">
                              <div
                                className="h-2 rounded-full progress-bar"
                                style={{
                                  width: `${(Number(cliente.totalGastado) / maxClienteGastado) * 100}%`,
                                  background: `linear-gradient(90deg, ${barColors[index]}, ${barColors[(index + 1) % barColors.length]})`,
                                }}
                              />
                            </div>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                              {cliente.totalCompras} compra{cliente.totalCompras !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  No hay datos de clientes para este periodo.
                </div>
              )}
            </Card>

            {/* Productos con stock bajo */}
            <Card className="glass-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <AlertCircle className={`w-5 h-5 ${
                  (data?.productosBajoStock.length || 0) > 0 ? "text-amber-500" : "text-emerald-500"
                }`} />
                <h2 className="text-lg font-bold text-foreground">Alertas de Stock</h2>
              </div>
              {data && data.productosBajoStock.length > 0 ? (
                <div className="space-y-3">
                  {data.productosBajoStock.map((producto) => (
                    <div
                      key={producto.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-foreground text-sm">{producto.nombre}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Stock: <span className="font-semibold text-amber-500">{producto.stockActual}</span> / Mín: {producto.stockMinimo}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                        onClick={() => router.push("/compras")}
                      >
                        Comprar
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                  <Package className="w-10 h-10 mb-3 text-emerald-500/50" />
                  <p className="text-sm">Todo el inventario está en orden ✓</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
