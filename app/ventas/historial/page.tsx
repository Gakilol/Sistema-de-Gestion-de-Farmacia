"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, X, ShoppingCart, Calendar, RefreshCw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentUser } from "@/app/hooks/useCurrentUser"
import { toast } from "sonner"

interface Venta {
  id: number
  fecha: string
  cliente: { nombreCompleto: string } | null
  total: string
  metodoPago: string
  numeroReceta: string | null
  estado: string
  detalles: Array<{ producto: { nombre: string }; cantidad: number; precioUnitario: string }>
}

function getManaguaToday() {
  const now = new Date()
  const managua = new Date(now.getTime() - 6 * 60 * 60 * 1000)
  return managua.toISOString().split("T")[0]
}

export default function HistorialVentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null)
  
  // Date filter states
  const [preset, setPreset] = useState("todos")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  
  const [anulando, setAnulando] = useState(false)

  const { user } = useCurrentUser()
  const isAdmin = user?.rolNombre === "ADMIN"

  const fetchVentas = async (start?: string, end?: string) => {
    setLoading(true)
    try {
      let url = "/api/ventas"
      const params = new URLSearchParams()
      if (start) params.append("startDate", start)
      if (end) params.append("endDate", end)
      if (params.toString()) {
        url += `?${params.toString()}`
      }
      const res = await fetch(url)
      setVentas(await res.json())
    } catch (e) { 
      console.error(e) 
      toast.error("Error al cargar el historial de ventas")
    } finally { 
      setLoading(false) 
    }
  }

  // Effect to fetch when preset or custom dates change
  useEffect(() => {
    const todayStr = getManaguaToday()
    
    if (preset === "todos") {
      setStartDate("")
      setEndDate("")
      fetchVentas()
    } else if (preset === "hoy") {
      setStartDate(todayStr)
      setEndDate(todayStr)
      fetchVentas(todayStr, todayStr)
    } else if (preset === "ayer") {
      const now = new Date()
      const yesterday = new Date(now.getTime() - (6 + 24) * 60 * 60 * 1000)
      const yesterdayStr = yesterday.toISOString().split("T")[0]
      setStartDate(yesterdayStr)
      setEndDate(yesterdayStr)
      fetchVentas(yesterdayStr, yesterdayStr)
    } else if (preset === "semana") {
      const now = new Date()
      const weekAgo = new Date(now.getTime() - (6 + 24 * 6) * 60 * 60 * 1000)
      const weekAgoStr = weekAgo.toISOString().split("T")[0]
      setStartDate(weekAgoStr)
      setEndDate(todayStr)
      fetchVentas(weekAgoStr, todayStr)
    } else if (preset === "mes") {
      const now = new Date()
      const managua = new Date(now.getTime() - 6 * 60 * 60 * 1000)
      const startOfMonthStr = `${managua.toISOString().split("-")[0]}-${managua.toISOString().split("-")[1]}-01`
      setStartDate(startOfMonthStr)
      setEndDate(todayStr)
      fetchVentas(startOfMonthStr, todayStr)
    }
  }, [preset])

  const handleApplyCustomFilter = () => {
    if (preset === "custom" && startDate && endDate) {
      fetchVentas(startDate, endDate)
    }
  }

  const handleAnularVenta = async (id: number) => {
    const ok = window.confirm(`¿Seguro que deseas ANULAR la venta #${id}? Esta acción restablecerá el inventario a los lotes originales de forma permanente y registrará el ajuste en el Kardex.`)
    if (!ok) return

    setAnulando(true)
    try {
      const res = await fetch(`/api/ventas/${id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Error al anular la venta")
        return
      }
      toast.success("Venta anulada correctamente")
      setSelectedVenta(null)
      // Refetch with current settings
      if (preset === "custom") {
        fetchVentas(startDate, endDate)
      } else {
        setPreset("todos")
      }
    } catch (e) {
      toast.error("Error de conexión al anular la venta")
    } finally {
      setAnulando(false)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-primary" />
              Historial de Ventas
            </h1>
            <p className="text-muted-foreground mt-1">Consulta el historial completo de ventas en zona horaria de Nicaragua</p>
          </div>

          <Card className="glass-card p-4 mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  Rango de fecha (Nicaragua)
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "todos", label: "Todos" },
                    { id: "hoy", label: "Hoy" },
                    { id: "ayer", label: "Ayer" },
                    { id: "semana", label: "Últimos 7 días" },
                    { id: "mes", label: "Este mes" },
                    { id: "custom", label: "Personalizado" },
                  ].map((p) => (
                    <Button
                      key={p.id}
                      variant={preset === p.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPreset(p.id)}
                      className="text-xs"
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>

              {preset === "custom" && (
                <div className="flex flex-col sm:flex-row gap-4 items-end bg-muted/20 p-4 rounded-xl border border-border">
                  <div className="flex-1 w-full">
                    <label className="block text-xs text-muted-foreground mb-1">Desde</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs text-muted-foreground mb-1">Hasta</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                  <Button
                    onClick={handleApplyCustomFilter}
                    disabled={!startDate || !endDate}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Filtrar
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Card className="glass-card overflow-hidden mb-6">
            {loading ? (
              <div className="p-8 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      {["ID", "Fecha (Local)", "Cliente", "Items", "Pago", "Total", "Estado", "Ver"].map(h => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ventas.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground text-sm">
                          No se encontraron ventas para el período seleccionado.
                        </td>
                      </tr>
                    ) : (
                      ventas.map(v => (
                        <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold text-primary">#{v.id}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {new Date(v.fecha).toLocaleDateString("es-NI", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-foreground">{v.cliente?.nombreCompleto || "Sin cliente"}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{v.detalles.length}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              {v.metodoPago}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-foreground">C${Number.parseFloat(v.total).toFixed(2)}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              v.estado === "ANULADA"
                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            }`}>
                              {v.estado}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Button size="sm" variant="ghost" onClick={() => setSelectedVenta(v)} className="text-muted-foreground hover:text-foreground">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {selectedVenta && (
            <Card className="glass-card p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Venta #{selectedVenta.id}</h2>
                  <p className="text-muted-foreground text-sm">
                    {new Date(selectedVenta.fecha).toLocaleDateString("es-NI", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedVenta(null)}><X className="w-5 h-5" /></Button>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div><p className="text-xs text-muted-foreground uppercase mb-1">Cliente</p><p className="font-medium text-foreground">{selectedVenta.cliente?.nombreCompleto || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase mb-1">Pago</p><p className="font-medium text-foreground">{selectedVenta.metodoPago}</p></div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Estado</p>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    selectedVenta.estado === "ANULADA"
                      ? "bg-red-500/10 text-red-500 border-red-500/20"
                      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  }`}>
                    {selectedVenta.estado}
                  </span>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-xs text-muted-foreground">Producto</th>
                      <th className="text-right py-2 text-xs text-muted-foreground">Cant</th>
                      <th className="text-right py-2 text-xs text-muted-foreground">Precio</th>
                      <th className="text-right py-2 text-xs text-muted-foreground">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVenta.detalles.map((d, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 text-foreground">{d.producto.nombre}</td>
                        <td className="text-right text-foreground">{d.cantidad}</td>
                        <td className="text-right text-muted-foreground">C${Number.parseFloat(d.precioUnitario).toFixed(2)}</td>
                        <td className="text-right font-medium text-foreground">C${(d.cantidad * Number.parseFloat(d.precioUnitario)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
                  <div>
                    {isAdmin && selectedVenta.estado !== "ANULADA" && (
                      <Button
                        onClick={() => handleAnularVenta(selectedVenta.id)}
                        className="bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm transition-colors"
                        disabled={anulando}
                      >
                        {anulando ? "Anulando..." : "Anular Venta"}
                      </Button>
                    )}
                  </div>
                  <p className="text-lg font-bold">Total: <span className="text-primary">C${Number.parseFloat(selectedVenta.total).toFixed(2)}</span></p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
