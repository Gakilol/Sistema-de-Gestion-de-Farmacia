"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import { appendReportSheet, createReportWorkbook } from "@/lib/reportes/excel-export"
import { 
  BarChart3, TrendingUp, AlertTriangle, Activity, Calendar, Search, 
  Download, User, ListOrdered, RefreshCw, FileText, Loader2, ArrowUpRight, DollarSign,
  FileSpreadsheet, SlidersHorizontal, Check, ChevronRight
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts"

interface KPIs {
  totalVentas: number
  totalCompras: number
  gananciaNeta: number
  transaccionesCount: number
  stockBajo: number
  cogs: number
  margenPct: number
  ticketPromedio: number
  ventasCount: number
  totalVentasPrevias: number
  variacionVentasPct: number
}

type ReportTab = "resumen" | "productos" | "utilidad-bruta" | "utilidad-por-producto" | "clientes" | "stock" | "movimientos"
type ExportFormat = "excel" | "pdf"
type ExportSection = ReportTab

const exportOptions: Array<{ id: ExportSection; label: string; description: string; pdfType?: string }> = [
  { id: "resumen", label: "Resumen general", description: "Ventas, compras, utilidad, ticket promedio y alertas.", pdfType: "kpis" },
  { id: "utilidad-bruta", label: "Utilidad bruta", description: "Detalle financiero por transacción.", pdfType: "utilidad-bruta" },
  { id: "utilidad-por-producto", label: "Rentabilidad por producto", description: "Ingresos, costos y margen por producto.", pdfType: "utilidad-por-producto" },
  { id: "productos", label: "Productos más vendidos", description: "Ranking por unidades e ingreso total." },
  { id: "clientes", label: "Clientes frecuentes", description: "Compras y monto acumulado por cliente." },
  { id: "stock", label: "Stock bajo", description: "Productos que requieren reabastecimiento." },
  { id: "movimientos", label: "Movimientos de inventario", description: "Historial de entradas y salidas." },
]

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
  totalBruto: number
  descuentoLineas: number
  descuentoGeneral: number
  totalDescuento: number
  total: number
  cogs: number
  utilidad: number
  margenPct: number
}

interface UtilidadBrutaResumen {
  totalVentasBrutas: number
  totalDescuentosLineas: number
  totalDescuentosGenerales: number
  totalDescuentos: number
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
  ingresosBrutos: number
  descuentoLinea: number
  descuentoGeneralProrrateado: number
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
  const [tabLoading, setTabLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<ReportTab>("resumen")
  const [exportOpen, setExportOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>("excel")
  const [selectedExportSections, setSelectedExportSections] = useState<ExportSection[]>(exportOptions.map((option) => option.id))

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

  const reportQuery = (start: string, end: string) => {
    const params = new URLSearchParams()
    if (start) params.set("startDate", start)
    if (end) params.set("endDate", end)
    return params.toString()
  }

  const fetchJson = async <T,>(url: string): Promise<T> => {
    const response = await fetch(url)
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "No se pudo cargar el reporte")
    return data as T
  }

  const fetchTabData = async (tab: ReportTab, start: string, end: string) => {
    const query = reportQuery(start, end)
    if (tab === "productos") setMasVendidos(await fetchJson<ProductoMasVendido[]>(`/api/reportes?type=productos-mas-vendidos&${query}`))
    if (tab === "clientes") setClientesFrecuentes(await fetchJson<ClienteFrecuente[]>(`/api/reportes?type=clientes-frecuentes&${query}`))
    if (tab === "stock") setStockBajo(await fetchJson<StockBajoDetalle[]>(`/api/reportes?type=stock-bajo&${query}`))
    if (tab === "movimientos") setMovimientos(await fetchJson<MovimientoDetalle[]>(`/api/reportes?type=movimientos&${query}`))
    if (tab === "utilidad-bruta") setUtilidadBruta(await fetchJson<{ ventas: UtilidadBrutaVenta[]; resumen: UtilidadBrutaResumen }>(`/api/reportes?type=utilidad-bruta&${query}`))
    if (tab === "utilidad-por-producto") setUtilidadPorProducto(await fetchJson<UtilidadPorProductoItem[]>(`/api/reportes?type=utilidad-por-producto&${query}`))
  }

  const fetchData = async (start = startDate, end = endDate) => {
    if (!start || !end || start > end) {
      setError("Selecciona un rango de fechas válido.")
      toast.error("La fecha inicial no puede ser posterior a la fecha final")
      return false
    }
    setLoading(true)
    setError(null)
    try {
      const summary = await fetchJson<{ kpis: KPIs; grafico: VentasGrafico[]; vencer: ProductoVencer[] }>(
        `/api/reportes/resumen?${reportQuery(start, end)}`
      )
      setKpis(summary.kpis)
      setGrafico(summary.grafico)
      setVencer(summary.vencer)
      if (activeTab !== "resumen") await fetchTabData(activeTab, start, end)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al conectar con reportes"
      setError(message)
      toast.error(message)
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFilter = () => {
    fetchData(startDate, endDate)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    const ok = await fetchData(startDate, endDate)
    setRefreshing(false)
    if (ok) toast.success("Métricas actualizadas")
  }

  const handleTabChange = async (tab: ReportTab) => {
    setActiveTab(tab)
    setSearchQuery("")
    if (tab === "resumen") return
    setTabLoading(true)
    try {
      await fetchTabData(tab, startDate, endDate)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el reporte")
    } finally {
      setTabLoading(false)
    }
  }

  const handleExportExcel = async (sections = selectedExportSections) => {
    if (sections.length === 0) return toast.error("Selecciona al menos una sección")
    setTabLoading(true)
    try {
      toast.info("Preparando el Excel con las secciones seleccionadas…")
      const query = reportQuery(startDate, endDate)
      const period = `${startDate || "Inicio"} al ${endDate || "Hoy"}`
      const sectionData: {
        gross?: { ventas: UtilidadBrutaVenta[]; resumen: UtilidadBrutaResumen }
        productProfit?: UtilidadPorProductoItem[]
        products?: ProductoMasVendido[]
        clients?: ClienteFrecuente[]
        stock?: StockBajoDetalle[]
        movements?: MovimientoDetalle[]
      } = {}

      await Promise.all(
        sections.map(async (section) => {
          if (section === "utilidad-bruta") sectionData.gross = await fetchJson(`/api/reportes?type=utilidad-bruta&${query}`)
          if (section === "utilidad-por-producto") sectionData.productProfit = await fetchJson(`/api/reportes?type=utilidad-por-producto&${query}`)
          if (section === "productos") sectionData.products = await fetchJson(`/api/reportes?type=productos-mas-vendidos&${query}`)
          if (section === "clientes") sectionData.clients = await fetchJson(`/api/reportes?type=clientes-frecuentes&${query}`)
          if (section === "stock") sectionData.stock = await fetchJson(`/api/reportes?type=stock-bajo&${query}`)
          if (section === "movimientos") sectionData.movements = await fetchJson(`/api/reportes?type=movimientos&${query}`)
        }),
      )

      const workbook = createReportWorkbook()
      const currencyFormat = '"C$" #,##0.00'

      if (sections.includes("resumen") && kpis) {
        const summaryRows = [
          { metric: "Total ventas", value: kpis.totalVentas, type: "currency" },
          { metric: "Total compras", value: kpis.totalCompras, type: "currency" },
          { metric: "Utilidad bruta real", value: kpis.gananciaNeta, type: "currency" },
          { metric: "Margen bruto", value: kpis.margenPct / 100, type: "percent" },
          { metric: "Ticket promedio", value: kpis.ticketPromedio, type: "currency" },
          { metric: "Variación vs. período anterior", value: kpis.variacionVentasPct / 100, type: "percent" },
          { metric: "Transacciones totales", value: kpis.transaccionesCount, type: "number" },
          { metric: "Productos con stock bajo", value: kpis.stockBajo, type: "number" },
        ]
        appendReportSheet({
          workbook,
          sheetName: "Resumen",
          title: "FarmaPOS · Resumen general",
          period,
          rows: summaryRows,
          columns: [
            { header: "Métrica", width: 38, value: (row) => row.metric },
            { header: "Valor", width: 22, value: (row) => row.value, numberFormat: "#,##0.00" },
            { header: "Tipo", width: 16, value: (row) => row.type },
          ],
        })
        const sheet = workbook.Sheets.Resumen
        summaryRows.forEach((row, index) => {
          const cell = sheet[`B${index + 6}`]
          if (cell) cell.z = row.type === "currency" ? currencyFormat : row.type === "percent" ? "0.0%" : "#,##0"
        })
      }

      if (sections.includes("utilidad-bruta")) {
        appendReportSheet({
          workbook,
          sheetName: "Utilidad bruta",
          title: "FarmaPOS · Utilidad bruta por transacción",
          period,
          rows: sectionData.gross?.ventas || [],
          columns: [
            { header: "Venta", width: 12, value: (row) => row.id },
            { header: "Fecha", width: 16, value: (row) => new Date(row.fecha).toLocaleDateString("es-NI") },
            { header: "Cliente", width: 28, value: (row) => row.cliente },
            { header: "Total bruto", width: 17, value: (row) => row.totalBruto, numberFormat: currencyFormat },
            { header: "Desc. línea", width: 17, value: (row) => row.descuentoLineas, numberFormat: currencyFormat },
            { header: "Desc. general", width: 17, value: (row) => row.descuentoGeneral, numberFormat: currencyFormat },
            { header: "Total neto", width: 17, value: (row) => row.total, numberFormat: currencyFormat },
            { header: "Costo COGS", width: 17, value: (row) => row.cogs, numberFormat: currencyFormat },
            { header: "Utilidad", width: 17, value: (row) => row.utilidad, numberFormat: currencyFormat },
            { header: "Margen", width: 13, value: (row) => row.margenPct / 100, numberFormat: "0.0%" },
          ],
        })
      }

      if (sections.includes("utilidad-por-producto")) {
        appendReportSheet({
          workbook,
          sheetName: "Rentabilidad producto",
          title: "FarmaPOS · Rentabilidad por producto",
          period,
          rows: sectionData.productProfit || [],
          columns: [
            { header: "Producto", width: 34, value: (row) => row.nombre },
            { header: "Laboratorio", width: 24, value: (row) => row.laboratorio },
            { header: "Categoría", width: 22, value: (row) => row.categoria },
            { header: "Cant. vendida", width: 15, value: (row) => row.cantidadVendida },
            { header: "Ingresos brutos", width: 18, value: (row) => row.ingresosBrutos, numberFormat: currencyFormat },
            { header: "Descuento", width: 18, value: (row) => row.descuentoLinea + row.descuentoGeneralProrrateado, numberFormat: currencyFormat },
            { header: "Ingresos netos", width: 18, value: (row) => row.ingresosTotales, numberFormat: currencyFormat },
            { header: "Costo", width: 18, value: (row) => row.cogs, numberFormat: currencyFormat },
            { header: "Utilidad", width: 18, value: (row) => row.utilidad, numberFormat: currencyFormat },
            { header: "Margen", width: 13, value: (row) => row.margenPct / 100, numberFormat: "0.0%" },
          ],
        })
      }

      if (sections.includes("productos")) {
        appendReportSheet({
          workbook,
          sheetName: "Más vendidos",
          title: "FarmaPOS · Productos más vendidos",
          period,
          rows: (sectionData.products || []).map((product, index) => ({ ...product, rank: index + 1 })),
          columns: [
            { header: "Puesto", width: 10, value: (row) => row.rank },
            { header: "Producto", width: 34, value: (row) => row.nombre },
            { header: "Laboratorio", width: 24, value: (row) => row.laboratorio },
            { header: "Categoría", width: 22, value: (row) => row.categoria },
            { header: "Cantidad", width: 14, value: (row) => row.cantidad },
            { header: "Total recaudado", width: 20, value: (row) => row.total, numberFormat: currencyFormat },
          ],
        })
      }

      if (sections.includes("clientes")) {
        appendReportSheet({
          workbook,
          sheetName: "Clientes frecuentes",
          title: "FarmaPOS · Clientes frecuentes",
          period,
          rows: (sectionData.clients || []).map((client, index) => ({ ...client, rank: index + 1 })),
          columns: [
            { header: "Puesto", width: 10, value: (row) => row.rank },
            { header: "Cliente", width: 32, value: (row) => row.nombre },
            { header: "Cédula", width: 20, value: (row) => row.cedula },
            { header: "Compras", width: 14, value: (row) => row.comprasCount },
            { header: "Total comprado", width: 20, value: (row) => row.totalComprado, numberFormat: currencyFormat },
          ],
        })
      }

      if (sections.includes("stock")) {
        appendReportSheet({
          workbook,
          sheetName: "Stock bajo",
          title: "FarmaPOS · Productos con stock bajo",
          period,
          rows: sectionData.stock || [],
          columns: [
            { header: "Producto", width: 34, value: (row) => row.nombre },
            { header: "Categoría", width: 24, value: (row) => row.categoria },
            { header: "Stock actual", width: 16, value: (row) => row.stockActual },
            { header: "Stock mínimo", width: 16, value: (row) => row.stockMinimo },
            { header: "Faltante", width: 14, value: (row) => row.diferencia },
          ],
        })
      }

      if (sections.includes("movimientos")) {
        appendReportSheet({
          workbook,
          sheetName: "Movimientos",
          title: "FarmaPOS · Movimientos de inventario",
          period,
          rows: sectionData.movements || [],
          columns: [
            { header: "ID", width: 16, value: (row) => row.id },
            { header: "Tipo", width: 16, value: (row) => row.tipo },
            { header: "Fecha", width: 22, value: (row) => new Date(row.fecha).toLocaleString("es-NI") },
            { header: "Total", width: 18, value: (row) => row.total, numberFormat: currencyFormat },
            { header: "Usuario", width: 24, value: (row) => row.usuario },
            { header: "Detalle", width: 48, value: (row) => row.detalle },
          ],
        })
      }

      if (workbook.SheetNames.length === 0) throw new Error("No hay datos disponibles para las secciones seleccionadas")
      XLSX.writeFile(workbook, `Reporte_FarmaPOS_${startDate || "inicio"}_${endDate || "hoy"}.xlsx`, { compression: true })
      setExportOpen(false)
      toast.success(`Excel exportado con ${workbook.SheetNames.length} ${workbook.SheetNames.length === 1 ? "hoja" : "hojas"}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al exportar Excel")
    } finally {
      setTabLoading(false)
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
          ["ID Venta", "Fecha", "Cliente", "Total Bruto", "Descuento Linea", "Descuento General", "Total Descuento", "Total Neto", "Costo Ventas COGS", "Utilidad Bruta", "Margen %"],
          ...utilidadBruta.ventas.map((v: any) => [
            v.id,
            new Date(v.fecha).toLocaleDateString("es-NI"),
            `"${v.cliente.replace(/"/g, '""')}"`,
            v.totalBruto.toFixed(2),
            v.descuentoLineas.toFixed(2),
            v.descuentoGeneral.toFixed(2),
            v.totalDescuento.toFixed(2),
            v.total.toFixed(2),
            v.cogs.toFixed(2),
            v.utilidad.toFixed(2),
            `${v.margenPct.toFixed(1)}%`
          ])
        ].map(e => e.join(",")).join("\n")
        filename = "Utilidad_Bruta"
      } else if (activeTab === "utilidad-por-producto") {
        csvContent = [
          ["Producto", "Laboratorio", "Categoria", "Unidades Vendidas", "Ingresos Brutos", "Descuento Linea", "Descuento General Prorrateado", "Ingresos Netos", "Costo Compra COGS", "Utilidad Bruta", "Margen %"],
          ...utilidadPorProducto.map((p: any) => [
            `"${p.nombre.replace(/"/g, '""')}"`,
            `"${p.laboratorio.replace(/"/g, '""')}"`,
            `"${p.categoria.replace(/"/g, '""')}"`,
            p.cantidadVendida,
            p.ingresosBrutos.toFixed(2),
            p.descuentoLinea.toFixed(2),
            p.descuentoGeneralProrrateado.toFixed(2),
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

  const openExportDialog = (format: ExportFormat) => {
    setExportFormat(format)
    if (format === "pdf") {
      const preferred = exportOptions.find((option) => option.id === activeTab && option.pdfType)
      setSelectedExportSections([preferred?.id || "resumen"])
    } else if (selectedExportSections.length === 0) {
      setSelectedExportSections(exportOptions.map((option) => option.id))
    }
    setExportOpen(true)
  }

  const toggleExportSection = (section: ExportSection) => {
    if (exportFormat === "pdf") {
      setSelectedExportSections([section])
      return
    }
    setSelectedExportSections((current) =>
      current.includes(section) ? current.filter((item) => item !== section) : [...current, section],
    )
  }

  const confirmExport = async () => {
    if (selectedExportSections.length === 0) return toast.error("Selecciona al menos una sección")
    if (exportFormat === "excel") {
      await handleExportExcel(selectedExportSections)
      return
    }
    const selected = exportOptions.find((option) => option.id === selectedExportSections[0])
    if (!selected?.pdfType) return toast.error("Selecciona una sección disponible para PDF")
    window.open(`/api/reportes/export?type=${selected.pdfType}&startDate=${startDate}&endDate=${endDate}`, "_blank", "noopener,noreferrer")
    setExportOpen(false)
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
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
                <BarChart3 className="h-8 w-8 text-primary" />
                Reportes y Analíticas
              </h1>
              <p className="mt-1 text-muted-foreground">Monitoreo dinámico del rendimiento físico y financiero (Nicaragua)</p>
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
                onClick={() => openExportDialog("excel")}
                className="flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Download className="w-4 h-4" />
                Exportar Excel
              </Button>
              <Button 
                onClick={handleExportCSV} 
                className="flex items-center gap-2 bg-teal-600 text-white hover:bg-teal-700"
              >
                <Download className="w-4 h-4" />
                CSV
              </Button>
              <Button 
                onClick={() => openExportDialog("pdf")}
                className="flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <FileText className="w-4 h-4" />
                PDF Profesional
              </Button>
            </div>
          </div>

          {/* Filters Bar */}
          <Card className="glass-card mb-6 grid grid-cols-1 items-end gap-4 p-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Fecha Inicio
              </label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="border-border bg-muted/30"
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
                className="border-border bg-muted/30"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleApplyFilter} 
                disabled={loading} 
                className="min-w-36 flex-1"
              >
                Filtrar Rango
              </Button>
            </div>
          </Card>

          {/* Tab Navigation */}
          <div className="mb-6 flex gap-2 overflow-x-auto border-b border-border">
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
                  onClick={() => handleTabChange(tab.id as ReportTab)}
                  disabled={tabLoading}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-all ${
                    active 
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
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

          {error && (
            <Card className="mb-6 border-red-500/30 bg-red-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-red-600 dark:text-red-400">No se pudo cargar el reporte</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" onClick={() => fetchData(startDate, endDate)}>Reintentar</Button>
            </Card>
          )}

          {/* Content Loading */}
          {loading || tabLoading ? (
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
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Card className="glass-card border-l-4 border-l-blue-500 p-6 transition-transform hover:scale-[1.01]">
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

                    <Card className="glass-card border-l-4 border-l-amber-500 p-6 transition-transform hover:scale-[1.01]">
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

                    <Card className="glass-card border-l-4 border-l-emerald-500 p-6 transition-transform hover:scale-[1.01]">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Utilidad Bruta Real</p>
                          <h3 className={`text-2xl font-bold ${kpis && kpis.gananciaNeta >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                            C${kpis?.gananciaNeta.toFixed(2) || "0.00"}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-2">Ventas - Costos de Adquisición (COGS)</p>
                        </div>
                        <div className="p-2.5 bg-emerald-500/10 rounded-lg">
                          <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                        </div>
                      </div>
                    </Card>

                    <Card className="glass-card border-l-4 border-l-red-500 p-6 transition-transform hover:scale-[1.01]">
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

                    <Card className="glass-card border-l-4 border-l-cyan-500 p-6 transition-transform hover:scale-[1.01]">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Ticket Promedio</p>
                      <h3 className="text-2xl font-bold text-foreground">C${kpis?.ticketPromedio.toFixed(2) || "0.00"}</h3>
                      <p className="text-xs text-muted-foreground mt-2">Promedio por venta completada</p>
                    </Card>

                    <Card className="glass-card border-l-4 border-l-violet-500 p-6 transition-transform hover:scale-[1.01]">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Variación vs. período anterior</p>
                      <h3 className={`text-2xl font-bold ${(kpis?.variacionVentasPct || 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {(kpis?.variacionVentasPct || 0) >= 0 ? "+" : ""}{kpis?.variacionVentasPct.toFixed(1) || "0.0"}%
                      </h3>
                      <p className="text-xs text-muted-foreground mt-2">Margen bruto: {kpis?.margenPct.toFixed(1) || "0.0"}%</p>
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
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                              <XAxis dataKey="fecha" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `C$${value}`} />
                              <RechartsTooltip
                                formatter={(value: any) => [`C$${Number(value).toFixed(2)}`, "Ventas"]}
                                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--foreground)" }}
                              />
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
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <Card className="glass-card p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Ingresos Brutos</p>
                        <p className="text-xl font-bold text-foreground">C${utilidadBruta.resumen.totalVentasBrutas.toFixed(2)}</p>
                      </Card>
                      <Card className="glass-card p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Descuentos Totales</p>
                        <p className="text-xl font-bold text-red-500">C${utilidadBruta.resumen.totalDescuentos.toFixed(2)}</p>
                      </Card>
                      <Card className="glass-card p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Ingresos Netos</p>
                        <p className="text-xl font-bold text-foreground">C${utilidadBruta.resumen.totalVentas.toFixed(2)}</p>
                      </Card>
                      <Card className="glass-card p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Costo de Ventas (COGS)</p>
                        <p className="text-xl font-bold text-amber-500">C${utilidadBruta.resumen.totalCogs.toFixed(2)}</p>
                      </Card>
                      <Card className="glass-card p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Utilidad Bruta Acumulada</p>
                        <p className="text-xl font-bold text-emerald-500">C${utilidadBruta.resumen.totalUtilidad.toFixed(2)} ({(utilidadBruta.resumen.margenPct || 0).toFixed(1)}%)</p>
                      </Card>
                    </div>
                  )}

                  <Card className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/30 border-b border-border">
                          <tr>
                            {["Venta ID", "Fecha", "Cliente", "Total Bruto", "Desc. Línea", "Desc. Gral", "Total Neto", "Costo (COGS)", "Utilidad Bruta", "Margen %"].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {!utilidadBruta || utilidadBruta.ventas.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="px-6 py-8 text-center text-muted-foreground text-sm">No hay registros de utilidad en este rango</td>
                            </tr>
                          ) : (
                            utilidadBruta.ventas
                              .filter(v => filterBySearch(String(v.id)) || filterBySearch(v.cliente))
                              .map((v) => (
                                <tr key={v.id} className="hover:bg-muted/10 transition-colors">
                                  <td className="px-4 py-3 text-sm font-semibold text-primary">#{v.id}</td>
                                  <td className="px-4 py-3 text-sm text-muted-foreground">
                                    {new Date(v.fecha).toLocaleDateString("es-NI")}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium text-foreground">{v.cliente}</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-foreground">C${v.totalBruto.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-sm text-red-500">C${v.descuentoLineas.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-sm text-red-500">C${v.descuentoGeneral.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-foreground">C${v.total.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-sm text-amber-500">C${v.cogs.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-sm font-bold text-emerald-600">C${v.utilidad.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-muted-foreground">{v.margenPct.toFixed(1)}%</td>
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
                          {["Producto", "Laboratorio", "Categoría", "Cant. Vendida", "Total Bruto", "Desc. Línea", "Desc. Gral", "Total Neto", "Costo Total", "Utilidad Bruta", "Margen %"].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {utilidadPorProducto.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="px-6 py-8 text-center text-muted-foreground text-sm">No hay transacciones registradas</td>
                          </tr>
                        ) : (
                          utilidadPorProducto
                            .filter(p => filterBySearch(p.nombre) || filterBySearch(p.laboratorio) || filterBySearch(p.categoria))
                            .map((p) => (
                              <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-foreground">{p.nombre}</td>
                                <td className="px-4 py-3 text-sm text-muted-foreground">{p.laboratorio}</td>
                                <td className="px-4 py-3 text-sm text-muted-foreground">{p.categoria}</td>
                                <td className="px-4 py-3 text-sm text-foreground">{p.cantidadVendida} und</td>
                                <td className="px-4 py-3 text-sm font-semibold text-foreground">C${p.ingresosBrutos.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-red-500">C${p.descuentoLinea.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-red-500">C${p.descuentoGeneralProrrateado.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-foreground">C${p.ingresosTotales.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-amber-500">C${p.cogs.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm font-bold text-emerald-600">C${p.utilidad.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm font-bold text-primary">{p.margenPct.toFixed(1)}%</td>
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
                                <td className="px-6 py-4 text-sm font-bold text-amber-600 dark:text-amber-400">{s.diferencia} und</td>
                                <td className="px-6 py-4 text-sm">
                                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">Reabastecer</span>
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

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-h-[min(90vh,820px)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/9 text-primary">
              {exportFormat === "excel" ? <FileSpreadsheet className="size-5" /> : <FileText className="size-5" />}
            </div>
            <DialogTitle className="pt-2 text-xl">Configurar exportación</DialogTitle>
            <DialogDescription>
              Elige qué información aparecerá en el archivo. El rango actual es {startDate || "inicio"} al {endDate || "hoy"}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1.5">
            <button
              type="button"
              onClick={() => {
                setExportFormat("excel")
                if (selectedExportSections.length === 1) setSelectedExportSections(exportOptions.map((option) => option.id))
              }}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${exportFormat === "excel" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <FileSpreadsheet className="size-4" /> Excel
            </button>
            <button
              type="button"
              onClick={() => {
                setExportFormat("pdf")
                const current = exportOptions.find((option) => option.id === selectedExportSections[0] && option.pdfType)
                setSelectedExportSections([current?.id || "resumen"])
              }}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${exportFormat === "pdf" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <FileText className="size-4" /> PDF
            </button>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Contenido del archivo</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {exportFormat === "excel" ? "Cada sección se creará como una hoja espaciosa y filtrable." : "El PDF profesional se genera para una sección a la vez."}
                </p>
              </div>
              {exportFormat === "excel" && (
                <button
                  type="button"
                  onClick={() => setSelectedExportSections(selectedExportSections.length === exportOptions.length ? [] : exportOptions.map((option) => option.id))}
                  className="shrink-0 text-xs font-semibold text-primary hover:underline"
                >
                  {selectedExportSections.length === exportOptions.length ? "Quitar todo" : "Seleccionar todo"}
                </button>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              {exportOptions
                .filter((option) => exportFormat === "excel" || option.pdfType)
                .map((option) => {
                  const selected = selectedExportSections.includes(option.id)
                  return (
                    <button
                      type="button"
                      key={option.id}
                      onClick={() => toggleExportSection(option.id)}
                      className={`flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left transition-colors last:border-0 ${selected ? "bg-primary/[0.045]" : "bg-card hover:bg-muted/45"}`}
                    >
                      <span className={`flex size-5 shrink-0 items-center justify-center border ${exportFormat === "pdf" ? "rounded-full" : "rounded-md"} ${selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`}>
                        {selected && (exportFormat === "pdf" ? <span className="size-2 rounded-full bg-current" /> : <Check className="size-3.5" />)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground">{option.label}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{option.description}</span>
                      </span>
                    </button>
                  )
                })}
            </div>
          </div>

          {exportFormat === "excel" && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-200">
              <SlidersHorizontal className="mt-0.5 size-4 shrink-0" />
              <p className="leading-5">El nuevo formato agrega títulos, período, columnas amplias, alturas de fila cómodas, filtros y encabezados fijos.</p>
            </div>
          )}

          <DialogFooter className="sticky bottom-0 -mx-6 -mb-6 border-t border-border bg-background/96 px-6 py-4 backdrop-blur-sm">
            <Button variant="outline" onClick={() => setExportOpen(false)}>Cancelar</Button>
            <Button onClick={confirmExport} disabled={tabLoading || selectedExportSections.length === 0}>
              {tabLoading ? <Loader2 className="animate-spin" /> : <Download />}
              {tabLoading ? "Preparando…" : `Exportar ${exportFormat === "excel" ? "Excel" : "PDF"}`}
              {!tabLoading && <ChevronRight />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
