"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ClipboardList, Package, AlertTriangle, Clock, Search,
  ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle,
  Calendar, Layers, ShieldAlert, TrendingDown
} from "lucide-react"

type Tab = "lotes" | "movimientos" | "alertas"

interface Lote {
  id: number
  codigoLote: string
  fechaVencimiento: string | null
  stockInicial: number
  stockActual: number
  costoCompra: string
  createdAt: string
  producto: { id: number; nombre: string; categoria?: { nombre: string } }
}

interface Movimiento {
  id: number
  tipo: string
  cantidad: number
  stockResultante: number
  costoUnitario: string | null
  referencia: string | null
  createdAt: string
  producto: { nombre: string }
  lote: { codigoLote: string } | null
  usuario: { nombreCompleto: string } | null
}

interface Alerta {
  lotesVencidos: Lote[]
  lotesPorVencer: Lote[]
  productosStockBajo: Array<{ id: number; nombre: string; stockActual: number; stockMinimo: number; categoria: { nombre: string } }>
  resumen: { totalVencidos: number; totalPorVencer: number; totalStockBajo: number }
}

export default function InventarioPage() {
  const [activeTab, setActiveTab] = useState<Tab>("lotes")
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  // Lotes data
  const [lotes, setLotes] = useState<Lote[]>([])
  const [lotesTotal, setLotesTotal] = useState(0)

  // Movimientos data
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [movimientosTotal, setMovimientosTotal] = useState(0)

  // Alertas data
  const [alertas, setAlertas] = useState<Alerta | null>(null)

  const LIMIT = 30

  useEffect(() => {
    setPage(1)
  }, [activeTab])

  useEffect(() => {
    fetchData()
  }, [activeTab, page])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === "lotes") {
        const res = await fetch(`/api/inventario?tab=lotes&page=${page}&limit=${LIMIT}`)
        const data = await res.json()
        setLotes(data.lotes || [])
        setLotesTotal(data.total || 0)
      } else if (activeTab === "movimientos") {
        const res = await fetch(`/api/inventario?tab=movimientos&page=${page}&limit=${LIMIT}`)
        const data = await res.json()
        setMovimientos(data.movimientos || [])
        setMovimientosTotal(data.total || 0)
      } else if (activeTab === "alertas") {
        const res = await fetch(`/api/inventario?tab=alertas`)
        const data = await res.json()
        setAlertas(data)
      }
    } catch (e) {
      console.error("Error fetching inventario:", e)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (d: string | null) => {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("es-NI", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })
  }

  const formatDateTime = (d: string) => {
    return new Date(d).toLocaleString("es-NI", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  const isExpired = (d: string | null) => {
    if (!d) return false
    return new Date(d).getTime() <= new Date().getTime()
  }

  const isNearExpiry = (d: string | null, days: number = 90) => {
    if (!d) return false
    const target = new Date(new Date().getTime() + days * 24 * 60 * 60 * 1000)
    return new Date(d).getTime() <= target.getTime() && !isExpired(d)
  }

  const tipoLabel: Record<string, { label: string; color: string; icon: any }> = {
    ENTRADA_COMPRA: { label: "Compra", color: "text-emerald-500 bg-emerald-500/10", icon: ArrowUpCircle },
    SALIDA_VENTA: { label: "Venta", color: "text-red-400 bg-red-500/10", icon: ArrowDownCircle },
    AJUSTE_POSITIVO: { label: "Ajuste +", color: "text-blue-500 bg-blue-500/10", icon: ArrowUpCircle },
    AJUSTE_NEGATIVO: { label: "Ajuste −", color: "text-orange-500 bg-orange-500/10", icon: ArrowDownCircle },
  }

  const totalPages = Math.ceil(
    (activeTab === "lotes" ? lotesTotal : movimientosTotal) / LIMIT
  )

  const filteredLotes = lotes.filter(l =>
    !search || l.producto.nombre.toLowerCase().includes(search.toLowerCase()) || l.codigoLote.toLowerCase().includes(search.toLowerCase())
  )

  const filteredMovimientos = movimientos.filter(m =>
    !search || m.producto.nombre.toLowerCase().includes(search.toLowerCase()) || (m.referencia || "").toLowerCase().includes(search.toLowerCase())
  )

  const tabs = [
    { id: "lotes" as Tab, label: "Lotes Activos", icon: Layers },
    { id: "movimientos" as Tab, label: "Kardex", icon: ClipboardList },
    { id: "alertas" as Tab, label: "Alertas", icon: ShieldAlert },
  ]

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-primary" />
              Inventario
            </h1>
            <p className="text-muted-foreground mt-1">Control de lotes, movimientos y alertas de stock</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mb-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                    : "text-muted-foreground bg-transparent border-transparent hover:bg-muted/30"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.id === "alertas" && alertas && alertas.resumen.totalVencidos + alertas.resumen.totalStockBajo > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white animate-pulse">
                    {alertas.resumen.totalVencidos + alertas.resumen.totalStockBajo}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search Bar (for lotes & movimientos) */}
          {activeTab !== "alertas" && (
            <div className="relative mb-4 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={activeTab === "lotes" ? "Buscar por producto o lote..." : "Buscar por producto o referencia..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-muted/30 border-border"
              />
            </div>
          )}

          {/* Content */}
          {loading ? (
            <Card className="glass-card p-8">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
              </div>
            </Card>
          ) : (
            <>
              {/* ═══ TAB: LOTES ACTIVOS ═══ */}
              {activeTab === "lotes" && (
                <Card className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30 border-b border-border">
                        <tr>
                          {["Producto", "Lote", "Vencimiento", "Stock", "Costo Uní.", "Ingreso"].map(h => (
                            <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredLotes.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                              No hay lotes activos
                            </td>
                          </tr>
                        ) : filteredLotes.map(lote => (
                          <tr key={lote.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-3.5">
                              <p className="text-sm font-medium text-foreground">{lote.producto.nombre}</p>
                              {lote.producto.categoria && (
                                <p className="text-xs text-muted-foreground">{lote.producto.categoria.nombre}</p>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="px-2 py-1 rounded-md bg-muted/40 text-xs font-mono text-foreground">{lote.codigoLote}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className={`text-sm ${
                                  isExpired(lote.fechaVencimiento) ? "text-red-500 font-semibold" :
                                  isNearExpiry(lote.fechaVencimiento) ? "text-amber-500 font-medium" :
                                  "text-foreground"
                                }`}>
                                  {formatDate(lote.fechaVencimiento)}
                                </span>
                                {isExpired(lote.fechaVencimiento) && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-bold">VENCIDO</span>
                                )}
                                {isNearExpiry(lote.fechaVencimiento) && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold">PRONTO</span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm font-semibold text-foreground">{lote.stockActual}</span>
                              <span className="text-xs text-muted-foreground"> / {lote.stockInicial}</span>
                            </td>
                            <td className="px-5 py-3.5 text-sm text-foreground">
                              C${Number(lote.costoCompra).toFixed(2)}
                            </td>
                            <td className="px-5 py-3.5 text-xs text-muted-foreground">
                              {formatDate(lote.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/10">
                      <span className="text-xs text-muted-foreground">Página {page} de {totalPages} ({lotesTotal} lotes)</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* ═══ TAB: KARDEX (MOVIMIENTOS) ═══ */}
              {activeTab === "movimientos" && (
                <Card className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30 border-b border-border">
                        <tr>
                          {["Fecha", "Producto", "Tipo", "Cantidad", "Stock Resultante", "Lote", "Referencia", "Usuario"].map(h => (
                            <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredMovimientos.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                              <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                              No hay movimientos registrados
                            </td>
                          </tr>
                        ) : filteredMovimientos.map(mov => {
                          const tipo = tipoLabel[mov.tipo] || { label: mov.tipo, color: "text-muted-foreground bg-muted/20", icon: Clock }
                          const isEntrada = mov.tipo.includes("ENTRADA") || mov.tipo.includes("POSITIVO")
                          return (
                            <tr key={mov.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(mov.createdAt)}</td>
                              <td className="px-4 py-3 text-sm font-medium text-foreground">{mov.producto.nombre}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${tipo.color}`}>
                                  <tipo.icon className="w-3.5 h-3.5" />
                                  {tipo.label}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-sm font-bold ${isEntrada ? "text-emerald-500" : "text-red-400"}`}>
                                  {isEntrada ? "+" : "−"}{mov.cantidad}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground font-medium">{mov.stockResultante}</td>
                              <td className="px-4 py-3">
                                {mov.lote ? (
                                  <span className="px-2 py-0.5 rounded bg-muted/40 text-xs font-mono text-foreground">{mov.lote.codigoLote}</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{mov.referencia || "—"}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{mov.usuario?.nombreCompleto || "Sistema"}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/10">
                      <span className="text-xs text-muted-foreground">Página {page} de {totalPages} ({movimientosTotal} movimientos)</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* ═══ TAB: ALERTAS ═══ */}
              {activeTab === "alertas" && alertas && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="glass-card p-5 border-l-4 border-l-red-500">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Lotes Vencidos</p>
                          <p className="text-3xl font-bold text-red-500 mt-1">{alertas.resumen.totalVencidos}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-red-500/10">
                          <AlertTriangle className="w-6 h-6 text-red-500" />
                        </div>
                      </div>
                    </Card>
                    <Card className="glass-card p-5 border-l-4 border-l-amber-500">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Por Vencer (90 días)</p>
                          <p className="text-3xl font-bold text-amber-500 mt-1">{alertas.resumen.totalPorVencer}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/10">
                          <Clock className="w-6 h-6 text-amber-500" />
                        </div>
                      </div>
                    </Card>
                    <Card className="glass-card p-5 border-l-4 border-l-orange-500">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Stock Bajo</p>
                          <p className="text-3xl font-bold text-orange-500 mt-1">{alertas.resumen.totalStockBajo}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-orange-500/10">
                          <TrendingDown className="w-6 h-6 text-orange-500" />
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Expired Batches */}
                  {alertas.lotesVencidos.length > 0 && (
                    <Card className="glass-card overflow-hidden">
                      <div className="px-5 py-4 border-b border-border bg-red-500/5">
                        <h3 className="text-sm font-bold text-red-500 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Lotes Vencidos — Requieren Acción Inmediata
                        </h3>
                      </div>
                      <div className="divide-y divide-border">
                        {alertas.lotesVencidos.map(lote => (
                          <div key={lote.id} className="px-5 py-3 flex items-center justify-between hover:bg-red-500/5 transition-colors">
                            <div>
                              <p className="text-sm font-medium text-foreground">{lote.producto.nombre}</p>
                              <p className="text-xs text-muted-foreground">Lote: {lote.codigoLote} — Venció: {formatDate(lote.fechaVencimiento)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-red-500">{lote.stockActual} uds</p>
                              <p className="text-xs text-muted-foreground">en stock</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Near Expiry */}
                  {alertas.lotesPorVencer.length > 0 && (
                    <Card className="glass-card overflow-hidden">
                      <div className="px-5 py-4 border-b border-border bg-amber-500/5">
                        <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Lotes Por Vencer (próximos 90 días)
                        </h3>
                      </div>
                      <div className="divide-y divide-border">
                        {alertas.lotesPorVencer.map(lote => {
                          const daysLeft = lote.fechaVencimiento
                            ? Math.ceil((new Date(lote.fechaVencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                            : null
                          return (
                            <div key={lote.id} className="px-5 py-3 flex items-center justify-between hover:bg-amber-500/5 transition-colors">
                              <div>
                                <p className="text-sm font-medium text-foreground">{lote.producto.nombre}</p>
                                <p className="text-xs text-muted-foreground">Lote: {lote.codigoLote} — Vence: {formatDate(lote.fechaVencimiento)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-amber-500">{daysLeft} días</p>
                                <p className="text-xs text-muted-foreground">{lote.stockActual} uds</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  )}

                  {/* Low Stock */}
                  {alertas.productosStockBajo.length > 0 && (
                    <Card className="glass-card overflow-hidden">
                      <div className="px-5 py-4 border-b border-border bg-orange-500/5">
                        <h3 className="text-sm font-bold text-orange-500 flex items-center gap-2">
                          <TrendingDown className="w-4 h-4" />
                          Productos con Stock Bajo
                        </h3>
                      </div>
                      <div className="divide-y divide-border">
                        {alertas.productosStockBajo.map(p => (
                          <div key={p.id} className="px-5 py-3 flex items-center justify-between hover:bg-orange-500/5 transition-colors">
                            <div>
                              <p className="text-sm font-medium text-foreground">{p.nombre}</p>
                              <p className="text-xs text-muted-foreground">{p.categoria.nombre}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-orange-500">{p.stockActual} / {p.stockMinimo}</p>
                              <p className="text-xs text-muted-foreground">actual / mínimo</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* No alerts */}
                  {alertas.resumen.totalVencidos === 0 && alertas.resumen.totalPorVencer === 0 && alertas.resumen.totalStockBajo === 0 && (
                    <Card className="glass-card p-12 text-center">
                      <div className="p-4 rounded-full bg-emerald-500/10 w-fit mx-auto mb-4">
                        <Package className="w-10 h-10 text-emerald-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">¡Todo en orden!</h3>
                      <p className="text-sm text-muted-foreground mt-1">No hay alertas de inventario pendientes.</p>
                    </Card>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
