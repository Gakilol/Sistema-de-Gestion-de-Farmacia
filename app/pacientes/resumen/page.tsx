"use client"
import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
export default function CrearResumenPacientePage() {
  const [idCliente, setIdCliente] = useState("")
  const [url, setUrl] = useState("")
  const crear = async () => { const r = await fetch("/api/paciente/acceso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idCliente: Number(idCliente), horas: 24, incluirResultados: true }) }); const d = await r.json(); if (!r.ok) return toast.error(d.error); setUrl(d.url) }
  return <div className="flex min-h-screen bg-background"><Sidebar /><main className="flex-1 p-4 pt-16 md:p-8"><h1 className="text-3xl font-bold mb-2">Resumen compartible del paciente</h1><p className="text-muted-foreground mb-6">Genera un enlace aleatorio de 24 horas. El token se guarda únicamente como hash.</p><Card className="p-5 max-w-2xl"><div className="flex gap-2"><Input type="number" value={idCliente} onChange={(e) => setIdCliente(e.target.value)} placeholder="ID del paciente" /><Button onClick={crear}>Generar enlace</Button></div>{url && <div className="mt-4 rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground mb-1">Enlace temporal</p><a className="text-sm text-primary break-all" href={url} target="_blank" rel="noreferrer">{url}</a></div>}</Card></main></div>
}
