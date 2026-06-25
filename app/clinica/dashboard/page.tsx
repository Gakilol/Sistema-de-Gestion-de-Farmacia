"use client"

import { useEffect, useState, useCallback } from "react"
import { Sidebar } from "@/components/sidebar"
import { useCurrentUser } from "@/app/hooks/useCurrentUser"
import { useRouter } from "next/navigation"
import {
  Activity, Calendar, ClipboardList, Users, Pill, TrendingUp,
  CheckCircle, Clock, XCircle, Download, RefreshCw, BarChart2,
  AlertCircle, Stethoscope
} from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"

// ─── Recharts (dynamic import for SSR safety) ──────────────────────────────
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts"

// ─── Color Palette ─────────────────────────────────────────────────────────
const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#84cc16", "#ec4899", "#f97316", "#6366f1"]

// ─── Types ─────────────────────────────────────────────────────────────────
interface DashboardData {
  periodo: string
  hoy: {
    citasPendientes: number
    citasCompletadas: number
    citasCanceladas: number
    totalCitas: number
  }
  resumenPeriodo: {
    totalConsultas: number
    totalRecetas: number
    totalPacientesAtendidos: number
    costoInsumos: number
    unidadesInsumosUsadas: number
  }
  distribucionCitas: { PENDIENTE: number; COMPLETADA: number; CANCELADA: number }
  topDiagnosticos: { nombre: string; codigo: string | null; cantidad: number }[]
  topTratamientos: { nombre: string; cantidad: number }[]
  tendenciaConsultas: { fecha: string; consultas: number }[]
  generadoEn: string
}

export default function ClinicaDashboardPage() {
  const { user, loading: userLoading } = useCurrentUser()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<"semana" | "mes" | "año">("mes")
  const [exportando, setExportando] = useState(false)

  const isAuthorized = user?.rolNombre === "ADMIN" || user?.rolNombre === "DOCTOR"

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/clinica/dashboard?periodo=${periodo}`)
      if (!res.ok) {
        if (res.status === 403) {
          toast.error("Acceso denegado: no tienes permiso para ver el dashboard clínico")
          router.push("/")
          return
        }
        throw new Error("Error al cargar dashboard")
      }
      const json = await res.json()
      setData(json)
    } catch {
      toast.error("Error al cargar datos del dashboard clínico")
    } finally {
      setLoading(false)
    }
  }, [periodo, router])

  useEffect(() => {
    if (!userLoading && !isAuthorized) {
      router.push("/acceso-denegado")
    }
  }, [userLoading, isAuthorized, router])

  useEffect(() => {
    if (isAuthorized) fetchDashboard()
  }, [fetchDashboard, isAuthorized])

  // ─── Export to Excel ────────────────────────────────────────────────────
  const exportarExcel = async () => {
    setExportando(true)
    try {
      const res = await fetch(`/api/clinica/reportes?periodo=${periodo}`)
      const json = await res.json()

      const wb = XLSX.utils.book_new()

      // Hoja 1: Consultas
      if (json.consultas?.length > 0) {
        const ws = XLSX.utils.json_to_sheet(json.consultas)
        XLSX.utils.book_append_sheet(wb, ws, "Consultas")
      }

      // Hoja 2: Resumen
      if (json.resumen) {
        const resumenRows = Object.entries(json.resumen).map(([k, v]) => ({ Métrica: k, Valor: String(v) }))
        const wsR = XLSX.utils.json_to_sheet(resumenRows)
        XLSX.utils.book_append_sheet(wb, wsR, "Resumen")
      }

      // Hoja 3: Diagnósticos Top
      if (data?.topDiagnosticos?.length) {
        const wsDx = XLSX.utils.json_to_sheet(data.topDiagnosticos.map((d, i) => ({
          "#": i + 1, Diagnóstico: d.nombre, "Código CIE-10": d.codigo ?? "", Frecuencia: d.cantidad
        })))
        XLSX.utils.book_append_sheet(wb, wsDx, "Top Diagnósticos")
      }

      // Hoja 4: Tratamientos Top
      if (data?.topTratamientos?.length) {
        const wsTx = XLSX.utils.json_to_sheet(data.topTratamientos.map((t, i) => ({
          "#": i + 1, Tratamiento: t.nombre, "Veces Aplicado": t.cantidad
        })))
        XLSX.utils.book_append_sheet(wb, wsTx, "Top Tratamientos")
      }

      const fecha = new Date().toISOString().split("T")[0]
      XLSX.writeFile(wb, `Reporte_Clinico_${fecha}.xlsx`)
      toast.success("Reporte exportado exitosamente")
    } catch {
      toast.error("Error al exportar el reporte")
    } finally {
      setExportando(false)
    }
  }

  if (userLoading || loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">Cargando dashboard clínico...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!data) return null

  const pieData = [
    { name: "Pendientes", value: data.distribucionCitas.PENDIENTE, color: "#f59e0b" },
    { name: "Completadas", value: data.distribucionCitas.COMPLETADA, color: "#10b981" },
    { name: "Canceladas", value: data.distribucionCitas.CANCELADA, color: "#ef4444" },
  ].filter((d) => d.value > 0)

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Dashboard Clínico</h1>
                <p className="text-xs text-muted-foreground">Podología — Métricas en tiempo real</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Selector de Período */}
              <div className="flex bg-muted rounded-lg p-1 gap-1">
                {(["semana", "mes", "año"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriodo(p)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      periodo === p
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p === "semana" ? "7 días" : p === "mes" ? "30 días" : "12 meses"}
                  </button>
                ))}
              </div>
              <button
                onClick={fetchDashboard}
                disabled={loading}
                className="p-2 rounded-lg bg-muted hover:bg-muted/70 transition-colors"
                title="Actualizar"
              >
                <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={exportarExcel}
                disabled={exportando}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                {exportando ? "Exportando..." : "Exportar Excel"}
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* ── Tarjetas Hoy ──────────────────────────────────────────── */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Citas de Hoy
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                icon={<Calendar className="w-5 h-5" />}
                label="Total Citas"
                value={data.hoy.totalCitas}
                color="blue"
              />
              <StatCard
                icon={<Clock className="w-5 h-5" />}
                label="Pendientes"
                value={data.hoy.citasPendientes}
                color="amber"
              />
              <StatCard
                icon={<CheckCircle className="w-5 h-5" />}
                label="Completadas"
                value={data.hoy.citasCompletadas}
                color="emerald"
              />
              <StatCard
                icon={<XCircle className="w-5 h-5" />}
                label="Canceladas"
                value={data.hoy.citasCanceladas}
                color="red"
              />
            </div>
          </div>

          {/* ── Métricas del Período ─────────────────────────────────── */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <BarChart2 className="w-4 h-4" />
              Período: {periodo === "semana" ? "Últimos 7 días" : periodo === "mes" ? "Últimos 30 días" : "Último año"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <StatCard icon={<ClipboardList className="w-5 h-5" />} label="Consultas" value={data.resumenPeriodo.totalConsultas} color="violet" />
              <StatCard icon={<Users className="w-5 h-5" />} label="Pacientes" value={data.resumenPeriodo.totalPacientesAtendidos} color="blue" />
              <StatCard icon={<Activity className="w-5 h-5" />} label="Recetas" value={data.resumenPeriodo.totalRecetas} color="emerald" />
              <StatCard icon={<Pill className="w-5 h-5" />} label="Unid. Insumos" value={data.resumenPeriodo.unidadesInsumosUsadas} color="amber" />
              <StatCard
                icon={<TrendingUp className="w-5 h-5" />}
                label="Costo Insumos"
                value={`C$ ${data.resumenPeriodo.costoInsumos.toFixed(2)}`}
                color="red"
                isMonetary
              />
            </div>
          </div>

          {/* ── Gráficos Row 1 ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tendencia de Consultas */}
            <ChartCard title="Tendencia de Consultas (30 días)" icon={<TrendingUp className="w-4 h-4" />}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.tendenciaConsultas} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="fecha"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => v.slice(5)} // MM-DD
                  />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    labelFormatter={(v) => `Fecha: ${v}`}
                  />
                  <Line type="monotone" dataKey="consultas" stroke="#10b981" strokeWidth={2.5} dot={false} name="Consultas" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Distribución de Citas por Estado */}
            <ChartCard title="Distribución de Citas (período)" icon={<AlertCircle className="w-4 h-4" />}>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                  Sin citas registradas en el período
                </div>
              )}
            </ChartCard>
          </div>

          {/* ── Gráficos Row 2 ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Diagnósticos */}
            <ChartCard title="Top 10 Diagnósticos" icon={<ClipboardList className="w-4 h-4" />}>
              {data.topDiagnosticos.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={data.topDiagnosticos}
                    layout="vertical"
                    margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      width={150}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 22) + "…" : v}
                    />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Bar dataKey="cantidad" name="Incidencias" radius={[0, 4, 4, 0]}>
                      {data.topDiagnosticos.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  Sin diagnósticos registrados en el período
                </div>
              )}
            </ChartCard>

            {/* Top Tratamientos */}
            <ChartCard title="Top 10 Tratamientos" icon={<Activity className="w-4 h-4" />}>
              {data.topTratamientos.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={data.topTratamientos}
                    layout="vertical"
                    margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      width={150}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 22) + "…" : v}
                    />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Bar dataKey="cantidad" name="Aplicaciones" radius={[0, 4, 4, 0]}>
                      {data.topTratamientos.map((_, i) => (
                        <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  Sin tratamientos registrados en el período
                </div>
              )}
            </ChartCard>
          </div>

          {/* Footer */}
          <p className="text-xs text-muted-foreground text-center pb-4">
            Datos generados: {new Date(data.generadoEn).toLocaleString("es-NI")} • Solo visible para ADMIN y DOCTOR
          </p>
        </div>
      </main>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, color, isMonetary
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  color: "blue" | "amber" | "emerald" | "red" | "violet"
  isMonetary?: boolean
}) {
  const colorMap = {
    blue: "from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/20",
    amber: "from-amber-500/20 to-amber-600/10 text-amber-400 border-amber-500/20",
    emerald: "from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/20",
    red: "from-red-500/20 to-red-600/10 text-red-400 border-red-500/20",
    violet: "from-violet-500/20 to-violet-600/10 text-violet-400 border-violet-500/20",
  }
  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-xl p-4 space-y-2`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <div className={`${colorMap[color].split(" ")[2]}`}>{icon}</div>
      </div>
      <p className={`text-2xl font-bold ${colorMap[color].split(" ")[2]}`}>
        {isMonetary ? value : typeof value === "number" ? value.toLocaleString("es-NI") : value}
      </p>
    </div>
  )
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-emerald-400">{icon}</div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  )
}
