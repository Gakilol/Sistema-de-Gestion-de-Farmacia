"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { RefreshCw, AlertTriangle, ShieldAlert, CheckCircle, Database } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentUser } from "@/app/hooks/useCurrentUser"

interface SequencePreview {
  tabla: string
  registros: number
  maxId: number
  valorSecuencia: number
  proximoId: number
  modulo: string
}

export default function ReiniciarSecuenciasPage() {
  const { user: loggedInUser, loading: authLoading } = useCurrentUser()
  const router = useRouter()

  const [previewData, setPreviewData] = useState<SequencePreview[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [confirmInput, setConfirmInput] = useState("")

  // Client-side authentication check
  useEffect(() => {
    if (!authLoading) {
      if (!loggedInUser) {
        router.push("/login")
      } else if (loggedInUser.rolNombre !== "ADMIN") {
        router.push("/acceso-denegado")
      }
    }
  }, [loggedInUser, authLoading, router])

  useEffect(() => {
    if (loggedInUser && loggedInUser.rolNombre === "ADMIN") {
      fetchPreview()
    }
  }, [loggedInUser])

  const fetchPreview = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/mantenimiento/reiniciar-secuencias")
      const data = await res.json()
      if (res.ok) {
        setPreviewData(data.preview)
      } else {
        toast.error(data.error || "No se pudo obtener la vista previa de secuencias")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error al conectar con el servidor")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (confirmInput !== "REINICIAR SECUENCIAS") {
      toast.error("El texto de confirmación no es correcto")
      return
    }

    const sure = window.confirm("¡ATENCIÓN! Esta acción iniciará una copia de seguridad automática y luego recalibrará las secuencias de IDs. ¿Desea continuar?")
    if (!sure) return

    setProcessing(true)
    try {
      const res = await fetch("/api/admin/mantenimiento/reiniciar-secuencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: "REINICIAR SECUENCIAS" })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || "Secuencias de IDs reiniciadas con éxito")
        setConfirmInput("")
        fetchPreview()
      } else {
        toast.error(data.error || "Fallo en la recalibración de secuencias")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error de red al realizar la operación")
    } finally {
      setProcessing(false)
    }
  }

  if (authLoading || !loggedInUser || loggedInUser.rolNombre !== "ADMIN") {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4 pt-16 md:p-8 md:pt-8">
          <div className="space-y-4">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <RefreshCw className="w-8 h-8 text-primary" />
                Reiniciar Secuencias de IDs
              </h1>
              <p className="text-muted-foreground mt-1">
                Recalibra las secuencias autoincrementales de PostgreSQL al máximo ID actual (+1) de forma segura.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={fetchPreview} 
              disabled={loading || processing}
              className="gap-2 shrink-0 self-start sm:self-auto border-border"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar Vista Previa
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* Warning Banner */}
            <Card className="glass-card p-6 border-l-4 border-l-primary col-span-1 lg:col-span-2 space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 shrink-0">
                  <ShieldAlert className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Alineación de Secuencias Autoincrementales</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ideal después de realizar limpiezas de datos o restauraciones parciales. Las secuencias se actualizarán para continuar exactamente desde el último registro existente.
                  </p>
                </div>
              </div>
              
              <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl text-xs space-y-2 text-amber-500">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  RESPALDO PREVIO OBLIGATORIO
                </div>
                <p>
                  Antes de proceder, el sistema ejecutará automáticamente una copia de seguridad en la carpeta <code className="font-mono text-[10px]">/backups/</code>. Si este respaldo falla por cualquier motivo, la operación se cancelará de forma inmediata para proteger sus datos.
                </p>
              </div>
            </Card>

            {/* General Info Card */}
            <Card className="glass-card p-6 flex flex-col justify-between border-l-4 border-l-amber-500">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tablas Detectadas</p>
                {loading ? (
                  <Skeleton className="h-10 w-24 mt-2" />
                ) : (
                  <p className="text-4xl font-black text-amber-500 mt-2">{previewData?.length || 0}</p>
                )}
              </div>
              <div className="text-xs text-muted-foreground border-t border-border pt-4 mt-4">
                <span className="text-amber-500 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Requiere confirmación del administrador
                </span>
              </div>
            </Card>
          </div>

          {/* Preview Table */}
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            Estado Actual y Propuesto de Secuencias
          </h2>

          <Card className="glass-card border border-border overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b border-border font-semibold">
                  <tr>
                    <th className="px-6 py-4">Módulo</th>
                    <th className="px-6 py-4">Tabla</th>
                    <th className="px-6 py-4 text-right">Registros</th>
                    <th className="px-6 py-4 text-right">ID Máximo</th>
                    <th className="px-6 py-4 text-right">Valor Secuencia Actual</th>
                    <th className="px-6 py-4 text-right">Siguiente ID (Propuesto)</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-12 ml-auto" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-12 ml-auto" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-12 ml-auto" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-12 ml-auto" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-20 mx-auto" /></td>
                      </tr>
                    ))
                  ) : previewData && previewData.length > 0 ? (
                    previewData.map((item, idx) => {
                      const necesitaReset = item.valorSecuencia !== item.proximoId
                      return (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.modulo === "CLÍNICA" ? "bg-cyan-500/10 text-cyan-500" : "bg-purple-500/10 text-purple-500"
                            }`}>
                              {item.modulo}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono font-semibold text-foreground">{item.tabla}</td>
                          <td className="px-6 py-4 text-right font-medium">{item.registros}</td>
                          <td className="px-6 py-4 text-right font-medium">{item.maxId}</td>
                          <td className="px-6 py-4 text-right font-mono text-muted-foreground">{item.valorSecuencia}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-primary">{item.proximoId}</td>
                          <td className="px-6 py-4 text-center">
                            {necesitaReset ? (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-500 font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10">
                                Desalineado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10">
                                Alineado
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                        No se detectaron tablas con secuencias activas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Action Box */}
          {previewData && previewData.length > 0 && (
            <Card className="glass-card p-6 border-dashed border-primary/40 bg-primary/5 space-y-4 max-w-xl">
              <h3 className="text-md font-bold text-primary flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                Confirmación de Seguridad
              </h3>
              <p className="text-xs text-muted-foreground">
                Para proceder con la recalibración de todas las secuencias detectadas, por favor escriba la frase <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-foreground font-black">REINICIAR SECUENCIAS</code> a continuación:
              </p>
              
              <div className="space-y-3">
                <Input
                  type="text"
                  placeholder="Escriba la frase de confirmación..."
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  className="bg-background border-primary/20 focus-visible:ring-primary font-mono font-bold"
                  disabled={processing}
                />
                
                <Button
                  onClick={handleReset}
                  disabled={confirmInput !== "REINICIAR SECUENCIAS" || processing}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 shadow-lg shadow-primary/25"
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creando Respaldo y Alineando Secuencias...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Ejecutar Reinicio de Secuencias
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}

        </div>
      </main>
    </div>
  )
}
