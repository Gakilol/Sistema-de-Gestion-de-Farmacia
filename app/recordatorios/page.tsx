"use client"

import useSWR from "swr"
import { BellRing, CheckCircle2, ExternalLink, Mail, MessageCircle, Phone, RefreshCw, Send } from "lucide-react"
import { toast } from "sonner"

import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error || "No se pudieron cargar los recordatorios")
  return payload
}

const icons = { WHATSAPP: MessageCircle, EMAIL: Mail, SMS: Phone, INTERNO: BellRing }

export default function RecordatoriosPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/recordatorios", fetcher)
  const { data: logData, mutate: mutateLog } = useSWR("/api/comunicaciones", fetcher)
  const sugerencias = (data?.recordatorios || []).filter((item: any) => item.idCliente)
  const integraciones = data?.integraciones || {}

  const enviar = async (item: any) => {
    const canal = item.canalSugerido
    if (!item.consentimiento || canal === "INTERNO") return toast.error("Registra primero el consentimiento y canal del cliente")
    const response = await fetch("/api/comunicaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idCliente: item.idCliente, tipo: item.tipo === "CITA_PENDIENTE" ? "CITA_PROXIMA" : item.tipo, canal, asunto: item.asunto, mensaje: item.mensaje }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) return toast.error(payload.error || payload.resultado || "No se pudo enviar")
    toast.success(`Recordatorio enviado por ${canal}`)
    await mutateLog()
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><h1 className="flex items-center gap-3 text-3xl font-bold"><BellRing className="h-8 w-8 text-primary" /> Recordatorios</h1><p className="mt-1 text-muted-foreground">Consentimiento, envío y resultado en un solo flujo.</p></div>
            <Button variant="outline" onClick={() => { mutate(); mutateLog() }} className="gap-2"><RefreshCw className="h-4 w-4" /> Actualizar</Button>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {(["WHATSAPP", "EMAIL", "SMS"] as const).map((canal) => { const Icon = icons[canal]; const disponible = Boolean(integraciones[canal]); return <Card key={canal} className={`p-4 ${disponible ? "border-emerald-500/25" : "border-amber-500/20"}`}><div className="flex items-center gap-3"><Icon className={disponible ? "h-5 w-5 text-emerald-400" : "h-5 w-5 text-amber-400"} /><div><p className="text-sm font-semibold">{canal}</p><p className="text-xs text-muted-foreground">{disponible ? "Integración disponible" : "Pendiente de credenciales"}</p></div></div></Card> })}
          </div>

          <section className="mb-8">
            <div className="mb-3"><h2 className="text-xl font-semibold">Sugerencias para contactar</h2><p className="text-sm text-muted-foreground">Recetas, citas, recompra y pedidos listos detectados automáticamente.</p></div>
            {isLoading ? <Card className="p-8 text-center text-muted-foreground">Cargando recordatorios…</Card> : error ? <Card className="border-red-500/25 p-6 text-red-400">{error.message}</Card> : sugerencias.length === 0 ? <Card className="p-8 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-400" /><p className="mt-2 font-medium">No hay contactos pendientes</p></Card> : (
              <div className="grid gap-3 xl:grid-cols-2">
                {sugerencias.map((item: any) => { const canal = item.canalSugerido || "INTERNO"; const Icon = icons[canal as keyof typeof icons] || BellRing; const disponible = canal !== "INTERNO" && integraciones[canal]; return <Card key={item.id} className="p-5"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-300">{item.tipo.replaceAll("_", " ")}</span><span className="flex items-center gap-1 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {canal}</span></div><h3 className="mt-2 font-semibold">{item.titulo}</h3><p className="text-sm text-muted-foreground">{item.detalle}</p><p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.mensaje}</p></div><div className="flex shrink-0 flex-col gap-2"><Button size="sm" onClick={() => enviar(item)} disabled={!item.consentimiento || !disponible} className="gap-1.5"><Send className="h-3.5 w-3.5" /> Enviar</Button>{(!item.consentimiento || !disponible) && <a href={`/clientes?cliente=${item.idCliente}`} className="flex items-center justify-center gap-1 text-[11px] text-primary">{!item.consentimiento ? "Consentimiento" : "Configurar canal"}<ExternalLink className="h-3 w-3" /></a>}</div></div></Card> })}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Historial de envíos</h2>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-border bg-muted/30"><tr>{["Fecha", "Cliente", "Caso", "Canal", "Estado", "Resultado"].map((item) => <th key={item} className="px-4 py-3 text-left text-xs uppercase tracking-wide text-muted-foreground">{item}</th>)}</tr></thead><tbody className="divide-y divide-border">{(logData?.comunicaciones || []).length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aún no hay envíos registrados.</td></tr> : (logData.comunicaciones || []).map((item: any) => <tr key={item.id}><td className="px-4 py-3 text-muted-foreground">{new Date(item.createdAt).toLocaleString("es-NI")}</td><td className="px-4 py-3 font-medium">{item.cliente.nombreCompleto}</td><td className="px-4 py-3">{item.tipo.replaceAll("_", " ")}</td><td className="px-4 py-3">{item.canal}</td><td className="px-4 py-3"><span className={`rounded-full border px-2 py-0.5 text-xs ${item.estado === "ENVIADO" || item.estado === "ENTREGADO" ? "border-emerald-500/25 text-emerald-400" : item.estado === "FALLIDO" ? "border-red-500/25 text-red-400" : "border-amber-500/25 text-amber-400"}`}>{item.estado}</span></td><td className="max-w-xs truncate px-4 py-3 text-muted-foreground">{item.resultado || "—"}</td></tr>)}</tbody></table></div>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}
