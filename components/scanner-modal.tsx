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
 * Modal de escáner híbrido:
 * - Modo CÁMARA: usa html5-qrcode para escanear desde la cámara del dispositivo.
 * - Modo MANUAL: campo de texto para ingresar el código a mano (fallback).
 *
 * El componente importa html5-qrcode dinámicamente para evitar SSR issues.
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
  const [mode, setMode] = useState<"camera" | "manual">("camera")
  const [manualCode, setManualCode] = useState("")
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState?.()
        // State 2 = SCANNING
        if (state === 2) {
          await scannerRef.current.stop()
        }
        scannerRef.current.clear?.()
      } catch (e) {
        // ignore
      }
      scannerRef.current = null
    }
    setIsScanning(false)
  }, [])

  const startCamera = useCallback(async () => {
    if (!containerRef.current) return
    setCameraError(null)

    try {
      // Dynamic import to avoid SSR issues
      const { Html5Qrcode } = await import("html5-qrcode")

      const scannerId = "scanner-region-" + Date.now()
      containerRef.current.id = scannerId

      const html5QrCode = new Html5Qrcode(scannerId)
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.max(120, Math.floor(minEdge * 0.7));
            return {
              width: qrboxSize,
              height: qrboxSize
            };
          }
        },
        (decodedText) => {
          // Código detectado
          stopScanner()
          onScan(decodedText.trim())
          onClose()
        },
        () => {
          // Error de frame (ignorar - es normal mientras busca el código)
        }
      )
      setIsScanning(true)
    } catch (err: any) {
      console.error("Error iniciando cámara:", err)
      const msg = err?.message || String(err)
      if (msg.includes("permission") || msg.includes("denied")) {
        setCameraError("Permiso de cámara denegado. Usa el modo manual.")
      } else if (msg.includes("NotFound") || msg.includes("device")) {
        setCameraError("No se encontró cámara. Usa el modo manual.")
      } else {
        setCameraError("No se pudo iniciar la cámara. Usa el modo manual.")
      }
      setMode("manual")
    }
  }, [onScan, onClose, stopScanner])

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const msg = event.message || "";
      if (isScanning && (msg.includes("QrCode") || msg.includes("html5-qrcode") || msg.includes("constraints") || msg.includes("getUserMedia"))) {
        console.warn("Captured asynchronous scanner error in global handler:", event.error);
        setCameraError("La cámara experimentó un problema de compatibilidad. Cambiando a modo manual.");
        setMode("manual");
        stopScanner();
        event.preventDefault();
      }
    };
    window.addEventListener("error", handleGlobalError);
    return () => window.removeEventListener("error", handleGlobalError);
  }, [isScanning, stopScanner]);

  useEffect(() => {
    if (!isOpen) {
      stopScanner()
      setManualCode("")
      setCameraError(null)
      return
    }

    if (mode === "camera") {
      // Small delay to allow modal to render
      const t = setTimeout(() => startCamera(), 200)
      return () => clearTimeout(t)
    } else {
      stopScanner()
    }
  }, [isOpen, mode, startCamera, stopScanner])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const code = manualCode.trim()
    if (code.length < 3) return
    onScan(code)
    setManualCode("")
    onClose()
  }

  const handleModeSwitch = (newMode: "camera" | "manual") => {
    if (newMode === mode) return
    setMode(newMode)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => { stopScanner(); onClose() }}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-emerald-500/10 to-cyan-500/10">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">{title}</h2>
          </div>
          <button
            onClick={() => { stopScanner(); onClose() }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => handleModeSwitch("camera")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              mode === "camera"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Camera className="w-4 h-4" />
            Cámara
          </button>
          <button
            onClick={() => handleModeSwitch("manual")}
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
                  <p className="text-xs text-amber-600">{cameraError}</p>
                </div>
              )}
              <div
                ref={containerRef}
                className="w-full rounded-xl overflow-hidden bg-black/80 min-h-[220px] flex items-center justify-center"
              >
                {!isScanning && !cameraError && (
                  <div className="text-center text-muted-foreground py-8">
                    <Camera className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Iniciando cámara...</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">{hint}</p>
              <p className="text-xs text-muted-foreground/60 text-center mt-1">
                También puedes cambiar a modo Manual si la cámara no funciona.
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
