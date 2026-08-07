"use client"
import useSWR from "swr"
import { Bell, AlertTriangle } from "lucide-react"
import { Card } from "@/components/ui/card"

const fetcher = (url: string) => fetch(url).then(async (r) => { if (!r.ok) throw new Error("Error"); return r.json() })

export function DashboardReminders() {
  const { data } = useSWR("/api/recordatorios", fetcher, { refreshInterval: 0, revalidateOnFocus: false })
  const items = data?.recordatorios?.slice(0, 6) || []
  return <Card className="glass-card p-6 mb-8">
    <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /> Centro de recordatorios</h2><span className="text-xs text-muted-foreground">Actualización al abrir el dashboard</span></div>
    {items.length === 0 ? <p className="text-sm text-muted-foreground">No hay recordatorios pendientes para tu rol.</p> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{items.map((item: any) => <a key={item.id} href={item.href} className="rounded-xl border border-border bg-muted/20 p-3 hover:bg-muted/40 transition-colors"><p className="text-sm font-semibold flex items-center gap-2">{item.prioridad === "ALTA" && <AlertTriangle className="w-4 h-4 text-amber-500" />}{item.titulo}</p><p className="text-xs text-muted-foreground mt-1">{item.detalle}</p>{item.fechaObjetivo && <p className="text-[11px] text-primary mt-2">{new Date(item.fechaObjetivo).toLocaleString("es-NI")}</p>}</a>)}</div>}
  </Card>
}
