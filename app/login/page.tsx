"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Eye, EyeOff, Pill, ArrowLeft, Mail, KeyRound, CheckCircle2, Loader2, ShieldCheck
} from "lucide-react"

/**
 * Wizard de recuperación de contraseña integrado en el login.
 * Pasos:
 * 1. LOGIN   - Formulario de inicio de sesión principal
 * 2. REQUEST - Ingresar correo para solicitar enlace
 * 3. CONFIRM - Ingresar nueva contraseña con el token del URL
 * 4. SUCCESS - Confirmación de éxito
 */
type Mode = "login" | "request" | "confirm" | "success"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Detectar si hay un token en la URL → modo CONFIRM
  const tokenFromUrl = searchParams?.get("reset") || null

  const [mode, setMode] = useState<Mode>(tokenFromUrl ? "confirm" : "login")
  const [correo, setCorreo] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Recovery states
  const [recoveryEmail, setRecoveryEmail] = useState("")
  const [requestSent, setRequestSent] = useState(false)
  const [devToken, setDevToken] = useState<string | null>(null)

  // Confirm password states
  const [tokenVerified, setTokenVerified] = useState(false)
  const [correoOculto, setCorreoOculto] = useState("")
  const [nuevaPassword, setNuevaPassword] = useState("")
  const [confirmarPassword, setConfirmarPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Verificar el token al cargar en modo confirm
  useEffect(() => {
    if (mode === "confirm" && tokenFromUrl) {
      verificarToken(tokenFromUrl)
    }
  }, [mode, tokenFromUrl])

  const verificarToken = async (token: string) => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/reset-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok || !data.valido) {
        setError(data.error || "El enlace no es válido")
        setTokenVerified(false)
      } else {
        setTokenVerified(true)
        setCorreoOculto(data.correoOculto || "")
      }
    } catch {
      setError("Error al verificar el enlace")
    } finally {
      setLoading(false)
    }
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
      if (!res.ok) { setError(data.error || "Error al enviar solicitud"); return }
      setRequestSent(true)
      if (data._dev_token) setDevToken(data._dev_token)
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
        body: JSON.stringify({ token: tokenFromUrl, nuevaPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Error al restablecer contraseña"); return }
      setMode("success")
    } catch { setError("Error de conexión") } finally { setLoading(false) }
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
                  onClick={() => { setMode("request"); setError("") }}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </>
          )}

          {/* ─── MODO REQUEST (Solicitar enlace) ────────────────────── */}
          {mode === "request" && (
            <>
              <button
                onClick={() => { setMode("login"); setError(""); setRequestSent(false) }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Volver al login
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Recuperar Contraseña</h2>
                  <p className="text-xs text-muted-foreground">Te enviaremos un enlace de recuperación</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {requestSent ? (
                <div className="text-center py-4 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  </div>
                  <p className="font-semibold text-foreground">Enlace enviado</p>
                  <p className="text-sm text-muted-foreground">
                    Si el correo <strong>{recoveryEmail}</strong> está registrado, recibirás un enlace de recuperación.
                  </p>
                  {/* Solo en desarrollo: mostrar el link directamente */}
                  {devToken && (
                    <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-left">
                      <p className="text-xs text-amber-500 font-semibold mb-1">🛠 MODO DESARROLLO</p>
                      <p className="text-xs text-muted-foreground break-all">Token: {devToken}</p>
                      <button
                        onClick={() => { window.location.href = `/login?reset=${devToken}` }}
                        className="mt-2 text-xs text-primary hover:underline"
                      >
                        → Ir al formulario de nueva contraseña
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Tu correo electrónico</label>
                    <Input
                      id="recovery-email"
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      required
                      className="bg-muted/30 border-border"
                      autoFocus
                    />
                  </div>
                  <Button
                    id="btn-solicitar-reset"
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar enlace de recuperación"}
                  </Button>
                </form>
              )}
            </>
          )}

          {/* ─── MODO CONFIRM (Nueva contraseña) ────────────────────── */}
          {mode === "confirm" && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                  <KeyRound className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Nueva Contraseña</h2>
                  {correoOculto && <p className="text-xs text-muted-foreground">Para: {correoOculto}</p>}
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">{error}</p>
                  <button
                    onClick={() => { setMode("request"); setError("") }}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    Solicitar un nuevo enlace
                  </button>
                </div>
              )}

              {loading && !tokenVerified ? (
                <div className="text-center py-6">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Verificando enlace...</p>
                </div>
              ) : tokenVerified ? (
                <form onSubmit={handleConfirmReset} className="space-y-4">
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
                        autoFocus
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
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Confirmar Contraseña</label>
                    <Input
                      id="confirmar-password"
                      type="password"
                      value={confirmarPassword}
                      onChange={(e) => setConfirmarPassword(e.target.value)}
                      placeholder="Repite la contraseña"
                      required
                      className={`bg-muted/30 border-border ${confirmarPassword && confirmarPassword !== nuevaPassword ? "border-red-500/50" : ""}`}
                    />
                    {confirmarPassword && confirmarPassword !== nuevaPassword && (
                      <p className="text-xs text-red-400 mt-1">Las contraseñas no coinciden</p>
                    )}
                  </div>
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
                    id="btn-confirmar-password"
                    type="submit"
                    disabled={loading || pwScore < 5 || nuevaPassword !== confirmarPassword}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium shadow-lg shadow-emerald-500/20"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Establecer Nueva Contraseña"}
                  </Button>
                </form>
              ) : null}
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
                onClick={() => { setMode("login"); setError(""); setPassword(""); setNuevaPassword(""); setConfirmarPassword("") }}
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
