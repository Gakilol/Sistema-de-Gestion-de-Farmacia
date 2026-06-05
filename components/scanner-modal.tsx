"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { X, Camera, Keyboard, ScanLine, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScan: (code: string) => void
  title?: string
  hint?: string
}

/**
 * Modal de escáner híbrido en vivo para todos los dispositivos (iOS, Android, Desktop):
 * - Usa la cámara en vivo con visor de video y decodificación en tiempo real.
 * - Incluye fallback de entrada manual.
 * - Diseñado con estética profesional y control de errores robusto.
 */
export function ScannerModal({
  isOpen,
  onClose,
  onScan,
  title = "Escanear Código",
  hint = "Apunta la cámara al código de barras o cédula",
}: ScannerModalProps) {
  const scannerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isMounted = useRef(false)

  const [mode, setMode] = useState<"camera" | "manual">("camera")
  const [manualCode, setManualCode] = useState("")
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  // ─── Stop live camera stream safely ────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current
    scannerRef.current = null
    if (scanner) {
      try {
        const state = scanner.getState?.()
        // State 2 = SCANNING
        if (state === 2) {
          await scanner.stop()
        }
        scanner.clear?.()
      } catch (e) {
        console.warn("Error deteniendo el escáner:", e)
      }
    }
    if (isMounted.current) {
      setIsScanning(false)
    }
  }, [])

  // ─── Start live camera stream ──────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    if (!containerRef.current || !isMounted.current) return
    setCameraError(null)

    // Check mediaDevices support
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Tu navegador o dispositivo no permite el acceso a la cámara en vivo. Usa el modo Manual.")
      setMode("manual")
      return
    }

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
      if (!isMounted.current || !containerRef.current) return

      // Create unique element ID to avoid conflicts on re-mounts
      const scannerId = "scanner-region-" + Date.now()
      containerRef.current.id = scannerId

      const formats = [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.CODABAR,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.PDF_417
      ]

      const html5QrCode = new Html5Qrcode(scannerId, {
        formatsToSupport: formats,
        useBarCodeDetectorIfSupported: true,
        verbose: false
      })
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
            // Make the scanning box slightly larger for easier barcode alignment
            const qrboxSize = Math.max(140, Math.floor(minEdge * 0.75))
            return {
              width: qrboxSize,
              height: qrboxSize
            }
          }
        },
        (decodedText) => {
          stopScanner()
          onScan(decodedText.trim())
          onClose()
        },
        () => {
          // Per-frame failures are normal while looking for barcode — ignore
        }
      )

      if (isMounted.current) {
        setIsScanning(true)
      }
    } catch (err: any) {
      if (!isMounted.current) return
      console.error("Error iniciando cámara en vivo:", err)
      const msg = (err?.message || String(err)).toLowerCase()
      if (msg.includes("permission") || msg.includes("denied") || msg.includes("notallowed")) {
        setCameraError("Permiso de cámara denegado. Permite el acceso en la barra de direcciones de tu navegador.")
      } else if (msg.includes("notfound") || msg.includes("device") || msg.includes("requested device not found")) {
        setCameraError("No se encontró ninguna cámara trasera en este dispositivo.")
      } else {
        setCameraError("No se pudo iniciar la cámara en vivo. Prueba el modo Manual.")
      }
      setMode("manual")
    }
  }, [onScan, onClose, stopScanner])

  // ─── Global error listener to prevent unhandled library crashes ───────────
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const msg = (event.message || "").toLowerCase()
      if (msg.includes("qrcode") || msg.includes("getusermedia") || msg.includes("constraints")) {
        event.preventDefault()
        stopScanner()
        if (isMounted.current) {
          setCameraError("Problema de compatibilidad con la cámara. Cambiando a modo Manual.")
          setMode("manual")
        }
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const msg = (reason?.message || String(reason) || "").toLowerCase()
      if (msg.includes("qrcode") || msg.includes("getusermedia") || msg.includes("notallowederror")) {
        event.preventDefault()
        stopScanner()
        if (isMounted.current) {
          setCameraError("El acceso a la cámara fue interrumpido o denegado.")
          setMode("manual")
        }
      }
    }

    window.addEventListener("error", handleGlobalError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)
    return () => {
      window.removeEventListener("error", handleGlobalError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [stopScanner])

  // ─── Lifecycle / Mount management ──────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      stopScanner()
    }
  }, [stopScanner])

  useEffect(() => {
    if (!isOpen) {
      stopScanner()
      setManualCode("")
      setCameraError(null)
      return
    }

    if (mode === "camera") {
      const t = setTimeout(() => startCamera(), 300)
      return () => clearTimeout(t)
    } else {
      stopScanner()
    }
  }, [isOpen, mode, startCamera, stopScanner])

  // ─── Form submit handler ───────────────────────────────────────────────────
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const code = manualCode.trim()
    if (code.length < 3) return
    onScan(code)
    setManualCode("")
    onClose()
  }

  const handleClose = () => {
    stopScanner()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-emerald-500/10 to-cyan-500/10">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary animate-pulse" />
            <h2 className="text-base font-bold text-foreground">{title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setMode("camera")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              mode === "camera"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Camera className="w-4 h-4" />
            Cámara en Vivo
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              mode === "manual"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Keyboard className="w-4 h-4" />
            Manual
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {mode === "camera" && (
            <div>
              {cameraError && (
                <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-600 dark:text-amber-400">{cameraError}</p>
                </div>
              )}
              
              {/* Camera view container */}
              <div className="relative w-full rounded-xl overflow-hidden bg-black/95 min-h-[240px] flex items-center justify-center">
                <div
                  ref={containerRef}
                  className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
                />
                
                {/* Laser scan animation overlay */}
                {isScanning && !cameraError && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8">
                    {/* Corner borders */}
                    <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-500 rounded-tl-md" />
                    <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-500 rounded-tr-md" />
                    <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-500 rounded-bl-md" />
                    <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-500 rounded-br-md" />
                    
                    {/* Pulsing red/green scanning laser line */}
                    <div className="w-full h-0.5 bg-emerald-500 shadow-[0_0_10px_2px_rgba(16,185,129,0.7)] animate-bounce" />
                  </div>
                )}

                {!isScanning && !cameraError && (
                  <div className="absolute text-center text-muted-foreground py-8">
                    <Camera className="w-10 h-10 mx-auto mb-2 opacity-30 animate-pulse" />
                    <p className="text-sm">Iniciando visor de cámara...</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">{hint}</p>
              <p className="text-xs text-muted-foreground/60 text-center mt-1">
                Alinea el código de barras dentro del recuadro. También puedes cambiar a modo manual.
              </p>
            </div>
          )}

          {mode === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Código de barras o Cédula
                </label>
                <Input
                  autoFocus
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Ej: 7441001234567 ó 001-280599-1004A"
                  className="bg-muted/30 border-border text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Ingresa el código manualmente o usa el lector físico con este campo activo.
                </p>
              </div>
              <Button
                type="submit"
                disabled={manualCode.trim().length < 3}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <ScanLine className="w-4 h-4 mr-2" />
                Buscar Código
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
