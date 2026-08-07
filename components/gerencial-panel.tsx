"use client"
import useSWR from "swr"
import { Card } from "@/components/ui/card"
import { useCurrentUser } from "@/app/hooks/useCurrentUser"

const fetcher = (url: string) => fetch(url).then(async (r) => { if (!r.ok) throw new Error("Error"); return r.json() })

export function GerencialPanel() {
  const { user } = useCurrentUser()
  const { data } = useSWR(user?.rolNombre === "ADMIN" ? "/api/dashboard/gerencial" : null, fetcher, { revalidateOnFocus: false })
  if (user?.rolNombre !== "ADMIN" || !data) return null
  const items = [
    ["Ventas 30 días", `C$${Number(data.ventas.total).toFixed(2)}`], ["Ganancia estimada", `C$${Number(data.gananciaEstimada).toFixed(2)}`],
    ["Stock bajo", data.stockBajo], ["Lotes por vencer", data.lotesPorVencer], ["Inventario inmovilizado", `C$${Number(data.inventarioInmovilizado.valor).toFixed(2)}`], ["Diferencias de caja", data.diferenciasCaja.pendientes],
  ]
  return <section className="mb-8"><h2 className="text-lg font-bold mb-4">Indicadores gerenciales</h2><div className="grid grid-cols-2 lg:grid-cols-3 gap-3">{items.map(([label, value]) => <Card key={String(label)} className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-xl font-bold mt-1">{value}</p></Card>)}</div></section>
}
