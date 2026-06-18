"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Eye, EyeOff, Pill, ArrowLeft, Mail, KeyRound, ShieldCheck, Loader2, RefreshCw
} from "lucide-react"

/**
 * Flujo de recuperación de contraseña integrado en el login.
 * Modos:
 * 1. LOGIN   - Formulario de inicio de sesión principal
 * 2. REQUEST - Solicitar código de verificación de 6 dígitos
 * 3. VERIFY  - Ingresar y validar el código de 6 dígitos
 * 4. RESET   - Establecer la nueva contraseña
 * 5. SUCCESS - Confirmación de éxito
 */
type Mode = "login" | "request" | "verify" | "reset" | "success"

function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("login")
  const [correo, setCorreo] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Recovery states
  const [recoveryEmail, setRecoveryEmail] = useState("")
  const [recoveryCode, setRecoveryCode] = useState("")
  const [code, setCode] = useState<string[]>(Array(6).fill(""))
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes in seconds
  const [cooldown, setCooldown] = useState(0) // 60 seconds resend cooldown
  const [intentosRestantes, setIntentosRestantes] = useState<number | null>(null)
  
  const [nuevaPassword, setNuevaPassword] = useState("")
  const [confirmarPassword, setConfirmarPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Countdown timer for code expiration & resend cooldown
  useEffect(() => {
    if (mode !== "verify") return
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [mode])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Error en login"); return }
      router.push("/")
    } catch { setError("Error en la conexión") } finally { setLoading(false) }
  }

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: recoveryEmail }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Error al solicitar el código"); return }
      
      if (data._dev_codigo) {
        console.log(`[DEV] Código de verificación: ${data._dev_codigo}`)
      }

      setMode("verify")
      setCode(Array(6).fill(""))
      setTimeLeft(600)
      setCooldown(60)
      setIntentosRestantes(null)
      
      // Auto-focus first input
      setTimeout(() => {
        document.getElementById("code-input-0")?.focus()
      }, 100)
    } catch { setError("Error de conexión") } finally { setLoading(false) }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const codigoCompleto = code.join("")
    if (codigoCompleto.length < 6) {
      setError("Por favor ingresa los 6 dígitos")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: recoveryEmail, codigo: codigoCompleto }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Código inválido")
        if (data.intentosRestantes !== undefined) {
          setIntentosRestantes(data.intentosRestantes)
        }
        return
      }
      setRecoveryCode(codigoCompleto)
      setMode("reset")
      setError("")
    } catch { setError("Error de conexión") } finally { setLoading(false) }
  }

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (nuevaPassword !== confirmarPassword) {
      setError("Las contraseñas no coinciden")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo: recoveryEmail,
          codigo: recoveryCode,
          nuevaPassword
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Error al restablecer contraseña"); return }
      setMode("success")
    } catch { setError("Error de conexión") } finally { setLoading(false) }
  }

  const handleResendCode = async () => {
    if (cooldown > 0) return
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: recoveryEmail }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Error al reenviar código"); return }
      
      if (data._dev_codigo) {
        console.log(`[DEV] Código de verificación reenviado: ${data._dev_codigo}`)
      }

      setTimeLeft(600)
      setCooldown(60)
      setCode(Array(6).fill(""))
      setIntentosRestantes(null)
      document.getElementById("code-input-0")?.focus()
    } catch { setError("Error de conexión") } finally { setLoading(false) }
  }

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-input-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!code[index] && index > 0) {
        const newCode = [...code]
        newCode[index - 1] = ""
        setCode(newCode)
        const prevInput = document.getElementById(`code-input-${index - 1}`)
        prevInput?.focus()
      } else {
        const newCode = [...code]
        newCode[index] = ""
        setCode(newCode)
      }
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").trim()
    if (!/^\d{6}$/.test(pastedData)) return
    const newCode = pastedData.split("")
    setCode(newCode)
    const lastInput = document.getElementById("code-input-5")
    lastInput?.focus()
  }

  const passwordStrength = (pw: string) => {
    let score = 0
    if (pw.length >= 8) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[a-z]/.test(pw)) score++
    if (/\d/.test(pw)) score++
    if (/[@$!%*?&._\-#]/.test(pw)) score++
    return score
  }

  const pwScore = passwordStrength(nuevaPassword)
  const pwColors = ["bg-red-500", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-emerald-500"]
  const pwLabels = ["Muy débil", "Débil", "Regular", "Buena", "Fuerte"]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 mb-4">
            <Pill className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Sistema de Farmacia</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestión Profesional de Inventario</p>
        </div>

        <Card className="glass-card p-8">
          {/* ─── MODO LOGIN ─────────────────────────────────────────── */}
          {mode === "login" && (
            <>
              <h2 className="text-xl font-bold text-foreground mb-1">Iniciar Sesión</h2>
              <p className="text-sm text-muted-foreground mb-6">Ingresa tus credenciales para acceder</p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400 text-center">{error}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Correo Electrónico</label>
                  <Input
                    id="login-correo"
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="tu@correo.com"
                    required
                    className="bg-muted/30 border-border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Contraseña</label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="bg-muted/30 border-border pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  id="btn-login"
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium shadow-lg shadow-emerald-500/20 mt-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Iniciar Sesión"}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => { setMode("request"); setError(""); setRecoveryEmail("") }}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </>
          )}

          {/* ─── MODO REQUEST ────────────────────────────────────────── */}
          {mode === "request" && (
            <>
              <button
                onClick={() => { setMode("login"); setError(""); setRecoveryEmail("") }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Volver al login
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                  <KeyRound className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Recuperar Contraseña</h2>
                  <p className="text-xs text-muted-foreground">Enviaremos un código de verificación a tu correo</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleRequestReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="recovery-email"
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      required
                      className="bg-muted/30 border-border pl-9"
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  id="btn-enviar-codigo"
                  type="submit"
                  disabled={loading || !recoveryEmail}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium shadow-lg shadow-emerald-500/20"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar Código"}
                </Button>
              </form>
            </>
          )}

          {/* ─── MODO VERIFY ─────────────────────────────────────────── */}
          {mode === "verify" && (
            <>
              <button
                onClick={() => { setMode("request"); setError(""); setIntentosRestantes(null) }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Cambiar correo
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                  <KeyRound className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Código de Verificación</h2>
                  <p className="text-xs text-muted-foreground">Ingresa el código enviado a {recoveryEmail}</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleVerifyCode} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3 text-center">
                    Código de 6 dígitos
                  </label>
                  <div className="flex justify-between gap-2" onPaste={handlePaste}>
                    {code.map((digit, idx) => (
                      <Input
                        key={idx}
                        id={`code-input-${idx}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        className="w-12 h-14 text-center text-xl font-bold bg-muted/30 border-border"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
                  <span>Expira en: <strong className="text-foreground font-mono">{formatTime(timeLeft)}</strong></span>
                  <button
                    type="button"
                    disabled={cooldown > 0 || loading}
                    onClick={handleResendCode}
                    className="flex items-center gap-1 text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                    {cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar código"}
                  </button>
                </div>

                <Button
                  id="btn-verificar-codigo"
                  type="submit"
                  disabled={loading || code.some(d => !d) || timeLeft === 0}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium shadow-lg shadow-emerald-500/20"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verificar Código"}
                </Button>
              </form>
            </>
          )}

          {/* ─── MODO RESET ──────────────────────────────────────────── */}
          {mode === "reset" && (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                  <KeyRound className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Nueva Contraseña</h2>
                  <p className="text-xs text-muted-foreground">Establece tu nueva contraseña segura</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleConfirmReset} className="space-y-4">
                {/* Nueva contraseña */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Nueva Contraseña</label>
                  <div className="relative">
                    <Input
                      id="nueva-password"
                      type={showNewPassword ? "text" : "password"}
                      value={nuevaPassword}
                      onChange={(e) => setNuevaPassword(e.target.value)}
                      placeholder="Mín. 8 chars, mayús., número y símbolo"
                      required
                      className="bg-muted/30 border-border pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Barra de fortaleza */}
                  {nuevaPassword.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < pwScore ? pwColors[pwScore - 1] : "bg-muted/40"}`} />
                        ))}
                      </div>
                      <p className={`text-xs ${pwScore < 3 ? "text-red-400" : pwScore < 5 ? "text-yellow-400" : "text-emerald-400"}`}>
                        {pwLabels[pwScore - 1] || "Muy débil"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirmar contraseña */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Confirmar Contraseña</label>
                  <div className="relative">
                    <Input
                      id="confirmar-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmarPassword}
                      onChange={(e) => setConfirmarPassword(e.target.value)}
                      placeholder="Repite la nueva contraseña"
                      required
                      className={`bg-muted/30 border-border pr-10 ${confirmarPassword && confirmarPassword !== nuevaPassword ? "border-red-500/50" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmarPassword && confirmarPassword !== nuevaPassword && (
                    <p className="text-xs text-red-400 mt-1">Las contraseñas no coinciden</p>
                  )}
                </div>

                {/* Requisitos */}
                <div className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-3 space-y-1">
                  <p className="font-medium text-foreground">Requisitos:</p>
                  {[
                    { ok: nuevaPassword.length >= 8, label: "Mínimo 8 caracteres" },
                    { ok: /[A-Z]/.test(nuevaPassword), label: "Una letra mayúscula" },
                    { ok: /[a-z]/.test(nuevaPassword), label: "Una letra minúscula" },
                    { ok: /\d/.test(nuevaPassword), label: "Un número" },
                    { ok: /[@$!%*?&._\-#]/.test(nuevaPassword), label: "Un símbolo (@$!%*?&._-#)" },
                  ].map(r => (
                    <div key={r.label} className={`flex items-center gap-1.5 ${r.ok ? "text-emerald-400" : "text-muted-foreground"}`}>
                      <span>{r.ok ? "✓" : "○"}</span>
                      <span>{r.label}</span>
                    </div>
                  ))}
                </div>

                <Button
                  id="btn-restablecer-confirmar"
                  type="submit"
                  disabled={loading || pwScore < 5 || nuevaPassword !== confirmarPassword}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium shadow-lg shadow-emerald-500/20"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Nueva Contraseña"}
                </Button>
              </form>
            </>
          )}

          {/* ─── MODO SUCCESS ────────────────────────────────────────── */}
          {mode === "success" && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-foreground">¡Contraseña actualizada!</h2>
              <p className="text-sm text-muted-foreground">
                Tu contraseña fue restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
              </p>
              <Button
                id="btn-ir-login"
                onClick={() => {
                  setMode("login")
                  setError("")
                  setPassword("")
                  setNuevaPassword("")
                  setConfirmarPassword("")
                  setRecoveryEmail("")
                  setRecoveryCode("")
                }}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium w-full"
              >
                Iniciar Sesión
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
