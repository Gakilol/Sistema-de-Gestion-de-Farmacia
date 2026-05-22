"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import useSWR from "swr"
import {
  ClipboardList,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  Package,
  LogIn,
  Users,
  RefreshCw,
  BarChart2,
  Filter,
  Search,
  CalendarDays,
  Layers,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// ── Mapas de colores y etiquetas por tipo de acción ──────────────────────────
const ACCION_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  INICIO_SESION:       { color: "text-sky-400",    bg: "bg-sky-500/10 border-sky-500/20",       icon: LogIn,      label: "Inicio de Sesión" },
  CREAR_VENTA:         { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: ShoppingCart, label: "Venta Registrada" },
  CREAR_COMPRA:        { color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20", icon: BarChart2,  label: "Compra Registrada" },
  CREAR_PRODUCTO:      { color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20",   icon: Package,    label: "Producto Creado" },
  ACTUALIZAR_PRODUCTO: { color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20",     icon: Package,    label: "Producto Actualizado" },
  ACTIVAR_PRODUCTO:    { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: Package,  label: "Producto Activado" },
  DESACTIVAR_PRODUCTO: { color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20",       icon: Package,    label: "Producto Desactivado" },
  AJUSTE_STOCK:        { color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/20", icon: Layers,     label: "Ajuste de Stock" },
}

const ACCION_DEFAULT = { color: "text-muted-foreground", bg: "bg-muted/50 border-border", icon: ClipboardList, label: "Acción del Sistema" }

function getAccionConfig(accion: string) {
  return ACCION_CONFIG[accion] ?? ACCION_DEFAULT
}

function formatRelativeTime(date: string) {
  const now = new Date()
  const d = new Date(date)
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return `hace ${diff}s`
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  return d.toLocaleDateString("es-NI", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

// ── Fila de Log expandible ────────────────────────────────────────────────────
function LogRow({ log }: { log: any }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = getAccionConfig(log.accion)
  const Icon = cfg.icon

  let detallesObj: any = null
  try {
    if (log.detalles) detallesObj = JSON.parse(log.detalles)
  } catch { /* json parse failed silently */ }

  return (
    <div className={`rounded-xl border transition-all duration-200 ${expanded ? "bg-muted/30" : "hover:bg-muted/20"}`}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Icono de acción */}
        <div className={`p-2 rounded-lg border shrink-0 ${cfg.bg}`}>
          <Icon className={`w-4 h-4 ${cfg.color}`} />
        </div>

        {/* Contenido principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold uppercase tracking-wide ${cfg.color}`}>
              {cfg.label}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{log.entidad} #{log.entidadId ?? "—"}</span>
          </div>
          <p className="text-sm text-foreground mt-0.5 truncate">
            {log.usuario?.nombreCompleto ?? "Sistema"}
            <span className="text-muted-foreground font-normal"> · {formatRelativeTime(log.createdAt)}</span>
          </p>
        </div>

        {/* Timestamp completo */}
        <span className="hidden md:block text-xs text-muted-foreground whitespace-nowrap">
          {new Date(log.createdAt).toLocaleDateString("es-NI", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
          })}
        </span>

        {/* Chevron */}
        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {/* Detalles expandidos */}
      {expanded && detallesObj && (
        <div className="px-4 pb-4">
          <div className="rounded-lg bg-muted/40 border border-border p-4 font-mono text-xs overflow-x-auto">
            <pre className="text-muted-foreground whitespace-pre-wrap break-all">
              {JSON.stringify(detallesObj, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página Principal ──────────────────────────────────────────────────────────
type FiltroAccion = "TODOS" | "INICIO_SESION" | "CREAR_VENTA" | "CREAR_COMPRA" | "CREAR_PRODUCTO" | "ACTUALIZAR_PRODUCTO" | "AJUSTE_STOCK" | "ACTIVAR_PRODUCTO" | "DESACTIVAR_PRODUCTO"

export default function AuditoriaPage() {
  const router = useRouter()

  // Filtros
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [accionFiltro, setAccionFiltro] = useState<FiltroAccion>("TODOS")
  const [buscarUsuario, setBuscarUsuario] = useState("")
  const [page, setPage] = useState(1)

  // Construir URL de la API con los filtros activos
  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (startDate) params.set("startDate", startDate)
    if (endDate) params.set("endDate", endDate)
    if (accionFiltro !== "TODOS") params.set("accion", accionFiltro)
    if (buscarUsuario.trim()) params.set("usuario", buscarUsuario.trim())
    params.set("page", String(page))
    params.set("limit", "30")
    return `/api/auditoria?${params.toString()}`
  }, [startDate, endDate, accionFiltro, buscarUsuario, page])

  const { data, isLoading, mutate } = useSWR(buildUrl, fetcher, {
    onError: (err) => {
      if (err?.status === 401 || err?.status === 403) router.push("/login")
    }
  })

  const logs: any[] = data?.logs ?? []
  const pagination = data?.pagination
  const stats = data?.stats

  const accionOptions: { value: FiltroAccion; label: string }[] = [
    { value: "TODOS", label: "Todas las acciones" },
    { value: "INICIO_SESION", label: "Inicio de Sesión" },
    { value: "CREAR_VENTA", label: "Ventas" },
    { value: "CREAR_COMPRA", label: "Compras" },
    { value: "CREAR_PRODUCTO", label: "Crear Producto" },
    { value: "ACTUALIZAR_PRODUCTO", label: "Actualizar Producto" },
    { value: "AJUSTE_STOCK", label: "Ajustes de Stock" },
    { value: "ACTIVAR_PRODUCTO", label: "Activar Producto" },
    { value: "DESACTIVAR_PRODUCTO", label: "Desactivar Producto" },
  ]

  function handleFiltrar() {
    setPage(1)
    mutate()
  }

  function handleLimpiar() {
    setStartDate("")
    setEndDate("")
    setAccionFiltro("TODOS")
    setBuscarUsuario("")
    setPage(1)
  }

  if (isLoading && !data) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4 pt-16 md:p-8 md:pt-8">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-72 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <Skeleton className="h-[500px] w-full rounded-xl" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">

          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                  <ClipboardList className="w-6 h-6 text-primary" />
                </div>
                Auditoría del Sistema
              </h1>
              <p className="text-muted-foreground mt-1">
                Historial completo de acciones realizadas por los usuarios
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              className="gap-2 self-start md:self-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </Button>
          </div>

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="glass-card glow-hover p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones Hoy</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{stats?.accionesHoy ?? "—"}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20">
                  <ClipboardList className="w-5 h-5 text-sky-400" />
                </div>
              </div>
            </Card>
            <Card className="glass-card glow-hover p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total en Período
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-2">{stats?.totalPeriodo ?? "—"}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <BarChart2 className="w-5 h-5 text-violet-400" />
                </div>
              </div>
            </Card>
            <Card className="glass-card glow-hover p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuarios Activos</p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {logs.length > 0
                      ? new Set(logs.map((l: any) => l.idUsuario).filter(Boolean)).size
                      : "—"}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
            </Card>
          </div>

          {/* ── Filtros ── */}
          <Card className="glass-card p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Filtros</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Fecha inicio */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> Desde
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              {/* Fecha fin */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> Hasta
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              {/* Tipo de acción */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tipo de Acción</label>
                <select
                  value={accionFiltro}
                  onChange={e => setAccionFiltro(e.target.value as FiltroAccion)}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {accionOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {/* Buscar usuario */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Search className="w-3 h-3" /> Buscar usuario
                </label>
                <input
                  type="text"
                  placeholder="Nombre del usuario..."
                  value={buscarUsuario}
                  onChange={e => setBuscarUsuario(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleFiltrar} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                <Filter className="w-3.5 h-3.5" />
                Aplicar Filtros
              </Button>
              <Button onClick={handleLimpiar} variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                Limpiar
              </Button>
            </div>
          </Card>

          {/* ── Lista de Logs ── */}
          <Card className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                Registros de Actividad
                {pagination && (
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    ({pagination.total} total)
                  </span>
                )}
              </h2>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm">No hay registros de auditoría para los filtros seleccionados.</p>
                <p className="text-xs mt-1 opacity-70">Prueba cambiando el rango de fechas o los filtros.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log: any) => (
                  <LogRow key={log.id} log={log} />
                ))}
              </div>
            )}

            {/* Paginación */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Página {pagination.page} de {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </Card>

        </div>
      </main>
    </div>
  )
}
