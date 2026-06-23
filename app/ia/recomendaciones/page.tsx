"use client"

import { useState, useEffect, useCallback } from "react"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import {
  Sparkles, RefreshCw, AlertTriangle, Package, Clock,
  TrendingUp, ShieldAlert, Info, Loader2, CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import type { RecomendacionIA } from "@/lib/ia/types"

// ---------------------------------------------------------------------------
// Configuración de criticidad
// ---------------------------------------------------------------------------

const CRITICIDAD_CONFIG = {
  ALTA:  { color: "border-red-500/40 bg-red-500/5",   badge: "bg-red-500/15 text-red-500",   icon: AlertTriangle, label: "Crítico" },
  MEDIA: { color: "border-amber-500/40 bg-amber-500/5", badge: "bg-amber-500/15 text-amber-500", icon: Clock, label: "Alerta" },
  BAJA:  { color: "border-blue-500/40 bg-blue-500/5",  badge: "bg-blue-500/15 text-blue-500",  icon: Info, label: "Info" },
}

const TIPO_CONFIG: Record<RecomendacionIA["tipo"], { icon: React.ElementType; label: string; color: string }> = {
  LOTE_VENCIDO:     { icon: AlertTriangle, label: "Lote Vencido",        color: "text-red-500" },
  LOTE_POR_VENCER:  { icon: Clock,         label: "Por Vencer",           color: "text-amber-500" },
  STOCK_CRITICO:    { icon: Package,        label: "Stock Crítico",        color: "text-orange-500" },
  REABASTECIMIENTO: { icon: TrendingUp,     label: "Reabastecimiento",     color: "text-blue-500" },
  INCONSISTENCIA:   { icon: ShieldAlert,    label: "Inconsistencia Inv.",  color: "text-purple-500" },
}

// ---------------------------------------------------------------------------
// Tarjeta de recomendación
// ---------------------------------------------------------------------------

function RecomendacionCard({ rec }: { rec: RecomendacionIA }) {
  const crit = CRITICIDAD_CONFIG[rec.criticidad]
  const tipo = TIPO_CONFIG[rec.tipo]
  const TipoIcon = tipo.icon
  const CritIcon = crit.icon

  return (
    <div className={`rounded-xl border p-4 space-y-2.5 transition-all duration-200 hover:shadow-md ${crit.color}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <TipoIcon className={`w-4 h-4 shrink-0 ${tipo.color}`} />
          <span className={`text-xs font-semibold ${tipo.color}`}>{tipo.label}</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${crit.badge}`}>
          <CritIcon className="w-3 h-3" />
          {crit.label}
        </span>
      </div>

      {/* Producto */}
      <h3 className="text-sm font-bold text-foreground leading-tight line-clamp-2">{rec.producto}</h3>

      {/* Descripción */}
      <p className="text-xs text-muted-foreground leading-relaxed">{rec.descripcion}</p>

      {/* Acción sugerida */}
      <div className="flex items-start gap-1.5 text-xs bg-muted/40 rounded-lg px-3 py-2">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500 mt-0.5" />
        <span className="text-foreground/80">{rec.accionSugerida}</span>
      </div>

      {/* Días de inventario */}
      {rec.diasInventario !== undefined && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3 text-amber-500" />
          <span>Inventario estimado: <strong className="text-foreground">{rec.diasInventario} día(s)</strong></span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Resumen de contadores
// ---------------------------------------------------------------------------

function SummaryCounter({ label, count, color, icon: Icon }: {
  label: string
  count: number
  color: string
  icon: React.ElementType
}) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${color} bg-card/60`}>
      <div className={`p-2 rounded-lg ${color.replace("border-", "bg-").replace("/40", "/15")}`}>
        <Icon className={`w-4 h-4 ${color.replace("border-", "text-").replace("/40", "")}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{count}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function RecomendacionesIAPage() {
  const [recomendaciones, setRecomendaciones] = useState<RecomendacionIA[]>([])
  const [loading, setLoading] = useState(true)
  const [fechaGeneracion, setFechaGeneracion] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<RecomendacionIA["tipo"] | "TODAS">("TODAS")
  const [filtroCriticidad, setFiltroCriticidad] = useState<RecomendacionIA["criticidad"] | "TODAS">("TODAS")

  const cargarRecomendaciones = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/ia/recomendaciones")
      if (!res.ok) {
        if (res.status === 401) { toast.error("No autorizado. Por favor inicia sesión."); return }
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      setRecomendaciones(data.recomendaciones ?? [])
      setFechaGeneracion(data.fechaGeneracion ?? null)
    } catch {
      toast.error("Error al cargar las recomendaciones de la IA.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargarRecomendaciones() }, [cargarRecomendaciones])

  const filtradas = recomendaciones.filter((r) => {
    if (filtroTipo !== "TODAS" && r.tipo !== filtroTipo) return false
    if (filtroCriticidad !== "TODAS" && r.criticidad !== filtroCriticidad) return false
    return true
  })

  const conteoAltas = recomendaciones.filter((r) => r.criticidad === "ALTA").length
  const conteoMedias = recomendaciones.filter((r) => r.criticidad === "MEDIA").length
  const conteoLotes = recomendaciones.filter((r) => r.tipo === "LOTE_VENCIDO").length
  const conteoStock = recomendaciones.filter((r) => r.tipo === "STOCK_CRITICO").length

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">

        {/* Header */}
        <header className="px-4 sm:px-6 py-4 border-b border-border bg-card/70 backdrop-blur-md flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">Recomendaciones IA</h1>
              {fechaGeneracion && (
                <p className="text-[11px] text-muted-foreground">
                  Generadas el {new Date(fechaGeneracion).toLocaleString("es-NI")}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={cargarRecomendaciones}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* Contadores resumen */}
            {!loading && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCounter label="Alertas Críticas" count={conteoAltas} color="border-red-500/40" icon={AlertTriangle} />
                <SummaryCounter label="Alertas Medias" count={conteoMedias} color="border-amber-500/40" icon={Clock} />
                <SummaryCounter label="Lotes Vencidos" count={conteoLotes} color="border-red-600/40" icon={Package} />
                <SummaryCounter label="Stock Crítico" count={conteoStock} color="border-orange-500/40" icon={TrendingUp} />
              </div>
            )}

            {/* Filtros */}
            {!loading && recomendaciones.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted-foreground font-medium">Criticidad:</span>
                {(["TODAS", "ALTA", "MEDIA", "BAJA"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setFiltroCriticidad(c)}
                    className={`text-xs px-3 py-1 rounded-full border transition-all ${
                      filtroCriticidad === c
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >{c}</button>
                ))}
                <span className="text-xs text-muted-foreground font-medium ml-2">Tipo:</span>
                {(["TODAS", "LOTE_VENCIDO", "LOTE_POR_VENCER", "STOCK_CRITICO", "REABASTECIMIENTO", "INCONSISTENCIA"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFiltroTipo(t)}
                    className={`text-xs px-3 py-1 rounded-full border transition-all ${
                      filtroTipo === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >{t === "TODAS" ? "Todas" : TIPO_CONFIG[t]?.label ?? t}</button>
                ))}
              </div>
            )}

            {/* Estado de carga */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Sparkles className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-sm font-medium text-foreground">Analizando el sistema...</p>
                  <p className="text-xs text-muted-foreground">Revisando stock, lotes, ventas e inventario.</p>
                </div>
              </div>
            )}

            {/* Sin recomendaciones */}
            {!loading && recomendaciones.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">¡Todo en orden!</p>
                  <p className="text-xs text-muted-foreground mt-1">No se encontraron alertas ni recomendaciones activas.</p>
                </div>
              </div>
            )}

            {/* Sin resultados filtrados */}
            {!loading && recomendaciones.length > 0 && filtradas.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Sin resultados con los filtros seleccionados.
              </div>
            )}

            {/* Grid de recomendaciones */}
            {!loading && filtradas.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtradas.map((rec, idx) => (
                  <RecomendacionCard key={idx} rec={rec} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
