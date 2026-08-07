"use client"
import { useState } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useCurrentUser } from "@/app/hooks/useCurrentUser"

const fetcher = (url: string) => fetch(url).then((r) => r.json())
export default function CajaPage() {
  const { user } = useCurrentUser()
  const { data, mutate } = useSWR("/api/caja", fetcher)
  const [monto, setMonto] = useState("")
  const [concepto, setConcepto] = useState("")
  const [tipo, setTipo] = useState("GASTO")
  const propia = data?.sesiones?.find((x: any) => x.estado === "ABIERTA" && x.idUsuario === user?.id)
  const enviar = async (method: string, body: any) => { const r = await fetch("/api/caja", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const d = await r.json(); if (!r.ok) return toast.error(d.error); toast.success("Operación registrada"); setMonto(""); setConcepto(""); mutate() }
  return <div className="flex min-h-screen bg-background"><Sidebar /><main className="flex-1 p-4 pt-16 md:p-8"><h1 className="text-3xl font-bold mb-2">Caja</h1><p className="text-muted-foreground mb-6">Apertura, movimientos y cierre con diferencia auditada.</p>
    {!propia ? <Card className="p-5 max-w-xl mb-6"><h2 className="font-bold mb-3">Abrir caja</h2><div className="flex gap-2"><Input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Monto inicial" /><Button onClick={() => enviar("POST", { montoInicial: Number(monto) })}>Abrir</Button></div></Card> : <Card className="p-5 mb-6"><h2 className="font-bold mb-3">Caja abierta #{propia.id}</h2><div className="grid md:grid-cols-4 gap-2"><select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-md border bg-background px-3"><option>GASTO</option><option>RETIRO</option><option>INGRESO</option></select><Input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Concepto" /><Input type="number" min="0.01" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Monto" /><Button onClick={() => enviar("PATCH", { accion: "MOVIMIENTO", id: propia.id, tipo, concepto, monto: Number(monto) })}>Registrar</Button></div><div className="flex gap-2 mt-4"><Input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Monto final contado" /><Button variant="destructive" onClick={() => enviar("PATCH", { accion: "CERRAR", id: propia.id, montoFinalContado: Number(monto) })}>Cerrar caja</Button></div></Card>}
    <div className="space-y-3">{data?.sesiones?.map((c: any) => { const porMetodo = (c.ventas || []).reduce((a: any, v: any) => ({ ...a, [v.metodoPago]: (a[v.metodoPago] || 0) + Number(v.total) }), {}); return <Card key={c.id} className="p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-bold">Caja #{c.id} - {c.usuario.nombreCompleto}</p><p className="text-xs text-muted-foreground">{new Date(c.abiertaEn).toLocaleString("es-NI")} · {c.estado}</p><p className="text-xs mt-2">Ventas: efectivo C${Number(porMetodo.EFECTIVO || 0).toFixed(2)} · tarjeta C${Number(porMetodo.TARJETA || 0).toFixed(2)} · transferencia C${Number(porMetodo.TRANSFERENCIA || 0).toFixed(2)}</p></div><div className="text-sm text-right"><p>Inicial: C${Number(c.montoInicial).toFixed(2)}</p>{c.montoEsperado != null && <p>Esperado: C${Number(c.montoEsperado).toFixed(2)}</p>}{c.diferencia != null && <p className={Number(c.diferencia) === 0 ? "text-emerald-500" : "text-red-500"}>Diferencia: C${Number(c.diferencia).toFixed(2)}</p>}</div></div>{user?.rolNombre === "ADMIN" && c.estado === "CERRADA" && Number(c.diferencia) !== 0 && <Button size="sm" className="mt-3" onClick={() => { const resolucion = window.prompt("Resolución de la diferencia"); if (resolucion) enviar("PATCH", { accion: "RESOLVER", id: c.id, resolucion }) }}>Resolver diferencia</Button>}</Card> })}</div>
  </main></div>
}
