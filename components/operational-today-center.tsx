"use client"

import Link from "next/link"
import useSWR from "swr"
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, PackageSearch, ReceiptText, WalletCards } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || "No se pudo cargar el centro operativo")
  return data
}

const icons = { VENCIMIENTO: PackageSearch, RECETA: ClipboardList, STOCK: ReceiptText, CAJA: WalletCards }
const tones = {
  CRITICO: { border: "border-red-500/35", surface: "bg-red-500/5", icon: "text-red-600 bg-red-500/10", count: "text-red-600" },
  ATENCION: { border: "border-amber-500/30", surface: "bg-amber-500/5", icon: "text-amber-600 bg-amber-500/10", count: "text-amber-600" },
  SANO: { border: "border-emerald-500/25", surface: "bg-emerald-500/5", icon: "text-emerald-600 bg-emerald-500/10", count: "text-emerald-600" },
}

export function OperationalTodayCenter() {
  const { data, error, isLoading } = useSWR("/api/dashboard/hoy", fetcher, { refreshInterval: 60000 })
  const alertas = data?.alertas || []
  const pendientes = alertas.reduce((sum: number, alerta: any) => sum + Number(alerta.total || 0), 0)

  return (
    <section className="mb-8" aria-labelledby="centro-operativo-title">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Centro operativo</p>
          </div>
          <h2 id="centro-operativo-title" className="mt-1 text-2xl font-bold tracking-tight">Hoy</h2>
          <p className="mt-1 text-sm text-muted-foreground">Lo que necesita atención y la acción directa para resolverlo.</p>
        </div>
        {!isLoading && !error && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {pendientes === 0 ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertTriangle className="size-4 text-amber-600" />}
            {pendientes === 0 ? "Operación al día" : `${pendientes} pendientes en total`}
          </div>
        )}
      </div>

      {error ? (
        <Card className="border-red-500/25 p-5 text-sm text-red-600">No se pudo actualizar el centro operativo. Recarga la página para intentarlo nuevamente.</Card>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-56 rounded-2xl" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {alertas.map((alerta: any) => {
            const Icon = icons[alerta.tipo as keyof typeof icons] || AlertTriangle
            const tone = tones[alerta.nivel as keyof typeof tones] || tones.ATENCION
            return (
              <Card key={alerta.id} className={`flex min-h-56 flex-col border ${tone.border} ${tone.surface} p-5 shadow-sm`}>
                <div className="flex items-start justify-between gap-3">
                  <div className={`rounded-xl p-2.5 ${tone.icon}`}><Icon className="size-5" /></div>
                  <span className={`text-3xl font-bold tabular-nums ${tone.count}`}>{alerta.total}</span>
                </div>
                <h3 className="mt-4 font-semibold">{alerta.titulo}</h3>
                <div className="mt-2 min-h-12 flex-1">
                  {alerta.detalle?.length ? (
                    <div className="space-y-1.5">
                      {alerta.detalle.slice(0, 2).map((item: any) => (
                        <p key={item.id} className="truncate text-xs text-muted-foreground"><span className="font-medium text-foreground">{item.principal}</span> · {item.secundario}</p>
                      ))}
                      {alerta.total > 2 && <p className="text-xs font-medium text-muted-foreground">+{alerta.total - 2} pendientes más</p>}
                    </div>
                  ) : <p className="flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 className="size-3.5" /> Sin pendientes</p>}
                </div>
                <Button asChild variant={alerta.total ? "default" : "outline"} size="sm" className="mt-4 w-full justify-between">
                  <Link href={alerta.href}>{alerta.accion}<ArrowRight className="size-4" /></Link>
                </Button>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}
