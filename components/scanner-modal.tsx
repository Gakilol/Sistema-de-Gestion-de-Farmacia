"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { X, Camera, Keyboard, ScanLine, AlertTriangle, Wifi } from "lucide-react"
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
 * Detects iOS / iPadOS Safari to default to manual mode.
 * html5-qrcode throws unhandled promise rejections on these browsers
 * that crash the entire React tree if camera mode is attempted first.
 */
function isIOSSafari(): boolean {
  if (typeof window === "undefined") return false
  const ua = window.navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua)
  return isIOS || (isSafari && isIOS)
}

/**
 * Modal de escáner híbrido:
 * - Modo CÁMARA: usa html5-qrcode (desktop/Android). En iOS Safari inicia en manual.
 * - Modo MANUAL: campo de texto para ingresar el código a mano (fallback universal).
 *
 * Maneja tanto `error` como `unhandledrejection` globales para evitar crashes en iOS Safari.
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

  // iOS Safari starts in manual mode to avoid crashes
  const [mode, setMode] = useState<"camera" | "manual">(() =>
    typeof window !== "undefined" && isIOSSafari() ? "manual" : "camera"
  )
  const [manualCode, setManualCode] = useState("")
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isIOS] = useState(() => typeof window !== "undefined" && isIOSSafari())

  // ─── Stop scanner safely ───────────────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current
    scannerRef.current = null
    if (scanner) {
      try {
        const state = scanner.getState?.()
        if (state === 2) {
          await scanner.stop()
        }
        scanner.clear?.()
      } catch {
        // ignore — browser may have already torn down the stream
      }
    }
    if (isMounted.current) {
      setIsScanning(false)
    }
  }, [])

  // ─── Start camera ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    if (!containerRef.current || !isMounted.current) return
    setCameraError(null)

    // Extra guard: don't try on iOS Safari
    if (isIOSSafari()) {
      setCameraError("La cámara en Safari de iPhone no es compatible. Usa el modo Manual.")
      setMode("manual")
      return
    }

    // Check browser support before importing the library
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Tu navegador no soporta acceso a la cámara. Usa el modo Manual.")
      setMode("manual")
      return
    }

    try {
      // Dynamic import to avoid SSR issues
      const { Html5Qrcode } = await import("html5-qrcode")

      if (!isMounted.current || !containerRef.current) return

      const scannerId = "scanner-region-" + Date.now()
      containerRef.current.id = scannerId

      const html5QrCode = new Html5Qrcode(scannerId)
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
            const qrboxSize = Math.max(120, Math.floor(minEdge * 0.7))
            return { width: qrboxSize, height: qrboxSize }
          },
        },
        (decodedText: string) => {
          // Code found
          stopScanner()
          onScan(decodedText.trim())
          onClose()
        },
        () => {
          // Per-frame errors are normal while scanning — ignore
        }
      )

      if (isMounted.current) setIsScanning(true)
    } catch (err: any) {
      if (!isMounted.current) return
      console.error("Error iniciando cámara:", err)
      const msg = (err?.message || String(err)).toLowerCase()
      if (msg.includes("permission") || msg.includes("denied") || msg.includes("notallowed")) {
        setCameraError("Permiso de cámara denegado. Activa el acceso en Ajustes y recarga.")
      } else if (msg.includes("notfound") || msg.includes("device")) {
        setCameraError("No se encontró cámara en este dispositivo.")
      } else {
        setCameraError("No se pudo iniciar la cámara en este navegador.")
      }
      setMode("manual")
    }
  }, [onScan, onClose, stopScanner])

  // ─── Global error handlers (prevent page crash from library internals) ─────
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const msg = (event.message || "").toLowerCase()
      const isLibError =
        msg.includes("qrcode") ||
        msg.includes("html5-qrcode") ||
        msg.includes("getusermedia") ||
        msg.includes("constraints") ||
        msg.includes("overconstrained")

      if (isLibError) {
        console.warn("Scanner: caught global error, switching to manual:", event.error)
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
      const isLibError =
        msg.includes("qrcode") ||
        msg.includes("html5-qrcode") ||
        msg.includes("getusermedia") ||
        msg.includes("overconstrained") ||
        msg.includes("notallowederror") ||
        msg.includes("notfounderror") ||
        msg.includes("aborterror")

      if (isLibError) {
        console.warn("Scanner: caught unhandled rejection, switching to manual:", reason)
        event.preventDefault()
        stopScanner()
        if (isMounted.current) {
          setCameraError("La cámara no pudo iniciarse en este dispositivo.")
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

  // ─── Lifecycle ─────────────────────────────────────────────────────────────
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

  // ─── Handlers ──────────────────────────────────────────────────────────────
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
            <ScanLine className="w-5 h-5 text-primary" />
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
          {/* Camera tab — hidden on iOS Safari */}
          {!isIOS && (
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
          )}
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
          {/* iOS Safari notice */}
          {isIOS && (
            <div className="mb-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-start gap-2">
              <Wifi className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
              <p className="text-xs text-cyan-600 dark:text-cyan-400">
                En iPhone/iPad, ingresa el código manualmente o con un lector físico Bluetooth.
              </p>
            </div>
          )}

          {/* Camera mode */}
          {mode === "camera" && (
            <div>
              {cameraError && (
                <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-600 dark:text-amber-400">{cameraError}</p>
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
                ¿No funciona la cámara? Cambia a modo <strong>Manual</strong>.
              </p>
            </div>
          )}

          {/* Manual mode */}
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
                  Ingresa el código manualmente o conecta un lector físico de código de barras.
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
