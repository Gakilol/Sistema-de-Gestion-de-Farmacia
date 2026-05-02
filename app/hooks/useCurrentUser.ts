"use client"

import { useEffect, useState } from "react"

interface User {
  id: number
  nombreCompleto: string
  correo: string
  rolNombre: "ADMIN" | "EMPLEADO"
}

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        setUser(data.user || null)
      } catch (e) {
        console.error("Error fetching current user:", e)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  return { user, loading }
}
