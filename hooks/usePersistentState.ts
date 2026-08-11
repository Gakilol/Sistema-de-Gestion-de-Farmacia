"use client"

import { useEffect, useState, type Dispatch, type SetStateAction } from "react"

export function usePersistentState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initialValue)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (stored !== null) setValue(JSON.parse(stored) as T)
    } catch {
      window.localStorage.removeItem(key)
    }
    setHydrated(true)
  }, [key])

  useEffect(() => {
    try {
      if (hydrated) window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // El navegador puede bloquear almacenamiento; el filtro sigue funcionando en memoria.
    }
  }, [hydrated, key, value])

  return [value, setValue]
}
