"use client"

import { useState, useRef } from "react"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ScanLine, Upload, FileText, AlertTriangle, CheckCircle2,
  Loader2, RefreshCw, Package, Calendar, Hash, DollarSign, Info,
} from "lucide-react"
import { toast } from "sonner"
import type { FacturaOCRResult, ItemFacturaOCR } from "@/lib/ia/types"

// ---------------------------------------------------------------------------
// Tarjeta de ítem extraído
// ---------------------------------------------------------------------------

function ItemFacturaCard({ item, index }: { item: ItemFacturaOCR; index: number }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3 hover:border-border/80 transition-colors">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">#{index + 1}</span>
          <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{item.productName}</h3>
        </div>
      </div>

      {/* Datos */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div className="flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
          <span className="text-muted-foreground">Cantidad:</span>
          <span className="font-semibold text-foreground ml-auto">{item.quantity}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="text-muted-foreground">Precio u.:</span>
          <span className="font-semibold text-foreground ml-auto">C$ {item.unitCost.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Hash className="w-3.5 h-3.5 text-purple-500 shrink-0" />
          <span className="text-muted-foreground">Lote:</span>
          <span className="font-semibold text-foreground ml-auto truncate max-w-[80px]">{item.batch ?? "—"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-muted-foreground">Vence:</span>
          <span className={`font-semibold ml-auto ${!item.expirationDate ? "text-muted-foreground" : "text-foreground"}`}>
            {item.expirationDate ?? "—"}
          </span>
        </div>
      </div>

      {/* Subtotal */}
      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <span className="text-xs text-muted-foreground">Subtotal</span>
        <span className="text-sm font-bold text-foreground">C$ {(item.quantity * item.unitCost).toFixed(2)}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página principal OCR
// ---------------------------------------------------------------------------

export default function OCRFacturaPage() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [resultado, setResultado] = useState<FacturaOCRResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [advertencia, setAdvertencia] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if (!allowed.includes(file.type)) {
      toast.error("Tipo de archivo no soportado. Usa JPG, PNG, WEBP o PDF.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo supera el límite de 10MB.")
      return
    }

    setArchivo(file)
    setResultado(null)
    setAdvertencia(null)

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }
  }

  const handleProcesar = async () => {
    if (!archivo) return
    setLoading(true)
    setResultado(null)

    const formData = new FormData()
    formData.append("factura", archivo)

    try {
      const res = await fetch("/api/ia/ocr", { method: "POST", body: formData })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Error al procesar la factura.")
        return
      }

      setResultado(data.resultado)
      setAdvertencia(data.advertencia ?? null)
      toast.success("Factura procesada correctamente. Revisa los datos antes de confirmar.")
    } catch {
      toast.error("Error de conexión al procesar la factura.")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setArchivo(null)
    setPreviewUrl(null)
    setResultado(null)
    setAdvertencia(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">

        {/* Header */}
        <header className="px-4 sm:px-6 py-4 border-b border-border bg-card/70 backdrop-blur-md flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <ScanLine className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">OCR de Facturas</h1>
              <p className="text-[11px] text-muted-foreground">Extracción inteligente con Gemini 2.5 Flash</p>
            </div>
          </div>
          {resultado && (
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              Nuevo
            </Button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Aviso de seguridad */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
                <p className="font-semibold">Solo administradores. Revisa siempre los datos antes de confirmar.</p>
                <p>La IA puede cometer errores en la lectura. Verifica cantidades, precios, lotes y fechas de vencimiento antes de crear la compra.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Columna izquierda: Carga de archivo */}
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">1. Selecciona la factura</h2>

                {/* Zona de drop */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer hover:border-primary/50 hover:bg-muted/20 flex flex-col items-center justify-center min-h-[200px] p-6 gap-3 ${
                    archivo ? "border-emerald-500/50 bg-emerald-500/5" : "border-border"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="facturaInput"
                  />

                  {previewUrl ? (
                    // Vista previa de imagen
                    <div className="w-full space-y-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="Factura" className="w-full max-h-48 object-contain rounded-lg" />
                      <p className="text-center text-xs text-emerald-500 font-medium">{archivo?.name}</p>
                    </div>
                  ) : archivo ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-10 h-10 text-emerald-500" />
                      <p className="text-sm font-medium text-emerald-500">{archivo.name}</p>
                      <p className="text-xs text-muted-foreground">{(archivo.size / 1024).toFixed(0)} KB</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-muted-foreground/40" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">Haz clic para seleccionar</p>
                        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP o PDF · Máx. 10 MB</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Botón procesar */}
                <Button
                  onClick={handleProcesar}
                  disabled={!archivo || loading}
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesando con Gemini...
                    </>
                  ) : (
                    <>
                      <ScanLine className="w-4 h-4" />
                      Extraer Datos de la Factura
                    </>
                  )}
                </Button>
              </div>

              {/* Columna derecha: Resultados */}
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">2. Revisa y confirma los datos</h2>

                {!resultado && !loading && (
                  <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 text-center text-muted-foreground">
                    <ScanLine className="w-10 h-10 opacity-30" />
                    <p className="text-sm">Los datos extraídos aparecerán aquí</p>
                  </div>
                )}

                {loading && (
                  <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Analizando factura...</p>
                      <p className="text-xs text-muted-foreground mt-1">Gemini está extrayendo los datos</p>
                    </div>
                  </div>
                )}

                {resultado && (
                  <div className="space-y-4">
                    {/* Advertencia */}
                    {advertencia && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-400">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{advertencia}</span>
                      </div>
                    )}

                    {/* Datos generales */}
                    <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Datos de la Factura</h3>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <div><span className="text-muted-foreground">Proveedor:</span> <span className="font-semibold text-foreground">{resultado.supplierName}</span></div>
                        <div><span className="text-muted-foreground">N° Factura:</span> <span className="font-semibold text-foreground">{resultado.invoiceNumber ?? "—"}</span></div>
                        <div><span className="text-muted-foreground">Fecha:</span> <span className="font-semibold text-foreground">{resultado.invoiceDate ?? "—"}</span></div>
                        <div><span className="text-muted-foreground">Total:</span> <span className="font-bold text-emerald-500">C$ {resultado.total.toFixed(2)}</span></div>
                      </div>
                    </div>

                    {/* Advertencias de la IA */}
                    {resultado.advertencias && resultado.advertencias.length > 0 && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 space-y-1">
                        <p className="text-xs font-semibold text-red-500">Advertencias detectadas por la IA:</p>
                        {resultado.advertencias.map((adv, i) => (
                          <p key={i} className="text-xs text-red-400">• {adv}</p>
                        ))}
                      </div>
                    )}

                    {/* Ítems */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground">{resultado.items.length} producto(s) detectados</p>
                      {resultado.items.map((item, i) => (
                        <ItemFacturaCard key={i} item={item} index={i} />
                      ))}
                    </div>

                    {/* Botón confirmar */}
                    <div className="sticky bottom-0 pt-3 pb-1 bg-background/90 backdrop-blur-sm">
                      <Button
                        className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                        size="lg"
                        onClick={() => toast.info("Para confirmar la compra, ve al módulo de Compras y selecciona 'Crear desde borrador IA'.")}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Confirmar y Crear Borrador de Compra
                      </Button>
                      <p className="text-center text-[10px] text-muted-foreground mt-2">
                        El borrador requiere revisión final en el módulo de Compras antes de guardarse.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
