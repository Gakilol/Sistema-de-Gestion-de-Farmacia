"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import { 
  BarChart3, TrendingUp, AlertTriangle, Activity, Calendar, Search, 
  Download, User, ListOrdered, RefreshCw, FileText, Loader2, ArrowUpRight, DollarSign
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts"

interface KPIs {
  totalVentas: number
  totalCompras: number
  gananciaNeta: number
  transaccionesCount: number
  stockBajo: number
}

interface ProductoVencer {
  id: number
  nombre: string
  categoria: string
  stockActual: number
  fechaVencimiento: string
}

interface VentasGrafico {
  fecha: string
  total: number
}

interface ProductoMasVendido {
  id: number
  nombre: string
  categoria: string
  laboratorio: string
  cantidad: number
  total: number
}

interface ClienteFrecuente {
  id: number
  nombre: string
  cedula: string
  comprasCount: number
  totalComprado: number
}

interface StockBajoDetalle {
  id: number
  nombre: string
  categoria: string
  stockActual: number
  stockMinimo: number
  diferencia: number
}

interface MovimientoDetalle {
  id: string
  tipo: "VENTA" | "COMPRA"
  fecha: string
  total: number
  usuario: string
  detalle: string
}

interface UtilidadBrutaVenta {
  id: number
  fecha: string
  cliente: string
  total: number
  cogs: number
  utilidad: number
  margenPct: number
}

interface UtilidadBrutaResumen {
  totalVentas: number
  totalCogs: number
  totalUtilidad: number
  margenPct: number
}

interface UtilidadPorProductoItem {
  id: number
  nombre: string
  categoria: string
  laboratorio: string
  cantidadVendida: number
  ingresosTotales: number
  cogs: number
  utilidad: number
  margenPct: number
}

export default function ReportesPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [grafico, setGrafico] = useState<VentasGrafico[]>([])
  const [vencer, setVencer] = useState<ProductoVencer[]>([])
  const [masVendidos, setMasVendidos] = useState<ProductoMasVendido[]>([])
  const [clientesFrecuentes, setClientesFrecuentes] = useState<ClienteFrecuente[]>([])
  const [stockBajo, setStockBajo] = useState<StockBajoDetalle[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoDetalle[]>([])
  
  // Nuevos reportes de utilidad
  const [utilidadBruta, setUtilidadBruta] = useState<{ ventas: UtilidadBrutaVenta[]; resumen: UtilidadBrutaResumen } | null>(null)
  const [utilidadPorProducto, setUtilidadPorProducto] = useState<UtilidadPorProductoItem[]>([])

  // States
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"resumen" | "productos" | "utilidad-bruta" | "utilidad-por-producto" | "clientes" | "stock" | "movimientos">("resumen")

  // Helper local para obtener fecha en Managua TZ
  function getManaguaToday() {
    const now = new Date()
    const managua = new Date(now.getTime() - 6 * 60 * 60 * 1000)
    return managua.toISOString().split("T")[0]
  }

  function getManaguaFirstDayOfMonth() {
    const now = new Date()
    const managua = new Date(now.getTime() - 6 * 60 * 60 * 1000)
    return `${managua.toISOString().split("-")[0]}-${managua.toISOString().split("-")[1]}-01`
  }

  // Load initial data
  useEffect(() => {
    const primerDia = getManaguaFirstDayOfMonth()
    const ultimoDia = getManaguaToday()
    setStartDate(primerDia)
    setEndDate(ultimoDia)
    
    fetchData(primerDia, ultimoDia)
  }, [])

  const fetchData = async (start = startDate, end = endDate) => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (start) queryParams.append("startDate", start)
      if (end) queryParams.append("endDate", end)

      // Fetch endpoints parallelly
      const [kpisRes, graficoRes, vencerRes, masVendidosRes, clientesRes, stockRes, movRes, utilBrutaRes, utilProdRes] = await Promise.all([
        fetch(`/api/reportes?type=kpis&${queryParams.toString()}`),
        fetch(`/api/reportes?type=ventas-grafico&${queryParams.toString()}`),
        fetch(`/api/reportes?type=por-vencer&${queryParams.toString()}`),
        fetch(`/api/reportes?type=productos-mas-vendidos&${queryParams.toString()}`),
        fetch(`/api/reportes?type=clientes-frecuentes&${queryParams.toString()}`),
        fetch(`/api/reportes?type=stock-bajo&${queryParams.toString()}`),
        fetch(`/api/reportes?type=movimientos&${queryParams.toString()}`),
        fetch(`/api/reportes?type=utilidad-bruta&${queryParams.toString()}`),
        fetch(`/api/reportes?type=utilidad-por-producto&${queryParams.toString()}`)
      ])

      if (kpisRes.ok) setKpis(await kpisRes.json())
      if (graficoRes.ok) setGrafico(await graficoRes.json())
      if (vencerRes.ok) setVencer(await vencerRes.json())
      if (masVendidosRes.ok) setMasVendidos(await masVendidosRes.json())
      if (clientesRes.ok) setClientesFrecuentes(await clientesRes.json())
      if (stockRes.ok) setStockBajo(await stockRes.json())
      if (movRes.ok) setMovimientos(await movRes.json())
      if (utilBrutaRes.ok) setUtilidadBruta(await utilBrutaRes.json())
      if (utilProdRes.ok) setUtilidadPorProducto(await utilProdRes.json())
    } catch (error) {
      console.error("Error cargando reportes:", error)
      toast.error("Error al conectar con la base de datos de reportes")
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFilter = () => {
    fetchData(startDate, endDate)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData(startDate, endDate)
    setRefreshing(false)
    toast.success("Métricas actualizadas")
  }

  const handleExportExcel = () => {
    try {
      const workbook = XLSX.utils.book_new()

      // Sheet 1: KPIs
      if (kpis) {
        const kpisData = [
          { Métrica: "Total Ventas", Valor: `C$${kpis.totalVentas.toFixed(2)}` },
          { Métrica: "Total Compras", Valor: `C$${kpis.totalCompras.toFixed(2)}` },
          { Métrica: "Utilidad Bruta (Real)", Valor: `C$${kpis.gananciaNeta.toFixed(2)}` },
          { Métrica: "Transacciones Totales", Valor: kpis.transaccionesCount },
          { Métrica: "Productos Stock Bajo", Valor: kpis.stockBajo }
        ]
        const wsKPI = XLSX.utils.json_to_sheet(kpisData)
        XLSX.utils.book_append_sheet(workbook, wsKPI, "Resumen KPIs")
      }

      // Sheet 2: Utilidad Bruta Detalle
      if (utilidadBruta && utilidadBruta.ventas.length > 0) {
        const wsUtilBruta = XLSX.utils.json_to_sheet(utilidadBruta.ventas.map(v => ({
          Venta_ID: v.id,
          Fecha: new Date(v.fecha).toLocaleDateString("es-NI"),
          Cliente: v.cliente,
          Total_Facturado: `C$${v.total.toFixed(2)}`,
          Costo_Ventas_COGS: `C$${v.cogs.toFixed(2)}`,
          Utilidad_Bruta: `C$${v.utilidad.toFixed(2)}`,
          Margen: `${v.margenPct.toFixed(1)}%`
        })))
        XLSX.utils.book_append_sheet(workbook, wsUtilBruta, "Utilidad Bruta Transaccional")
      }

      // Sheet 3: Utilidad Por Producto Rentabilidad
      if (utilidadPorProducto.length > 0) {
        const wsUtilProd = XLSX.utils.json_to_sheet(utilidadPorProducto.map(p => ({
          Producto: p.nombre,
          Laboratorio: p.laboratorio,
          Categoría: p.categoria,
          Cantidad_Vendida: p.cantidadVendida,
          Ingresos_Totales: `C$${p.ingresosTotales.toFixed(2)}`,
          Costo_Compra: `C$${p.cogs.toFixed(2)}`,
          Utilidad_Bruta: `C$${p.utilidad.toFixed(2)}`,
          Margen: `${p.margenPct.toFixed(1)}%`
        })))
        XLSX.utils.book_append_sheet(workbook, wsUtilProd, "Rentabilidad por Producto")
      }

      // Sheet 4: Mas Vendidos
      if (masVendidos.length > 0) {
        const wsProd = XLSX.utils.json_to_sheet(masVendidos.map((p, idx) => ({
          Puesto: idx + 1,
          Producto: p.nombre,
          Laboratorio: p.laboratorio,
          Categoría: p.categoria,
          Cantidad_Vendida: p.cantidad,
          Total_Recaudado: `C$${p.total.toFixed(2)}`
        })))
        XLSX.utils.book_append_sheet(workbook, wsProd, "Volumen Más Vendidos")
      }

      // Sheet 5: Clientes Frecuentes
      if (clientesFrecuentes.length > 0) {
        const wsCli = XLSX.utils.json_to_sheet(clientesFrecuentes.map((c, idx) => ({
          Puesto: idx + 1,
          Cliente: c.nombre,
          Cédula: c.cedula,
          Cant_Compras: c.comprasCount,
          Total_Comprado: `C$${c.totalComprado.toFixed(2)}`
        })))
        XLSX.utils.book_append_sheet(workbook, wsCli, "Clientes Frecuentes")
      }

      // Sheet 6: Stock Bajo
      if (stockBajo.length > 0) {
        const wsStock = XLSX.utils.json_to_sheet(stockBajo.map(s => ({
          Producto: s.nombre,
          Categoría: s.categoria,
          Stock_Actual: s.stockActual,
          Stock_Mínimo: s.stockMinimo,
          Faltante: s.diferencia
        })))
        XLSX.utils.book_append_sheet(workbook, wsStock, "Stock Bajo")
      }

      // Sheet 7: Movimientos
      if (movimientos.length > 0) {
        const wsMov = XLSX.utils.json_to_sheet(movimientos.map(m => ({
          ID: m.id,
          Tipo: m.tipo,
          Fecha: new Date(m.fecha).toLocaleString("es-NI"),
          Total: `C$${m.total.toFixed(2)}`,
          Usuario: m.usuario,
          Detalle: m.detalle
        })))
        XLSX.utils.book_append_sheet(workbook, wsMov, "Movimientos Kardex")
      }

      const startStr = startDate ? `_desde_${startDate}` : ""
      const endStr = endDate ? `_hasta_${endDate}` : ""
      XLSX.writeFile(workbook, `Reporte_Farmacia_Completo${startStr}${endStr}.xlsx`)
      toast.success("Excel exportado exitosamente con todas las hojas")
    } catch (e) {
      console.error(e)
      toast.error("Error al exportar Excel")
    }
  }

  const handleExportCSV = () => {
    try {
      let csvContent = ""
      let filename = "Reporte"

      if (activeTab === "resumen") {
        if (!kpis) return
        csvContent = [
          ["Metrica", "Valor"],
          ["Total Ventas", kpis.totalVentas.toFixed(2)],
          ["Total Compras", kpis.totalCompras.toFixed(2)],
          ["Utilidad Bruta", kpis.gananciaNeta.toFixed(2)],
          ["Transacciones Totales", kpis.transaccionesCount],
          ["Productos Stock Bajo", kpis.stockBajo]
        ].map(e => e.join(",")).join("\n")
        filename = "Resumen_KPIs"
      } else if (activeTab === "utilidad-bruta") {
        if (!utilidadBruta) return
        csvContent = [
          ["ID Venta", "Fecha", "Cliente", "Total Facturado", "Costo Ventas COGS", "Utilidad Bruta", "Margen %"],
          ...utilidadBruta.ventas.map(v => [
            v.id,
            new Date(v.fecha).toLocaleDateString("es-NI"),
            `"${v.cliente.replace(/"/g, '""')}"`,
            v.total.toFixed(2),
            v.cogs.toFixed(2),
            v.utilidad.toFixed(2),
            `${v.margenPct.toFixed(1)}%`
          ])
        ].map(e => e.join(",")).join("\n")
        filename = "Utilidad_Bruta"
      } else if (activeTab === "utilidad-por-producto") {
        csvContent = [
          ["Producto", "Laboratorio", "Categoria", "Unidades Vendidas", "Ingresos Totales", "Costo Compra COGS", "Utilidad Bruta", "Margen %"],
          ...utilidadPorProducto.map(p => [
            `"${p.nombre.replace(/"/g, '""')}"`,
            `"${p.laboratorio.replace(/"/g, '""')}"`,
            `"${p.categoria.replace(/"/g, '""')}"`,
            p.cantidadVendida,
            p.ingresosTotales.toFixed(2),
            p.cogs.toFixed(2),
            p.utilidad.toFixed(2),
            `${p.margenPct.toFixed(1)}%`
          ])
        ].map(e => e.join(",")).join("\n")
        filename = "Rentabilidad_Por_Producto"
      } else if (activeTab === "productos") {
        csvContent = [
          ["Puesto", "Producto", "Laboratorio", "Categoria", "Cantidad Vendida", "Total Recaudado"],
          ...masVendidos.map((p, idx) => [
            idx + 1,
            `"${p.nombre.replace(/"/g, '""')}"`,
            `"${p.laboratorio.replace(/"/g, '""')}"`,
            `"${p.categoria.replace(/"/g, '""')}"`,
            p.cantidad,
            p.total.toFixed(2)
          ])
        ].map(e => e.join(",")).join("\n")
        filename = "Productos_Mas_Vendidos"
      } else if (activeTab === "clientes") {
        csvContent = [
          ["Puesto", "Cliente", "Cedula", "Transacciones", "Total Comprado"],
          ...clientesFrecuentes.map((c, idx) => [
            c.id === 0 ? "—" : idx + 1,
            `"${c.nombre.replace(/"/g, '""')}"`,
            `"${c.cedula.replace(/"/g, '""')}"`,
            c.comprasCount,
            c.totalComprado.toFixed(2)
          ])
        ].map(e => e.join(",")).join("\n")
        filename = "Clientes_Frecuentes"
      } else if (activeTab === "stock") {
        csvContent = [
          ["Producto", "Categoria", "Stock Fisico", "Minimo Alerta", "Faltante"],
          ...stockBajo.map(s => [
            `"${s.nombre.replace(/"/g, '""')}"`,
            `"${s.categoria.replace(/"/g, '""')}"`,
            s.stockActual,
            s.stockMinimo,
            s.diferencia
          ])
        ].map(e => e.join(",")).join("\n")
        filename = "Stock_Bajo"
      } else if (activeTab === "movimientos") {
        csvContent = [
          ["ID", "Tipo", "Fecha", "Total", "Usuario", "Detalle"],
          ...movimientos.map(m => [
            m.id,
            m.tipo,
            new Date(m.fecha).toLocaleString("es-NI"),
            m.total.toFixed(2),
            `"${m.usuario.replace(/"/g, '""')}"`,
            `"${m.detalle.replace(/"/g, '""')}"`
          ])
        ].map(e => e.join(",")).join("\n")
        filename = "Historial_Movimientos"
      }

      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      const startStr = startDate ? `_desde_${startDate}` : ""
      const endStr = endDate ? `_hasta_${endDate}` : ""
      link.setAttribute("download", `${filename}${startStr}${endStr}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("CSV exportado exitosamente")
    } catch (e) {
      console.error(e)
      toast.error("Error al exportar CSV")
    }
  }

  const handleExportPDF = () => {
    let type = "kpis"
    if (activeTab === "resumen") {
      type = "kpis"
    } else if (activeTab === "utilidad-bruta") {
      type = "utilidad-bruta"
    } else if (activeTab === "utilidad-por-producto" || activeTab === "productos") {
      type = "utilidad-por-producto"
    } else {
      // Fallback para pestañas normales
      window.print()
      return
    }

    // Abrir endpoint de exportación en una nueva pestaña
    window.open(`/api/reportes/export?type=${type}&startDate=${startDate}&endDate=${endDate}`, "_blank")
  }

  const filterBySearch = (text: string) => {
    return text.toLowerCase().includes(searchQuery.toLowerCase())
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-primary" />
                Reportes y Analíticas
              </h1>
              <p className="text-muted-foreground mt-1">Monitoreo dinámico del rendimiento físico y financiero (Nicaragua)</p>
            </div>
            <div className="flex gap-2 no-print flex-wrap">
              <Button 
                variant="outline" 
                onClick={handleRefresh} 
                disabled={loading || refreshing} 
                className="border-border text-muted-foreground hover:bg-muted"
              >
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
              <Button 
                onClick={handleExportExcel} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar Excel
              </Button>
              <Button 
                onClick={handleExportCSV} 
                className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                CSV
              </Button>
              <Button 
                onClick={handleExportPDF} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                PDF Profesional
              </Button>
            </div>
          </div>

          {/* Filters Bar */}
          <Card className="glass-card p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Fecha Inicio
              </label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="bg-muted/30 border-border"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Fecha Fin
              </label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="bg-muted/30 border-border"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleApplyFilter} 
                disabled={loading} 
                className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1"
              >
                Filtrar Rango
              </Button>
            </div>
          </Card>

          {/* Tab Navigation */}
          <div className="flex border-b border-border mb-6 overflow-x-auto gap-2">
            {[
              { id: "resumen", label: "Resumen General", icon: Activity },
              { id: "utilidad-bruta", label: "Utilidad Bruta (Transaccional)", icon: DollarSign },
              { id: "utilidad-por-producto", label: "Rentabilidad por Producto", icon: TrendingUp },
              { id: "productos", label: "Volumen Más Vendidos", icon: ListOrdered },
              { id: "clientes", label: "Clientes Frecuentes", icon: User },
              { id: "stock", label: "Stock Bajo", icon: AlertTriangle },
              { id: "movimientos", label: "Historial de Movimientos", icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any)
                    setSearchQuery("")
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    active 
                      ? "border-primary text-primary" 
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Search bar inside tabs (except Resumen) */}
          {activeTab !== "resumen" && (
            <Card className="glass-card p-3 mb-6 flex items-center gap-3">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                type="text"
                placeholder="Buscar en este reporte..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-none shadow-none focus-visible:ring-0 bg-transparent p-0 text-sm w-full"
              />
            </Card>
          )}

          {/* Content Loading */}
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
              <Skeleton className="h-72 w-full" />
            </div>
          ) : (
            <div className="page-transition">
              
              {/* TAB 1: RESUMEN GENERAL */}
              {activeTab === "resumen" && (
                <div className="space-y-8">
                  {/* KPIs Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="glass-card p-6 border-l-4 border-l-blue-500 hover:scale-[1.01] transition-transform">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Ventas del Rango</p>
                          <h3 className="text-2xl font-bold text-foreground">C${kpis?.totalVentas.toFixed(2) || "0.00"}</h3>
                          <p className="text-xs text-muted-foreground mt-2">En el período seleccionado</p>
                        </div>
                        <div className="p-2.5 bg-blue-500/10 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-blue-500" />
                        </div>
                      </div>
                    </Card>

                    <Card className="glass-card p-6 border-l-4 border-l-amber-500 hover:scale-[1.01] transition-transform">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Compras del Rango</p>
                          <h3 className="text-2xl font-bold text-foreground">C${kpis?.totalCompras.toFixed(2) || "0.00"}</h3>
                          <p className="text-xs text-muted-foreground mt-2">Abastecimiento en inventario</p>
                        </div>
                        <div className="p-2.5 bg-amber-500/10 rounded-lg">
                          <Activity className="w-5 h-5 text-amber-500" />
                        </div>
                      </div>
                    </Card>

                    <Card className="glass-card p-6 border-l-4 border-l-emerald-500 hover:scale-[1.01] transition-transform">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Utilidad Bruta Real</p>
                          <h3 className={`text-2xl font-bold ${kpis?.gananciaNeta && kpis.gananciaNeta >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                            C${kpis?.gananciaNeta.toFixed(2) || "0.00"}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-2">Ventas - Costos de Adquisición (COGS)</p>
                        </div>
                        <div className="p-2.5 bg-emerald-500/10 rounded-lg">
                          <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                        </div>
                      </div>
                    </Card>

                    <Card className="glass-card p-6 border-l-4 border-l-red-500 hover:scale-[1.01] transition-transform">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Stock Bajo Alerta</p>
                          <h3 className="text-2xl font-bold text-red-500">{kpis?.stockBajo || 0}</h3>
                          <p className="text-xs text-muted-foreground mt-2">Productos que requieren reabastecer</p>
                        </div>
                        <div className="p-2.5 bg-red-500/10 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Gráfico */}
                    <Card className="glass-card p-6 lg:col-span-2">
                      <h2 className="text-lg font-semibold text-foreground mb-4">Tendencia de Ventas Diarias</h2>
                      <div className="h-[300px] w-full">
                        {grafico.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={grafico}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="fecha" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                              <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `C$${value}`} />
                              <RechartsTooltip formatter={(value: any) => [`C$${Number(value).toFixed(2)}`, "Ventas"]} />
                              <Line 
                                type="monotone" 
                                dataKey="total" 
                                stroke="#3b82f6" 
                                strokeWidth={3} 
                                dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }} 
                                activeDot={{ r: 6 }} 
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted-foreground">
                            No hay datos de ventas en este período.
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Vencer */}
                    <Card className="glass-card p-6 flex flex-col justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                          Por Vencer (Próximos 90 días)
                        </h2>
                        <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1">
                          {vencer.length > 0 ? (
                            vencer.map((v) => (
                              <div key={v.id} className="flex justify-between items-center p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                                <div className="min-w-0 flex-1 pr-2">
                                  <p className="font-semibold text-foreground text-sm truncate">{v.nombre}</p>
                                  <p className="text-xs text-muted-foreground">Stock Actual: {v.stockActual} und</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-bold text-amber-600">
                                    {new Date(v.fechaVencimiento).toLocaleDateString('es-NI', { timeZone: 'UTC' })}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">Ningún producto vence pronto.</p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground pt-4 border-t border-border mt-4">
                        * Los productos vencidos deben ser descartados del stock inmediatamente.
                      </p>
                    </Card>
                  </div>
                </div>
              )}

              {/* TAB 2: UTILIDAD BRUTA TRANSACCIONAL */}
              {activeTab === "utilidad-bruta" && (
                <div className="space-y-6">
                  {/* Resumen de Utilidad */}
                  {utilidadBruta && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="glass-card p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Ingresos del Rango</p>
                        <p className="text-xl font-bold text-foreground">C${utilidadBruta.resumen.totalVentas.toFixed(2)}</p>
                      </Card>
                      <Card className="glass-card p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Costo de Ventas (COGS)</p>
                        <p className="text-xl font-bold text-amber-500">C${utilidadBruta.resumen.totalCogs.toFixed(2)}</p>
                      </Card>
                      <Card className="glass-card p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Utilidad Bruta Acumulada</p>
                        <p className="text-xl font-bold text-emerald-500">C${utilidadBruta.resumen.totalUtilidad.toFixed(2)}</p>
                      </Card>
                      <Card className="glass-card p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Margen Comercial Promedio</p>
                        <p className="text-xl font-bold text-primary">{utilidadBruta.resumen.margenPct.toFixed(1)}%</p>
                      </Card>
                    </div>
                  )}

                  <Card className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/30 border-b border-border">
                          <tr>
                            {["Venta ID", "Fecha", "Cliente", "Total Facturado", "Costo de Venta (COGS)", "Utilidad Bruta", "Margen %"].map((h) => (
                              <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {!utilidadBruta || utilidadBruta.ventas.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-sm">No hay registros de utilidad en este rango</td>
                            </tr>
                          ) : (
                            utilidadBruta.ventas
                              .filter(v => filterBySearch(String(v.id)) || filterBySearch(v.cliente))
                              .map((v) => (
                                <tr key={v.id} className="hover:bg-muted/10 transition-colors">
                                  <td className="px-6 py-4 text-sm font-semibold text-primary">#{v.id}</td>
                                  <td className="px-6 py-4 text-sm text-muted-foreground">
                                    {new Date(v.fecha).toLocaleDateString("es-NI")}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-medium text-foreground">{v.cliente}</td>
                                  <td className="px-6 py-4 text-sm font-semibold text-foreground">C${v.total.toFixed(2)}</td>
                                  <td className="px-6 py-4 text-sm text-amber-500">C${v.cogs.toFixed(2)}</td>
                                  <td className="px-6 py-4 text-sm font-bold text-emerald-600">C${v.utilidad.toFixed(2)}</td>
                                  <td className="px-6 py-4 text-sm font-semibold text-muted-foreground">{v.margenPct.toFixed(1)}%</td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {/* TAB 3: RENTABILIDAD POR PRODUCTO */}
              {activeTab === "utilidad-por-producto" && (
                <Card className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30 border-b border-border">
                        <tr>
                          {["Producto", "Laboratorio", "Categoría", "Cantidad Vendida", "Ingresos Totales", "Costo Adquisición", "Utilidad Bruta", "Margen %"].map((h) => (
                            <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {utilidadPorProducto.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground text-sm">No hay transacciones registradas</td>
                          </tr>
                        ) : (
                          utilidadPorProducto
                            .filter(p => filterBySearch(p.nombre) || filterBySearch(p.laboratorio) || filterBySearch(p.categoria))
                            .map((p) => (
                              <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-foreground">{p.nombre}</td>
                                <td className="px-6 py-4 text-sm text-muted-foreground">{p.laboratorio}</td>
                                <td className="px-6 py-4 text-sm text-muted-foreground">{p.categoria}</td>
                                <td className="px-6 py-4 text-sm text-foreground">{p.cantidadVendida} und</td>
                                <td className="px-6 py-4 text-sm font-semibold text-foreground">C${p.ingresosTotales.toFixed(2)}</td>
                                <td className="px-6 py-4 text-sm text-amber-500">C${p.cogs.toFixed(2)}</td>
                                <td className="px-6 py-4 text-sm font-bold text-emerald-600">C${p.utilidad.toFixed(2)}</td>
                                <td className="px-6 py-4 text-sm font-bold text-primary">{p.margenPct.toFixed(1)}%</td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* TAB 4: VOLUMEN MÁS VENDIDOS */}
              {activeTab === "productos" && (
                <Card className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30 border-b border-border">
                        <tr>
                          {["Puesto", "Nombre de Producto", "Laboratorio", "Categoría", "Cantidad Vendida", "Total Recaudado"].map((h) => (
                            <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {masVendidos.filter(p => filterBySearch(p.nombre) || filterBySearch(p.categoria)).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">No hay ventas registradas</td>
                          </tr>
                        ) : (
                          masVendidos
                            .filter(p => filterBySearch(p.nombre) || filterBySearch(p.categoria) || filterBySearch(p.laboratorio))
                            .map((p, idx) => (
                              <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                                <td className="px-6 py-4 text-sm font-semibold text-primary">#{idx + 1}</td>
                                <td className="px-6 py-4 text-sm font-medium text-foreground">{p.nombre}</td>
                                <td className="px-6 py-4 text-sm text-muted-foreground">{p.laboratorio}</td>
                                <td className="px-6 py-4 text-sm text-muted-foreground">{p.categoria}</td>
                                <td className="px-6 py-4 text-sm font-bold text-foreground">{p.cantidad} und</td>
                                <td className="px-6 py-4 text-sm font-bold text-emerald-600">C${p.total.toFixed(2)}</td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* TAB 5: CLIENTES FRECUENTES */}
              {activeTab === "clientes" && (
                <Card className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30 border-b border-border">
                        <tr>
                          {["Puesto", "Nombre Cliente", "Cédula", "Transacciones", "Total Comprado"].map((h) => (
                            <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {clientesFrecuentes.filter(c => filterBySearch(c.nombre) || filterBySearch(c.cedula)).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground text-sm">No hay compras registradas</td>
                          </tr>
                        ) : (
                          clientesFrecuentes
                            .filter(c => filterBySearch(c.nombre) || filterBySearch(c.cedula))
                            .map((c, idx) => (
                              <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                                <td className="px-6 py-4 text-sm font-semibold text-primary">
                                  {c.id === 0 ? "—" : `#${idx + 1}`}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-foreground">{c.nombre}</td>
                                <td className="px-6 py-4 text-sm text-muted-foreground">{c.cedula}</td>
                                <td className="px-6 py-4 text-sm font-bold text-foreground">{c.comprasCount} ventas</td>
                                <td className="px-6 py-4 text-sm font-bold text-emerald-600">C${c.totalComprado.toFixed(2)}</td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* TAB 6: STOCK BAJO */}
              {activeTab === "stock" && (
                <Card className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30 border-b border-border">
                        <tr>
                          {["Producto", "Categoría", "Stock Físico", "Mínimo Alerta", "Faltante", "Acción"].map((h) => (
                            <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {stockBajo.filter(s => filterBySearch(s.nombre) || filterBySearch(s.categoria)).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-emerald-600 text-sm font-medium">✓ Todos los productos cumplen con el stock mínimo óptimo</td>
                          </tr>
                        ) : (
                          stockBajo
                            .filter(s => filterBySearch(s.nombre) || filterBySearch(s.categoria))
                            .map((s) => (
                              <tr key={s.id} className="hover:bg-muted/10 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-foreground">{s.nombre}</td>
                                <td className="px-6 py-4 text-sm text-muted-foreground">{s.categoria}</td>
                                <td className="px-6 py-4 text-sm font-bold text-red-500">{s.stockActual} und</td>
                                <td className="px-6 py-4 text-sm text-muted-foreground">{s.stockMinimo} und</td>
                                <td className="px-6 py-4 text-sm font-bold text-amber-600">-{s.diferencia} und</td>
                                <td className="px-6 py-4 text-sm">
                                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 animate-pulse">Reabastecer</span>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* TAB 7: HISTORIAL DE MOVIMIENTOS KARDEX */}
              {activeTab === "movimientos" && (
                <Card className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30 border-b border-border">
                        <tr>
                          {["Código", "Tipo", "Fecha y Hora", "Detalle Relación", "Registrado por", "Total"].map((h) => (
                            <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {movimientos.filter(m => filterBySearch(m.id) || filterBySearch(m.detalle) || filterBySearch(m.usuario)).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">No hay movimientos registrados en el período</td>
                          </tr>
                        ) : (
                          movimientos
                            .filter(m => filterBySearch(m.id) || filterBySearch(m.detalle) || filterBySearch(m.usuario))
                            .map((m) => (
                              <tr key={m.id} className="hover:bg-muted/10 transition-colors">
                                <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{m.id}</td>
                                <td className="px-6 py-4 text-sm">
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    m.tipo === "VENTA" 
                                      ? "bg-blue-100 text-blue-700" 
                                      : "bg-amber-100 text-amber-700"
                                  }`}>
                                    {m.tipo}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-foreground">
                                  {new Date(m.fecha).toLocaleString('es-NI')}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-foreground">{m.detalle}</td>
                                <td className="px-6 py-4 text-sm text-muted-foreground">{m.usuario}</td>
                                <td className={`px-6 py-4 text-sm font-bold ${m.tipo === "VENTA" ? "text-emerald-600" : "text-amber-600"}`}>
                                  {m.tipo === "VENTA" ? "+" : "-"}C${m.total.toFixed(2)}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

            </div>
          )}

        </div>
      </main>
    </div>
  )
}
