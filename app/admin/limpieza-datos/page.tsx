"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Trash2, AlertTriangle, ShieldAlert, CheckCircle, RefreshCw, Database } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface Counts {
  usuarios: number
  clientes: number
  categorias: number
  productos: number
  lotes: number
  devoluciones: number
  citas: number
  atenciones: number
  recetas: number
}

export default function LimpiezaDatosPage() {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [loading, setLoading] = useState(true)
  const [cleaning, setCleaning] = useState(false)
  const [confirmInput, setConfirmInput] = useState("")

  useEffect(() => {
    fetchCounts()
  }, [])

  const fetchCounts = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/limpieza-datos")
      const data = await res.json()
      if (res.ok) {
        setCounts(data.counts)
      } else {
        toast.error(data.error || "No se pudieron obtener los datos de prueba")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error al conectar con el servidor")
    } finally {
      setLoading(false)
    }
  }

  const handleClean = async () => {
    if (confirmInput !== "ELIMINAR_DATOS_PRUEBA") {
      toast.error("El texto de confirmación no es correcto")
      return
    }

    const sure = window.confirm("¡ATENCIÓN! Esta acción iniciará un respaldo de base de datos y luego eliminará permanentemente todos los datos marcados como de prueba (esDatoPrueba = true). ¿Deseas continuar?")
    if (!sure) return

    setCleaning(true)
    try {
      const res = await fetch("/api/admin/limpieza-datos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: "ELIMINAR_DATOS_PRUEBA" })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || "Limpieza completada con éxito")
        setConfirmInput("")
        fetchCounts()
      } else {
        toast.error(data.error || "Fallo en la limpieza de datos")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error de red al realizar la limpieza")
    } finally {
      setCleaning(false)
    }
  }

  const totalRecords = counts
    ? Object.values(counts).reduce((a, b) => a + b, 0)
    : 0

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Trash2 className="w-8 h-8 text-destructive" />
                Limpieza de Datos de Prueba
              </h1>
              <p className="text-muted-foreground mt-1">Identifica y elimina de manera segura los registros de demostración del sistema</p>
            </div>
            <Button 
              variant="outline" 
              onClick={fetchCounts} 
              disabled={loading || cleaning}
              className="gap-2 shrink-0 self-start sm:self-auto border-border"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar Vista Previa
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* Warning Banner */}
            <Card className="glass-card p-6 border-l-4 border-l-destructive col-span-1 lg:col-span-2 space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/20 shrink-0">
                  <ShieldAlert className="w-6 h-6 text-destructive animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Acción Crítica y Destructiva</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Esta herramienta eliminará de forma lógica o física (según corresponda) todos los datos que fueron importados o registrados con la bandera <code className="text-xs px-1.5 py-0.5 rounded bg-muted text-primary font-mono font-semibold">esDatoPrueba = true</code>.
                  </p>
                </div>
              </div>
              
              <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl text-xs space-y-2 text-amber-500">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  RESPALDO AUTOMÁTICO INCLUIDO
                </div>
                <p>
                  Por seguridad, el servidor ejecutará automáticamente un volcado de base de datos (<code className="font-mono text-[10px]">pg_dump</code>) antes de alterar las tablas. Los respaldos se guardan localmente en la carpeta <code className="font-mono text-[10px]">/backups/</code> del sistema.
                </p>
              </div>
            </Card>

            {/* Total Records to Delete */}
            <Card className="glass-card p-6 flex flex-col justify-between border-l-4 border-l-amber-500">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total de Registros a Limpiar</p>
                {loading ? (
                  <Skeleton className="h-10 w-24 mt-2" />
                ) : (
                  <p className="text-4xl font-black text-amber-500 mt-2">{totalRecords}</p>
                )}
              </div>
              <div className="text-xs text-muted-foreground border-t border-border pt-4 mt-4">
                {totalRecords > 0 ? (
                  <span className="text-amber-500 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Requiere confirmación del administrador
                  </span>
                ) : (
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    El sistema está limpio de datos de prueba
                  </span>
                )}
              </div>
            </Card>
          </div>

          {/* Counts Grid */}
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            Desglose de Registros de Demostración
          </h2>
          
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : counts ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              {[
                { label: "Usuarios", val: counts.usuarios },
                { label: "Clientes / Pacientes", val: counts.clientes },
                { label: "Categorías", val: counts.categorias },
                { label: "Productos", val: counts.productos },
                { label: "Lotes / Stock", val: counts.lotes },
                { label: "Devoluciones", val: counts.devoluciones },
                { label: "Citas Médicas", val: counts.citas },
                { label: "Consultas SOAP", val: counts.atenciones },
                { label: "Recetas Médicas", val: counts.recetas },
              ].map((item, idx) => (
                <Card key={idx} className={`glass-card p-4 flex flex-col justify-between ${item.val > 0 ? "border-amber-500/20 bg-amber-500/5" : "border-border"}`}>
                  <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                  <p className={`text-xl font-bold mt-2 ${item.val > 0 ? "text-amber-500" : "text-foreground opacity-50"}`}>{item.val}</p>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-8">No hay información de desglose disponible.</p>
          )}

          {/* Execution Box */}
          {totalRecords > 0 && (
            <Card className="glass-card p-6 border-dashed border-destructive/40 bg-destructive/5 space-y-4 max-w-xl">
              <h3 className="text-md font-bold text-destructive flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                Confirmación Obligatoria
              </h3>
              <p className="text-xs text-muted-foreground">
                Para proceder con la eliminación masiva y recálculo automático de inventarios, por favor digite la frase <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-foreground font-black">ELIMINAR_DATOS_PRUEBA</code> a continuación:
              </p>
              
              <div className="space-y-3">
                <Input
                  type="text"
                  placeholder="Escriba la frase de confirmación..."
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  className="bg-background border-destructive/20 focus-visible:ring-destructive font-mono font-bold"
                  disabled={cleaning}
                />
                
                <Button
                  onClick={handleClean}
                  disabled={confirmInput !== "ELIMINAR_DATOS_PRUEBA" || cleaning}
                  className="w-full bg-destructive hover:bg-destructive/90 text-white font-bold gap-2"
                >
                  {cleaning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creando Respaldo y Limpiando Base de Datos...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Ejecutar Limpieza de Lotes y Datos de Prueba
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
