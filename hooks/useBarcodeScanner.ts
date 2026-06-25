"use client"

import { useEffect, useRef, useCallback } from "react"

/**
 * Hook para detectar automáticamente lecturas de escáner de código de barras físico.
 *
 * Los escáneres físicos (pistolas) simulan pulsaciones de teclado muy rápidas
 * (< 40ms entre teclas) seguidas de un Enter. Este hook detecta ese patrón
 * y llama al callback onScan con el código leído.
 *
 * @param onScan - Callback que recibe el string escaneado
 * @param enabled - Si false, el listener no está activo (útil para desactivar en modales)
 * @param minLength - Longitud mínima para considerar una lectura válida (default: 6)
 */
export function useBarcodeScanner(
  onScan: (code: string) => void,
  enabled = true,
  minLength = 6
) {
  const bufferRef = useRef<string>("")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const RESET_TIMEOUT_MS = 250 // Si no hay input en 250ms, limpiar buffer

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignorar si el evento viene de un input/textarea/select donde el usuario puede escribir
      const target = e.target as HTMLElement
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable

      // Limpiar timer de reset
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      // Procesar Enter: finaliza la lectura
      if (e.key === "Enter") {
        const code = bufferRef.current.trim()
        bufferRef.current = ""

        if (code.length >= minLength && !isInputFocused) {
          e.preventDefault()
          onScan(code)
        }
        return
      }

      // Capturar la tecla si no hay un elemento de input enfocado
      if (!isInputFocused) {
        if (e.key.length === 1) {
          bufferRef.current += e.key
        }
      }

      // Auto-reset si no hay más input en el tiempo de espera
      timerRef.current = setTimeout(() => {
        bufferRef.current = ""
      }, RESET_TIMEOUT_MS)
    },
    [onScan, minLength]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, handleKeyDown])
}
