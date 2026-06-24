"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit2, Trash2, Search, Heart, Clock, AlertTriangle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { servicioSchema } from "@/lib/validations"
import { useCurrentUser } from "@/app/hooks/useCurrentUser"

interface ServicioPodologia {
  id: number
  nombre: string
  descripcion: string | null
  precio: number
  duracion: number | null
  activo: boolean
}

export default function ServiciosPodologiaClinicaPage() {
  const { user, loading: authLoading } = useCurrentUser()
  const [servicios, setServicios] = useState<ServicioPodologia[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    duracion: "",
    activo: true
  })

  const isUserAdmin = user?.rolNombre === "ADMIN"
  const canUserManage = user?.rolNombre === "ADMIN" || user?.rolNombre === "DOCTOR"

  useEffect(() => {
    if (user && canUserManage) {
      fetchServicios()
    }
  }, [user])

  const fetchServicios = async () => {
    try {
      const res = await fetch("/api/servicios-podologia?estado=todos")
      if (res.ok) {
        setServicios(await res.json())
      }
    } catch (e) {
      console.error(e)
      toast.error("Error al cargar servicios de podología")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validation = servicioSchema.safeParse(formData)
    if (!validation.success) {
      validation.error.issues.forEach((err) => {
        toast.error(err.message)
      })
      return
    }

    try {
      const url = editingId ? `/api/servicios-podologia/${editingId}` : "/api/servicios-podologia"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(editingId ? "Servicio actualizado" : "Servicio de podología creado con éxito")
        handleCancelForm()
        fetchServicios()
      } else {
        toast.error(data.error || "Error al guardar el servicio")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error de conexión")
    }
  }

  const handleEditClick = (s: ServicioPodologia) => {
    setEditingId(s.id)
    setFormData({
      nombre: s.nombre,
      descripcion: s.descripcion || "",
      precio: String(s.precio),
      duracion: s.duracion ? String(s.duracion) : "",
      activo: s.activo
    })
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      precio: "",
      duracion: "",
      activo: true
    })
    setEditingId(null)
    setShowForm(false)
  }

  const handleToggleActivo = async (s: ServicioPodologia) => {
    const accion = s.activo ? "desactivar" : "reactivar"
    const ok = window.confirm(`¿Seguro que deseas ${accion} el servicio de podología "${s.nombre}"?`)
    if (!ok) return
    try {
      const res = await fetch(`/api/servicios-podologia/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !s.activo })
      })
      if (res.ok) {
        toast.success(`Servicio ${s.activo ? "desactivado" : "reactivado"}`)
        fetchServicios()
      } else {
        const data = await res.json()
        toast.error(data.error || "No se pudo cambiar el estado")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error de conexión")
    }
  }

  const handleDelete = async (s: ServicioPodologia) => {
    const ok = window.confirm(`¿Seguro que deseas desasociar/desactivar el servicio "${s.nombre}"?\nSi tiene consultas relacionadas, se desactivará de forma lógica.`)
    if (!ok) return
    try {
      const res = await fetch(`/api/servicios-podologia/${s.id}`, { method: "DELETE" })
      const data = await res.json()
      if (res.ok) {
        toast.success("Servicio eliminado con éxito")
        fetchServicios()
      } else {
        toast.error(data.error || "No se pudo eliminar el servicio")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error de conexión")
    }
  }

  const filteredServicios = servicios.filter((s) => s.nombre.toLowerCase().includes(search.toLowerCase()))

  if (authLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto p-8">
          <Skeleton className="h-12 w-full max-w-md mb-8" />
          <Skeleton className="h-40 w-full" />
        </main>
      </div>
    )
  }

  // Verificar rol
  if (!canUserManage) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="glass-card max-w-md p-8 text-center border-red-500/20">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4 animate-bounce" />
            <h1 className="text-xl font-bold text-foreground">Acceso Denegado</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Solo los usuarios con rol de <strong>ADMINISTRADOR</strong> o <strong>DOCTOR/PODÓLOGO</strong> tienen autorización para acceder a la gestión de servicios de podología.
            </p>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Heart className="w-8 h-8 text-primary animate-pulse" />
                Servicios de Podología
              </h1>
              <p className="text-muted-foreground mt-1">Gestiona los tratamientos clínicos y servicios podológicos disponibles</p>
            </div>
            <Button onClick={showForm ? handleCancelForm : () => setShowForm(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              {showForm ? "Cancelar" : "Nuevo Servicio"}
            </Button>
          </div>

          <Card className="glass-card p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="text" placeholder="Buscar servicio por nombre..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-muted/30 border-border" />
            </div>
          </Card>

          {showForm && (
            <Card className="glass-card p-6 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                {editingId ? "Editar Servicio Podológico" : "Nuevo Servicio Podológico"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Nombre del Servicio <span className="text-red-500">*</span></label>
                    <Input required value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: Quiropodología Completa" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Precio (C$) <span className="text-red-500">*</span></label>
                    <Input required type="number" step="0.01" value={formData.precio} onChange={(e) => setFormData({ ...formData, precio: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: 500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Duración Aproximada (Minutos) <span className="text-muted-foreground text-xs font-normal">(Opcional)</span></label>
                    <Input type="number" value={formData.duracion} onChange={(e) => setFormData({ ...formData, duracion: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: 45" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Descripción <span className="text-muted-foreground text-xs font-normal">(Opcional)</span></label>
                    <Input value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: Tratamiento completo de uñas, callosidades e hidratación" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {editingId ? "Actualizar" : "Guardar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancelForm}>Cancelar</Button>
                </div>
              </form>
            </Card>
          )}

          <Card className="glass-card overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      {["Tratamiento", "Descripción", "Precio (C$)", "Duración", "Estado", "Acciones"].map((h) => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredServicios.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">No se encontraron servicios de podología</td>
                      </tr>
                    )}
                    {filteredServicios.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{s.nombre}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{s.descripcion || "—"}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-foreground">C$ {Number(s.precio).toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {s.duracion ? (
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              {s.duracion} min
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${s.activo ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"}`}>
                            {s.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEditClick(s)} className="text-muted-foreground hover:text-foreground" title="Editar"><Edit2 className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => handleToggleActivo(s)} className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10" title={s.activo ? "Desactivar" : "Reactivar"}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                            </Button>
                            {isUserAdmin && (
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(s)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10" title="Eliminar"><Trash2 className="w-4 h-4" /></Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}
