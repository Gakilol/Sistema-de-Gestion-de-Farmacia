"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { X, Camera, Keyboard, ScanLine, AlertTriangle, ImageIcon } from "lucide-react"
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
 * Detects iOS / iPadOS to use file-capture mode instead of getUserMedia.
 * html5-qrcode throws unhandled promise rejections on iOS Safari when using
 * the live-stream approach, crashing the entire React tree.
 */
function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ reports as MacIntel with touch
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
}

/**
 * Helper to downscale and/or rotate an image to make barcode detection
 * faster, cleaner, and independent of orientation.
 */
function resizeAndRotateImage(
  file: File,
  maxDimension: number,
  rotateAngle: number
): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        // Calculate aspect ratio downscaling
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement("canvas")
        // Swap dimensions if rotating 90 or 270 degrees
        if (rotateAngle === 90 || rotateAngle === 270) {
          canvas.width = height
          canvas.height = width
        } else {
          canvas.width = width
          canvas.height = height
        }

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(file)
          return
        }

        // Apply rotation
        if (rotateAngle !== 0) {
          ctx.translate(canvas.width / 2, canvas.height / 2)
          ctx.rotate((rotateAngle * Math.PI) / 180)
          ctx.drawImage(img, -width / 2, -height / 2, width, height)
        } else {
          ctx.drawImage(img, 0, 0, width, height)
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const processedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            })
            resolve(processedFile)
          },
          "image/jpeg",
          0.90
        )
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

/**
 * Modal de escáner híbrido con soporte universal y multi-intento de decodificación:
 *
 * • CÁMARA (iOS Safari):  <input capture="environment"> → foto → scan con 5 intentos
 *   (resoluciones/rotaciones distintas) para mayor tolerancia a cédulas/barras.
 *
 * • CÁMARA (Chrome/Android/Desktop): html5-qrcode en modo live stream optimizado.
 *
 * • MANUAL: campo de texto.
 */
export function ScannerModal({
  isOpen,
  onClose,
  onScan,
  title = "Escanear Código",
  hint = "Apunta la cámara al código de barras o cédula",
}: ScannerModalProps) {
  // ─── State ────────────────────────────────────────────────────────────────
  const scannerRef   = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isMounted    = useRef(false)

  const [isIOS]      = useState(detectIOS)
  const [mode, setMode]         = useState<"camera" | "manual">("camera")
  const [manualCode, setManualCode]   = useState("")
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isScanning, setIsScanning]   = useState(false)
  const [isDecoding, setIsDecoding]   = useState(false)

  // ─── Stop live-stream scanner ─────────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current
    scannerRef.current = null
    if (scanner) {
      try {
        const state = scanner.getState?.()
        if (state === 2) await scanner.stop()
        scanner.clear?.()
      } catch {
        // ignore
      }
    }
    if (isMounted.current) setIsScanning(false)
  }, [])

  // ─── iOS: decode photo using multi-attempt pipeline ───────────────────────
  const handleFileCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsDecoding(true)
    setCameraError(null)

    // Temp container for decoder
    const tempId = "scanner-temp-" + Date.now()
    const tempDiv = document.createElement("div")
    tempDiv.id = tempId
    tempDiv.style.display = "none"
    document.body.appendChild(tempDiv)

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")

      // Support ALL common 1D and 2D formats
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

      const scanner = new Html5Qrcode(tempId, {
        formatsToSupport: formats,
        useBarCodeDetectorIfSupported: true
      })

      let decodedText: string | null = null
      let lastError: any = null

      // Pipeline of decoding attempts
      // 1. Raw photo
      try {
        decodedText = await scanner.scanFile(file, false)
      } catch (err) {
        lastError = err
      }

      // 2. Downscaled to 1200px max (filters high-frequency noise from 12MP+ cameras)
      if (!decodedText) {
        try {
          const processed = await resizeAndRotateImage(file, 1200, 0)
          decodedText = await scanner.scanFile(processed, false)
        } catch (err) {
          lastError = err
        }
      }

      // 3. Rotated 90 degrees (essential for vertical phone photos of horizontal cards)
      if (!decodedText) {
        try {
          const processed = await resizeAndRotateImage(file, 1000, 90)
          decodedText = await scanner.scanFile(processed, false)
        } catch (err) {
          lastError = err
        }
      }

      // 4. Rotated 270 degrees
      if (!decodedText) {
        try {
          const processed = await resizeAndRotateImage(file, 1000, 270)
          decodedText = await scanner.scanFile(processed, false)
        } catch (err) {
          lastError = err
        }
      }

      // 5. Downscaled to 800px max (very fast check for blurry barcodes)
      if (!decodedText) {
        try {
          const processed = await resizeAndRotateImage(file, 800, 0)
          decodedText = await scanner.scanFile(processed, false)
        } catch (err) {
          lastError = err
        }
      }

      // Cleanup
      try { scanner.clear() } catch { /* ignore */ }

      if (decodedText) {
        onScan(decodedText.trim())
        onClose()
      } else {
        throw lastError || new Error("No code detected")
      }
    } catch (err: any) {
      console.error("All decoding attempts failed:", err)
      const msg = (err?.message || String(err)).toLowerCase()
      if (msg.includes("no multiformat") || msg.includes("not found") || msg.includes("no barcode")) {
        setCameraError(
          "No se detectó ningún código. Asegúrate de enfocar bien el código de barras/cédula, evitar reflejos y sostener la tarjeta horizontalmente."
        )
      } else {
        setCameraError("Error al procesar la imagen. Por favor, ingresa el código de forma manual.")
      }
    } finally {
      document.body.removeChild(tempDiv)
      if (isMounted.current) setIsDecoding(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }, [onScan, onClose])

  // ─── Desktop/Android: start live-stream scanner ───────────────────────────
  const startCamera = useCallback(async () => {
    if (!containerRef.current || !isMounted.current) return
    setCameraError(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Tu navegador no soporta acceso a la cámara en vivo. Usa el modo Manual.")
      setMode("manual")
      return
    }

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
      if (!isMounted.current || !containerRef.current) return

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
        useBarCodeDetectorIfSupported: true
      })
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (w: number, h: number) => {
            const size = Math.max(120, Math.floor(Math.min(w, h) * 0.7))
            return { width: size, height: size }
          },
        },
        (decodedText: string) => {
          stopScanner()
          onScan(decodedText.trim())
          onClose()
        },
        () => { /* ignore normal per-frame errors */ }
      )

      if (isMounted.current) setIsScanning(true)
    } catch (err: any) {
      if (!isMounted.current) return
      const msg = (err?.message || String(err)).toLowerCase()
      if (msg.includes("permission") || msg.includes("denied") || msg.includes("notallowed")) {
        setCameraError("Permiso de cámara denegado. Actívalo en los Ajustes del navegador.")
      } else if (msg.includes("notfound") || msg.includes("device")) {
        setCameraError("No se encontró cámara en este dispositivo.")
      } else {
        setCameraError("No se pudo iniciar la cámara en vivo. Prueba con el modo Manual.")
      }
      setMode("manual")
    }
  }, [onScan, onClose, stopScanner])

  // ─── Global error fence (prevents library internals from crashing React) ──
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      const msg = (e.message || "").toLowerCase()
      if (msg.includes("qrcode") || msg.includes("getusermedia") || msg.includes("overconstrained")) {
        e.preventDefault()
        stopScanner()
        if (isMounted.current) {
          setCameraError("Error de compatibilidad con la cámara. Usa el modo Manual.")
          setMode("manual")
        }
      }
    }
    const handleRejection = (e: PromiseRejectionEvent) => {
      const msg = (String(e.reason?.message || e.reason) || "").toLowerCase()
      if (
        msg.includes("qrcode") || msg.includes("getusermedia") ||
        msg.includes("notallowederror") || msg.includes("overconstrained") ||
        msg.includes("aborterror") || msg.includes("notfounderror")
      ) {
        e.preventDefault()
        stopScanner()
        if (isMounted.current) {
          setCameraError("Error de acceso a la cámara. Usa el modo Manual.")
          setMode("manual")
        }
      }
    }
    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleRejection)
    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleRejection)
    }
  }, [stopScanner])

  // ─── Mount / unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      stopScanner()
    }
  }, [stopScanner])

  // ─── Open / close / mode change ───────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      stopScanner()
      setManualCode("")
      setCameraError(null)
      return
    }
    // iOS uses file-capture — no live stream to start
    if (mode === "camera" && !isIOS) {
      const t = setTimeout(() => startCamera(), 300)
      return () => clearTimeout(t)
    } else {
      stopScanner()
    }
  }, [isOpen, mode, isIOS, startCamera, stopScanner])

  // ─── Handlers ─────────────────────────────────────────────────────────────
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

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

        {/* Mode tabs */}
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
            Cámara
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

          {/* ── CAMERA MODE ── */}
          {mode === "camera" && (
            <div>
              {cameraError && (
                <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-600 dark:text-amber-400">{cameraError}</p>
                </div>
              )}

              {/* iOS: photo-capture button */}
              {isIOS ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                    <Camera className="w-9 h-9 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground mb-1">Captura con la cámara</p>
                    <p className="text-xs text-muted-foreground">
                      Toca el botón, apunta de forma horizontal al código y toma la foto.
                    </p>
                  </div>

                  {/* Hidden file input — triggers native iOS camera */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileCapture}
                  />

                  <Button
                    onClick={() => {
                      setCameraError(null)
                      fileInputRef.current?.click()
                    }}
                    disabled={isDecoding}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
                  >
                    {isDecoding ? (
                      <>
                        <span className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                        Procesando imagen (reintentando)...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Tomar Foto
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground/60 text-center">
                    También puedes cambiar a <strong>Manual</strong> para escribir el código.
                  </p>
                </div>
              ) : (
                /* Desktop / Android: live stream */
                <div>
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
            </div>
          )}

          {/* ── MANUAL MODE ── */}
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
                  Escribe el código o conéctate con un lector físico de código de barras.
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
