"use client"

import { type FormEvent, useState } from "react"
import { CheckCircle2, Copy, ExternalLink, Link2, Loader2, ShieldCheck, UserRound } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatearCedulaMientrasEscribe, prepararCedulaBusqueda } from "@/lib/domain/patient-access"
import { toast } from "sonner"

type AccesoCreado = {
  url: string
  expiracion: string
  paciente: {
    nombreCompleto: string
    cedula: string
  }
}

export default function CrearResumenPacientePage() {
  const [cedula, setCedula] = useState("")
  const [incluirResultados, setIncluirResultados] = useState(true)
  const [acceso, setAcceso] = useState<AccesoCreado | null>(null)
  const [cargando, setCargando] = useState(false)

  const crear = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const preparada = prepararCedulaBusqueda(cedula)
    if (!preparada) {
      toast.error("Ingresa una cédula válida, por ejemplo 001-010190-0001A")
      return
    }

    setCargando(true)
    setAcceso(null)
    try {
      const response = await fetch("/api/paciente/acceso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula: preparada.formateada, horas: 24, incluirResultados }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "No se pudo generar el enlace")

      setAcceso(data)
      toast.success("Enlace protegido generado por 24 horas")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el enlace")
    } finally {
      setCargando(false)
    }
  }

  const copiar = async () => {
    if (!acceso) return
    try {
      await navigator.clipboard.writeText(acceso.url)
      toast.success("Enlace copiado al portapapeles")
    } catch {
      toast.error("No se pudo copiar. Selecciona el enlace manualmente.")
    }
  }

  const actualizarCedula = (valor: string) => {
    setCedula(formatearCedulaMientrasEscribe(valor))
    setAcceso(null)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 pt-16 md:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-7">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Acceso clínico protegido
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Compartir resumen del paciente</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Busca al paciente por su número de cédula y genera un enlace temporal, sin exponer su identificador interno.
            </p>
          </div>

          <Card className="overflow-hidden border-border/80 shadow-sm">
            <form onSubmit={crear} className="space-y-6 p-5 sm:p-7">
              <div className="space-y-2">
                <Label htmlFor="cedula-paciente">Número de cédula del paciente</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="cedula-paciente"
                    value={cedula}
                    onChange={(event) => actualizarCedula(event.target.value)}
                    placeholder="001-010190-0001A"
                    autoComplete="off"
                    className="h-11 pl-10 font-mono uppercase"
                    maxLength={17}
                    aria-describedby="cedula-ayuda"
                    required
                  />
                </div>
                <p id="cedula-ayuda" className="text-xs text-muted-foreground">
                  Puedes escribirla con o sin guiones; FarmaPOS aplicará el formato automáticamente.
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/35 p-4">
                <Checkbox
                  id="incluir-resultados"
                  checked={incluirResultados}
                  onCheckedChange={(checked) => setIncluirResultados(checked === true)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label htmlFor="incluir-resultados" className="cursor-pointer">Incluir resultados autorizados</Label>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Sólo se mostrarán exámenes marcados previamente como visibles en el portal del paciente.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">El enlace caduca automáticamente después de 24 horas.</p>
                <Button type="submit" size="lg" disabled={cargando || !cedula} className="sm:min-w-44">
                  {cargando ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Link2 aria-hidden="true" />}
                  {cargando ? "Generando…" : "Generar enlace"}
                </Button>
              </div>
            </form>
          </Card>

          {acceso && (
            <Card className="mt-5 border-emerald-500/30 bg-emerald-500/[0.04] p-5 sm:p-6" aria-live="polite">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-emerald-500/15 p-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">Enlace listo para compartir</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {acceso.paciente.nombreCompleto} · {acceso.paciente.cedula}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-border bg-background/80 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Enlace temporal</p>
                <a
                  className="block break-all text-sm font-medium text-primary hover:underline"
                  href={acceso.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {acceso.url}
                </a>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Vence: {new Date(acceso.expiracion).toLocaleString("es-NI", { dateStyle: "medium", timeStyle: "short" })}
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={copiar}>
                    <Copy aria-hidden="true" /> Copiar
                  </Button>
                  <Button asChild>
                    <a href={acceso.url} target="_blank" rel="noreferrer">
                      <ExternalLink aria-hidden="true" /> Abrir
                    </a>
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
