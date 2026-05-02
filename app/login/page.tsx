"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const [correo, setCorreo] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

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

      if (!res.ok) {
        setError(data.error || "Error en login")
        return
      }

      router.push("/")
    } catch (err) {
      setError("Error en la conexión")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-green-700 mb-2">Farmacia</h1>
            <p className="text-gray-600">Sistema de Gestión</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <Input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="admin@farmacia.com"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

            <Button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white">
              {loading ? "Iniciando..." : "Iniciar Sesión"}
            </Button>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-gray-700">
              <p className="font-medium mb-2">Demo Account:</p>
              <p>Email: admin@farmacia.com</p>
              <p>Contraseña: password123</p>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
