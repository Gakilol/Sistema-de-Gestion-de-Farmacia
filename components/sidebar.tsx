"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react"

import { useCurrentUser } from "../app/hooks/useCurrentUser"

export function Sidebar() {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const { user, loading } = useCurrentUser()

  // Mientras carga, solo mostramos el shell del sidebar
  if (loading || !user) {
    return (
      <aside className="hidden md:flex w-64 bg-white/80 backdrop-blur-md border-r border-gray-200 min-h-screen flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-primary">Farmacia</h1>
          <p className="text-sm text-gray-600 mt-1">Podología Clínica</p>
        </div>

        <div className="p-4 text-gray-500">Cargando...</div>
      </aside>
    )
  }

  const role = user.rolNombre
  const isAdmin = role === "ADMIN"
  const displayName = user.nombreCompleto

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
    } finally {
      setLoggingOut(false)
    }
  }

  const closeMobile = () => setIsMobileOpen(false)

  // 🔹 Opciones visibles para TODOS
  const commonLinks = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/clientes", label: "Clientes", icon: Users },
    { href: "/ventas/nueva", label: "Nueva Venta", icon: TrendingUp },
    { href: "/ventas/historial", label: "Historial Ventas", icon: TrendingUp },
  ]

  // 🔹 Opciones SOLO ADMIN (van siempre en bloque y orden fijo)
  const adminLinks = [
    { href: "/productos", label: "Productos", icon: Package },
    { href: "/proveedores", label: "Proveedores", icon: TrendingUp },
    { href: "/compras", label: "Compras",icon: ShoppingCart  },
    { href: "/usuarios", label: "Usuarios", icon: Settings },
  ]

  return (
    <>
      {/* Botón flotante móvil */}
      <button 
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="w-6 h-6 text-primary" /> : <Menu className="w-6 h-6 text-primary" />}
      </button>

      {/* Overlay oscuro para móvil */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar Principal */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white/95 backdrop-blur-xl border-r border-gray-200 min-h-screen flex flex-col transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-200 mt-12 md:mt-0">
          <h1 className="text-2xl font-bold text-primary">Farmacia</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Podología Clínica</p>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {/* Sección general (todos los roles) */}
          <div className="space-y-2">
            {commonLinks.map((item) => (
              <Link key={item.href} href={item.href} onClick={closeMobile}>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-600 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>

          {/* Sección administración (solo ADMIN) */}
          {isAdmin && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-primary/60 uppercase tracking-wider mb-3 px-4">
                Administración
              </p>
              <div className="space-y-2">
                {adminLinks.map((item) => (
                  <Link key={item.href} href={item.href} onClick={closeMobile}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-gray-600 hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <item.icon className="w-4 h-4 mr-3" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-gray-200 bg-gray-50/50 space-y-3">
          <div className="text-sm text-gray-700">
            <p className="font-semibold truncate">{displayName}</p>
            <p className="text-xs text-gray-500 uppercase font-medium tracking-wide mt-0.5">{role}</p>
          </div>

          <Button
            onClick={handleLogout}
            disabled={loggingOut}
            variant="destructive"
            className="w-full justify-start bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-none shadow-none"
          >
            <LogOut className="w-4 h-4 mr-3" />
            {loggingOut ? "Cerrando..." : "Cerrar Sesión"}
          </Button>
        </div>
      </aside>
    </>
  )
}
