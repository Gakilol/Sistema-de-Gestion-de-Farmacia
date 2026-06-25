"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { useCurrentUser } from "@/app/hooks/useCurrentUser"
import {
  ClipboardList, Package, AlertTriangle, Clock, Search,
  ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle,
  Calendar, Layers, ShieldAlert, TrendingDown, ChevronDown, ChevronUp,
  LayoutGrid, List, Sliders, RotateCcw, X, Loader2
} from "lucide-react"

type Tab = "lotes" | "movimientos" | "alertas" | "devoluciones"
type ViewMode = "grouped" | "detailed"

interface Lote {
  id: number
  codigoLote: string
  fechaVencimiento: string | null
  stockInicial: number
  stockActual: number
  costoCompra: string
  createdAt: string
  diasRestantes?: number
  clasificacion?: string
  producto: { id: number; nombre: string; stockMinimo?: number; categoria?: { nombre: string }; esServicio?: boolean }
}

interface Movimiento {
  id: number
  tipo: string
  cantidad: number
  stockResultante: number
  costoUnitario: string | null
  referencia: string | null
  observacion: string | null
  createdAt: string
  producto: { nombre: string }
  lote: { codigoLote: string } | null
  usuario: { nombreCompleto: string } | null
}

interface Alerta {
  lotesVencidos: Lote[]
  lotesPorVencer: (Lote & { diasRestantes: number; clasificacion: string })[]
  productosStockBajo: Array<{ id: number; nombre: string; stockActual: number; stockMinimo: number; categoria: { nombre: string } }>
  lotesStockBajo: Lote[]
  resumen: { totalVencidos: number; totalPorVencer: number; totalStockBajo: number; totalLotesStockBajo: number }
}

interface GroupedProducto {
  id: number
  nombre: string
  categoria?: string
  stockTotal: number
  cantidadLotes: number
  proximoVencimiento: string | null
  estadoProducto: string
  lotes: Lote[]
}

export default function InventarioPage() {
  const { user } = useCurrentUser()
  const isAdmin = user?.rolNombre === "ADMIN"

  const [activeTab, setActiveTab] = useState<Tab>("lotes")
  const [viewMode, setViewMode] = useState<ViewMode>("grouped")
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [diasAlerta, setDiasAlerta] = useState<number>(90)

  // Expanded products state for grouped view
  const [expandedProducts, setExpandedProducts] = useState<Record<number, boolean>>({})

  // Lotes data
  const [lotes, setLotes] = useState<Lote[]>([])
  const [lotesTotal, setLotesTotal] = useState(0)

  // Movimientos data
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [movimientosTotal, setMovimientosTotal] = useState(0)

  // Alertas data
  const [alertas, setAlertas] = useState<Alerta | null>(null)

  // Devoluciones data and modal states
  const [devoluciones, setDevoluciones] = useState<any[]>([])
  const [showDevModal, setShowDevModal] = useState(false)
  const [devProductos, setDevProductos] = useState<any[]>([])
  const [devProveedores, setDevProveedores] = useState<any[]>([])
  const [devLotes, setDevLotes] = useState<any[]>([])

  const [selectedProdId, setSelectedProdId] = useState<string>("")
  const [selectedLoteId, setSelectedLoteId] = useState<string>("")
  const [selectedProvId, setSelectedProvId] = useState<string>("")
  const [devCantidad, setDevCantidad] = useState<string>("")
  const [devMotivo, setDevMotivo] = useState<string>("VENCIDO")
  const [devObservacion, setDevObservacion] = useState<string>("")
  const [devSubmitLoading, setDevSubmitLoading] = useState(false)

  const LIMIT = 30

  useEffect(() => {
    setPage(1)
  }, [activeTab])

  useEffect(() => {
    fetchData()
  }, [activeTab, page, diasAlerta])

  // Load product lotes reactively
  useEffect(() => {
    if (selectedProdId) {
      fetch(`/api/productos/${selectedProdId}`)
        .then(res => res.json())
        .then(data => {
          const activeLotes = data.lotes ? data.lotes.filter((l: any) => l.activo && l.stockActual > 0) : []
          setDevLotes(activeLotes)
          setSelectedLoteId("")
          setDevCantidad("")
        })
        .catch(err => {
          console.error("Error loading product lotes:", err)
          setDevLotes([])
        })
    } else {
      setDevLotes([])
      setSelectedLoteId("")
      setDevCantidad("")
    }
  }, [selectedProdId])

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
        const res = await fetch(`/api/inventario?tab=alertas&diasVencimiento=${diasAlerta}`)
        const data = await res.json()
        setAlertas(data)
      } else if (activeTab === "devoluciones") {
        const res = await fetch("/api/devoluciones")
        const data = await res.json()
        setDevoluciones(data || [])
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
    DEVOLUCION: { label: "Devolución Prov.", color: "text-orange-400 bg-orange-500/10", icon: RotateCcw }
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

  const filteredDevoluciones = devoluciones.filter(d =>
    !search || d.producto.nombre.toLowerCase().includes(search.toLowerCase()) || d.lote.codigoLote.toLowerCase().includes(search.toLowerCase())
  )

  // Compute Grouped Products
  const getGroupedProducts = (): GroupedProducto[] => {
    const map = new Map<number, GroupedProducto>()

    for (const lote of filteredLotes) {
      if (lote.producto.esServicio) continue // Ignorar servicios

      const prod = lote.producto
      const existing = map.get(prod.id)

      if (existing) {
        existing.lotes.push(lote)
        existing.stockTotal += lote.stockActual
        existing.cantidadLotes += 1
        if (lote.fechaVencimiento) {
          if (!existing.proximoVencimiento || new Date(lote.fechaVencimiento) < new Date(existing.proximoVencimiento)) {
            existing.proximoVencimiento = lote.fechaVencimiento
          }
        }
      } else {
        map.set(prod.id, {
          id: prod.id,
          nombre: prod.nombre,
          categoria: prod.categoria?.nombre,
          stockTotal: lote.stockActual,
          cantidadLotes: 1,
          proximoVencimiento: lote.fechaVencimiento,
          estadoProducto: "vigente",
          lotes: [lote]
        })
      }
    }

    const ahora = new Date()
    const noventaDias = new Date(ahora.getTime() + 90 * 24 * 60 * 60 * 1000)

    return Array.from(map.values()).map(p => {
      let estadoProducto = "vigente"
      if (p.stockTotal === 0) {
        estadoProducto = "sin_stock"
      } else if (p.proximoVencimiento) {
        const pDate = new Date(p.proximoVencimiento)
        if (pDate <= ahora) {
          estadoProducto = "vencido"
        } else if (pDate <= noventaDias) {
          estadoProducto = "proximo_a_vencer"
        }
      }
      return {
        ...p,
        estadoProducto
      }
    })
  }

  const toggleProductExpand = (productId: number) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }))
  }

  const handleCreateDevolucion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProdId || !selectedLoteId || !devCantidad || !devMotivo) {
      toast.error("Por favor completa los campos obligatorios")
      return
    }
    const cant = parseInt(devCantidad)
    if (isNaN(cant) || cant <= 0) {
      toast.error("La cantidad debe ser mayor a 0")
      return
    }
    const loteObj = devLotes.find(l => l.id === parseInt(selectedLoteId))
    if (loteObj && cant > loteObj.stockActual) {
      toast.error(`La cantidad no puede superar el stock actual del lote (${loteObj.stockActual} und)`)
      return
    }

    setDevSubmitLoading(true)
    const idempotencyKey = `dev-key-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    
    try {
      const res = await fetch("/api/devoluciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey,
          idProducto: parseInt(selectedProdId),
          idLote: parseInt(selectedLoteId),
          idProveedor: selectedProvId ? parseInt(selectedProvId) : null,
          cantidad: cant,
          motivo: devMotivo,
          observacion: devObservacion || null
        })
      })
      
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Error al registrar la devolución")
        return
      }
      
      toast.success("Devolución registrada correctamente")
      setShowDevModal(false)
      setSelectedProdId("")
      setSelectedLoteId("")
      setSelectedProvId("")
      setDevCantidad("")
      setDevMotivo("VENCIDO")
      setDevObservacion("")
      
      fetchData()
    } catch (err) {
      toast.error("Error de red al registrar devolución")
    } finally {
      setDevSubmitLoading(false)
    }
  }

  const handleAnularDevolucion = async (id: number) => {
    const motivo = window.prompt("Ingresa el motivo de anulación de esta devolución:")
    if (motivo === null) return 
    if (!motivo.trim()) {
      toast.error("Debes ingresar un motivo para anular la devolución")
      return
    }

    try {
      const res = await fetch(`/api/devoluciones/${id}/anular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivoAnulacion: motivo.trim() })
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Error al anular la devolución")
        return
      }

      toast.success("Devolución anulada y stock retornado correctamente")
      fetchData()
    } catch (err) {
      toast.error("Error de conexión al anular devolución")
    }
  }

  const tabs = [
    { id: "lotes" as Tab, label: "Lotes Activos", icon: Layers },
    { id: "movimientos" as Tab, label: "Kardex", icon: ClipboardList },
    { id: "alertas" as Tab, label: "Alertas", icon: ShieldAlert },
    { id: "devoluciones" as Tab, label: "Devoluciones", icon: RotateCcw },
  ]

  const groupedProductsData = getGroupedProducts()

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
            <p className="text-muted-foreground mt-1">Control de lotes, movimientos, alertas y devoluciones a laboratorio</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
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
                  {tab.id === "alertas" && alertas && (alertas.resumen.totalVencidos + alertas.resumen.totalStockBajo + alertas.resumen.totalLotesStockBajo) > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white animate-pulse">
                      {alertas.resumen.totalVencidos + alertas.resumen.totalStockBajo + alertas.resumen.totalLotesStockBajo}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Toggle Grouped vs Detailed View for Lotes */}
            {activeTab === "lotes" && (
              <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border">
                <Button
                  size="sm"
                  variant={viewMode === "grouped" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("grouped")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-lg text-xs ${viewMode === "grouped" ? "shadow-sm bg-background text-foreground" : "text-muted-foreground"}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Agrupado
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "detailed" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("detailed")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-lg text-xs ${viewMode === "detailed" ? "shadow-sm bg-background text-foreground" : "text-muted-foreground"}`}
                >
                  <List className="w-3.5 h-3.5" />
                  Detallado
                </Button>
              </div>
            )}
          </div>

          {/* Search Bar */}
          {activeTab !== "alertas" && (
            <div className="relative mb-4 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={
                  activeTab === "lotes" ? "Buscar por producto o lote..." :
                  activeTab === "devoluciones" ? "Buscar devolución por producto o lote..." :
                  "Buscar por producto o referencia..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-muted/30 border-border shadow-inner"
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
                <>
                  {viewMode === "grouped" ? (
                    /* Vista agrupada por producto */
                    <div className="space-y-4">
                      {groupedProductsData.length === 0 ? (
                        <Card className="glass-card p-12 text-center text-muted-foreground">
                          <Package className="w-10 h-10 mx-auto mb-2 opacity-30 animate-bounce" />
                          No hay productos en inventario con lotes activos
                        </Card>
                      ) : (
                        groupedProductsData.map(prod => {
                          const isExpanded = !!expandedProducts[prod.id]
                          return (
                            <Card key={prod.id} className="glass-card overflow-hidden transition-all duration-300">
                              {/* Fila Principal */}
                              <div
                                onClick={() => toggleProductExpand(prod.id)}
                                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-muted/10 transition-colors"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2.5">
                                    <h3 className="text-base font-bold text-foreground">{prod.nombre}</h3>
                                    {prod.categoria && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{prod.categoria}</span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Lotes activos: <strong>{prod.cantidadLotes}</strong></span>
                                    {prod.proximoVencimiento && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" /> 
                                        Próx. vencimiento: 
                                        <strong className={
                                          prod.estadoProducto === "vencido" ? "text-red-500" :
                                          prod.estadoProducto === "proximo_a_vencer" ? "text-amber-500" :
                                          "text-foreground"
                                        }>
                                          {formatDate(prod.proximoVencimiento)}
                                        </strong>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-border">
                                  <div className="text-left md:text-right">
                                    <span className="text-xl font-bold text-foreground">{prod.stockTotal}</span>
                                    <span className="text-xs text-muted-foreground block">Stock Total</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {prod.estadoProducto === "vencido" && <span className="text-xs px-2.5 py-1 rounded bg-red-500/10 text-red-500 font-bold border border-red-500/20">LOTE VENCIDO</span>}
                                    {prod.estadoProducto === "proximo_a_vencer" && <span className="text-xs px-2.5 py-1 rounded bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20">PRONTO A VENCER</span>}
                                    {prod.estadoProducto === "sin_stock" && <span className="text-xs px-2.5 py-1 rounded bg-muted text-muted-foreground font-bold border border-border">SIN STOCK</span>}
                                    {prod.estadoProducto === "vigente" && <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">AL DÍA</span>}

                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                                  </div>
                                </div>
                              </div>

                              {/* Collapsible Lotes List */}
                              {isExpanded && (
                                <div className="border-t border-border bg-muted/20 p-4 space-y-3">
                                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Lotes asociados a este producto</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {prod.lotes.map(lote => {
                                      const expired = isExpired(lote.fechaVencimiento)
                                      const nearExpiry = isNearExpiry(lote.fechaVencimiento)
                                      const progress = lote.stockInicial > 0 ? (lote.stockActual / lote.stockInicial) * 100 : 0
                                      
                                      return (
                                        <div key={lote.id} className="bg-background border border-border rounded-xl p-3.5 shadow-sm space-y-3">
                                          <div className="flex justify-between items-start">
                                            <div>
                                              <span className="text-xs font-mono font-bold bg-muted p-1 px-2 rounded border border-border text-foreground">
                                                Lote: {lote.codigoLote}
                                              </span>
                                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-2">
                                                <Calendar className="w-3.5 h-3.5" />
                                                Vence: <strong className={expired ? "text-red-500" : nearExpiry ? "text-amber-500" : ""}>{formatDate(lote.fechaVencimiento)}</strong>
                                              </div>
                                            </div>
                                            
                                            <div>
                                              {expired && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-bold border border-red-500/20">VENCIDO</span>}
                                              {!expired && nearExpiry && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20">PRONTO</span>}
                                              {!expired && !nearExpiry && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">VIGENTE</span>}
                                            </div>
                                          </div>

                                          {/* Stock and Progress bar */}
                                          <div className="space-y-1.5">
                                            <div className="flex justify-between text-xs">
                                              <span className="text-muted-foreground">Stock actual / inicial:</span>
                                              <span className="font-semibold text-foreground">{lote.stockActual} / {lote.stockInicial} u</span>
                                            </div>
                                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                              <div
                                                className={`h-full transition-all duration-300 ${
                                                  progress <= 15 ? "bg-red-500" :
                                                  progress <= 40 ? "bg-orange-500" :
                                                  "bg-emerald-500"
                                                }`}
                                                style={{ width: `${progress}%` }}
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </Card>
                          )
                        })
                      )}
                    </div>
                  ) : (
                    /* Vista detallada (Tabla completa de lotes) */
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
                </>
              )}

              {/* ═══ TAB: KARDEX (MOVIMIENTOS) ═══ */}
              {activeTab === "movimientos" && (
                <Card className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30 border-b border-border">
                        <tr>
                          {["Fecha", "Producto", "Tipo", "Cantidad", "Stock Resultante", "Lote", "Referencia", "Observación", "Usuario"].map(h => (
                            <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredMovimientos.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-5 py-12 text-center text-muted-foreground">
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
                              <td className="px-4 py-3 text-xs text-muted-foreground max-w-[150px] truncate">{mov.referencia || "—"}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{mov.observacion || "—"}</td>
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
                  {/* Threshold Settings Selector */}
                  <Card className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-primary/10">
                    <div className="flex items-center gap-2.5">
                      <Sliders className="w-5 h-5 text-primary" />
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Configuración de Alertas</h3>
                        <p className="text-xs text-muted-foreground">Define el umbral de días para clasificar lotes por vencer</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Umbral de días:</span>
                      <select
                        value={diasAlerta}
                        onChange={(e) => setDiasAlerta(Number(e.target.value))}
                        className="bg-popover border border-border text-foreground px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value={30}>30 días (Crítico)</option>
                        <option value={60}>60 días (Advertencia)</option>
                        <option value={90}>90 días (Normal)</option>
                        <option value={180}>180 días (Semestre)</option>
                      </select>
                    </div>
                  </Card>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Por Vencer ({diasAlerta} d)</p>
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
                          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Stock Bajo Prod.</p>
                          <p className="text-3xl font-bold text-orange-500 mt-1">{alertas.resumen.totalStockBajo}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-orange-500/10">
                          <TrendingDown className="w-6 h-6 text-orange-500" />
                        </div>
                      </div>
                    </Card>
                    <Card className="glass-card p-5 border-l-4 border-l-rose-400">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Stock Crítico Lote</p>
                          <p className="text-3xl font-bold text-rose-400 mt-1">{alertas.resumen.totalLotesStockBajo}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-rose-500/10">
                          <Layers className="w-6 h-6 text-rose-400" />
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Expired Batches */}
                  {alertas.lotesVencidos.length > 0 && (
                    <Card className="glass-card overflow-hidden border border-red-500/20">
                      <div className="px-5 py-4 border-b border-border bg-red-500/5">
                        <h3 className="text-sm font-bold text-red-500 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Lotes Vencidos (Requieren Retiro de Inventario)
                        </h3>
                      </div>
                      <div className="divide-y divide-border">
                        {alertas.lotesVencidos.map(lote => (
                          <div key={lote.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-red-500/5 transition-colors">
                            <div>
                              <p className="text-sm font-medium text-foreground">{lote.producto.nombre}</p>
                              <p className="text-xs text-muted-foreground font-mono mt-0.5">Lote: {lote.codigoLote} — Venció el: {formatDate(lote.fechaVencimiento)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-red-500">{lote.stockActual} und</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-semibold">retener inmediatamente</p>
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
                          Lotes Próximos a Vencer (dentro del umbral)
                        </h3>
                      </div>
                      <div className="divide-y divide-border">
                        {alertas.lotesPorVencer.map(lote => {
                          const isCrit = lote.clasificacion === "critico"
                          const isWarn = lote.clasificacion === "advertencia"
                          return (
                            <div key={lote.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-amber-500/5 transition-colors">
                              <div>
                                <p className="text-sm font-medium text-foreground">{lote.producto.nombre}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-muted-foreground font-mono">Lote: {lote.codigoLote} — Vence: {formatDate(lote.fechaVencimiento)}</span>
                                  {isCrit && <span className="text-[9px] px-1.5 py-0.2 bg-red-500/10 text-red-500 font-bold rounded">CRÍTICO</span>}
                                  {isWarn && <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/10 text-amber-500 font-bold rounded">ADVERTENCIA</span>}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-bold ${isCrit ? "text-red-500" : isWarn ? "text-amber-500" : "text-foreground"}`}>{lote.diasRestantes} días</p>
                                <p className="text-xs text-muted-foreground">{lote.stockActual} und</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  )}

                  {/* Low Stock per Lot */}
                  {alertas.lotesStockBajo.length > 0 && (
                    <Card className="glass-card overflow-hidden">
                      <div className="px-5 py-4 border-b border-border bg-rose-500/5">
                        <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                          <Layers className="w-4 h-4" />
                          Lotes con Stock Crítico (≤ 5 unidades)
                        </h3>
                      </div>
                      <div className="divide-y divide-border">
                        {alertas.lotesStockBajo.map(lote => (
                          <div key={lote.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-rose-500/5 transition-colors">
                            <div>
                              <p className="text-sm font-medium text-foreground">{lote.producto.nombre}</p>
                              <p className="text-xs text-muted-foreground font-mono mt-0.5">Lote: {lote.codigoLote} — Vence: {formatDate(lote.fechaVencimiento)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-rose-400">{lote.stockActual} / {lote.stockInicial} u</p>
                              <p className="text-[10px] text-muted-foreground">disponibles</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Low Stock per Product */}
                  {alertas.productosStockBajo.length > 0 && (
                    <Card className="glass-card overflow-hidden">
                      <div className="px-5 py-4 border-b border-border bg-orange-500/5">
                        <h3 className="text-sm font-bold text-orange-500 flex items-center gap-2">
                          <TrendingDown className="w-4 h-4" />
                          Productos con Stock Bajo (Mínimo General)
                        </h3>
                      </div>
                      <div className="divide-y divide-border">
                        {alertas.productosStockBajo.map(p => (
                          <div key={p.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-orange-500/5 transition-colors">
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
                  {alertas.resumen.totalVencidos === 0 && alertas.resumen.totalPorVencer === 0 && alertas.resumen.totalStockBajo === 0 && alertas.resumen.totalLotesStockBajo === 0 && (
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

              {/* ═══ TAB: DEVOLUCIONES ═══ */}
              {activeTab === "devoluciones" && (
                <div className="space-y-4">
                  {isAdmin && (
                    <div className="flex justify-end">
                      <Button
                        onClick={async () => {
                          try {
                            const [pRes, provRes] = await Promise.all([
                              fetch("/api/productos?estado=activos"),
                              fetch("/api/proveedores")
                            ])
                            const pData = await pRes.json()
                            const provData = await provRes.json()
                            setDevProductos(pData.filter((p: any) => !p.esServicio))
                            setDevProveedores(provData)
                            setShowDevModal(true)
                          } catch (err) {
                            toast.error("Error al cargar datos para el formulario")
                          }
                        }}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        Registrar Devolución a Laboratorio
                      </Button>
                    </div>
                  )}

                  <Card className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/30 border-b border-border">
                          <tr>
                            {["Fecha", "Producto", "Lote", "Proveedor", "Cantidad", "Motivo", "Estado", "Responsable", "Acciones"].map(h => (
                              <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredDevoluciones.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="px-5 py-12 text-center text-muted-foreground">
                                <RotateCcw className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                No hay devoluciones registradas
                              </td>
                            </tr>
                          ) : filteredDevoluciones.map(dev => (
                            <tr key={dev.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(dev.createdAt)}</td>
                              <td className="px-4 py-3 text-sm font-medium text-foreground">{dev.producto.nombre}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded bg-muted/40 text-xs font-mono text-foreground">{dev.lote.codigoLote}</span>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{dev.proveedor?.nombre || "—"}</td>
                              <td className="px-4 py-3 text-sm text-foreground font-semibold">{dev.cantidad} und</td>
                              <td className="px-4 py-3 text-xs">
                                <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 font-bold border border-orange-500/20">{dev.motivo}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  dev.estado === "COMPLETADA"
                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                    : "bg-red-500/10 text-red-500 border border-red-500/20"
                                }`}>
                                  {dev.estado}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{dev.usuario.nombreCompleto}</td>
                              <td className="px-4 py-3 text-sm">
                                {dev.estado === "COMPLETADA" && isAdmin && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleAnularDevolucion(dev.id)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 h-8"
                                    title="Anular Devolución"
                                  >
                                    Anular
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modal Registrar Devolución */}
      {showDevModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="glass-card w-full max-w-lg p-6 relative max-h-[90vh] flex flex-col shadow-2xl rounded-2xl animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowDevModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 hover:bg-muted/40 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <RotateCcw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Nueva Devolución a Laboratorio</h2>
                <p className="text-xs text-muted-foreground">Retirar stock y registrar devolución al proveedor</p>
              </div>
            </div>

            <form onSubmit={handleCreateDevolucion} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Producto <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProdId}
                  onChange={e => setSelectedProdId(e.target.value)}
                  required
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all bg-background text-foreground"
                >
                  <option value="">Selecciona un producto...</option>
                  {devProductos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Lote <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedLoteId}
                  onChange={e => setSelectedLoteId(e.target.value)}
                  required
                  disabled={!selectedProdId}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all bg-background text-foreground"
                >
                  <option value="">Selecciona un lote...</option>
                  {devLotes.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.codigoLote} (Disponible: {l.stockActual} und {l.fechaVencimiento ? `| Vence: ${formatDate(l.fechaVencimiento)}` : ""})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Proveedor / Laboratorio <span className="text-muted-foreground font-normal text-xs">— opcional</span>
                </label>
                <select
                  value={selectedProvId}
                  onChange={e => setSelectedProvId(e.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all bg-background text-foreground"
                >
                  <option value="">Selecciona el proveedor...</option>
                  {devProveedores.map(prov => (
                    <option key={prov.id} value={prov.id}>{prov.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">
                    Cantidad a devolver <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={devCantidad}
                    onChange={e => setDevCantidad(e.target.value)}
                    required
                    placeholder="Ej: 10"
                    className="bg-background border-border text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">
                    Motivo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={devMotivo}
                    onChange={e => setDevMotivo(e.target.value)}
                    required
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all bg-background text-foreground"
                  >
                    <option value="VENCIDO">Vencido</option>
                    <option value="PRÓXIMO_A_VENCER">Próximo a Vencer</option>
                    <option value="DAÑADO">Dañado</option>
                    <option value="DEFECTUOSO">Defectuoso</option>
                    <option value="RETIRO_DE_LABORATORIO">Retiro de Laboratorio</option>
                    <option value="ERROR_DE_COMPRA">Error de Compra</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Observación</label>
                <textarea
                  value={devObservacion}
                  onChange={e => setDevObservacion(e.target.value)}
                  placeholder="Detalles adicionales sobre la devolución..."
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 outline-none min-h-[70px] bg-background text-foreground"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowDevModal(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={devSubmitLoading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {devSubmitLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registrando...</>
                  ) : (
                    "Confirmar Devolución"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
