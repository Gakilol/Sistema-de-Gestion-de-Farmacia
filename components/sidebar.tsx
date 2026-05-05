"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useState } from "react"
import { useTheme } from "next-themes"

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
  X,
  Moon,
  Sun,
  Truck,
} from "lucide-react"

import { useCurrentUser } from "../app/hooks/useCurrentUser"

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [loggingOut, setLoggingOut] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const { user, loading } = useCurrentUser()

  // Mientras carga, solo mostramos el shell del sidebar
  if (loading || !user) {
    return (
      <aside className="hidden md:flex w-64 bg-card/80 backdrop-blur-xl border-r border-border min-h-screen flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold gradient-text">Farmacia</h1>
          <p className="text-sm text-muted-foreground mt-1">Podología Clínica</p>
        </div>
        <div className="p-4 text-muted-foreground">Cargando...</div>
      </aside>
    )
  }

  const role = user.rolNombre
  const isAdmin = role === "ADMIN"
  const displayName = user.nombreCompleto
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

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

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  // 🔹 Opciones visibles para TODOS
  const commonLinks = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/clientes", label: "Clientes", icon: Users },
    { href: "/ventas/nueva", label: "Nueva Venta", icon: TrendingUp },
    { href: "/ventas/historial", label: "Historial Ventas", icon: ShoppingCart },
  ]

  // 🔹 Opciones SOLO ADMIN (van siempre en bloque y orden fijo)
  const adminLinks = [
    { href: "/productos", label: "Productos", icon: Package },
    { href: "/proveedores", label: "Proveedores", icon: Truck },
    { href: "/compras", label: "Compras", icon: ShoppingCart },
    { href: "/usuarios", label: "Usuarios", icon: Settings },
  ]

  const NavLink = ({ item }: { item: { href: string; label: string; icon: any } }) => {
    const active = isActive(item.href)
    return (
      <Link href={item.href} onClick={closeMobile}>
        <div
          className={`
            relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
            ${active
              ? "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }
          `}
        >
          {active && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
          )}
          <item.icon className={`w-[18px] h-[18px] ${active ? "text-primary" : ""}`} />
          {item.label}
        </div>
      </Link>
    )
  }

  return (
    <>
      {/* Botón flotante móvil */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-card/80 backdrop-blur-md rounded-lg shadow-lg border border-border"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? (
          <X className="w-5 h-5 text-foreground" />
        ) : (
          <Menu className="w-5 h-5 text-foreground" />
        )}
      </button>

      {/* Overlay oscuro para móvil */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar Principal */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-card/95 backdrop-blur-xl border-r border-border min-h-screen flex flex-col transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-border mt-12 md:mt-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">F+</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Farmacia</h1>
              <p className="text-xs text-muted-foreground font-medium">Podología Clínica</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
          {/* Sección general (todos los roles) */}
          <div className="space-y-0.5">
            {commonLinks.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>

          {/* Sección administración (solo ADMIN) */}
          {isAdmin && (
            <div className="mt-6">
              <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2 px-4">
                Administración
              </p>
              <div className="space-y-0.5">
                {adminLinks.map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-2">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
          >
            {theme === "dark" ? (
              <Sun className="w-[18px] h-[18px]" />
            ) : (
              <Moon className="w-[18px] h-[18px]" />
            )}
            {theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
          </button>

          {/* User Info */}
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-[11px] text-muted-foreground uppercase font-medium tracking-wide">
                {role}
              </p>
            </div>
          </div>

          {/* Logout */}
          <Button
            onClick={handleLogout}
            disabled={loggingOut}
            variant="ghost"
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 border-none shadow-none text-sm"
          >
            <LogOut className="w-4 h-4 mr-3" />
            {loggingOut ? "Cerrando..." : "Cerrar Sesión"}
          </Button>
        </div>
      </aside>
    </>
  )
}
