"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit2, Trash2, Search, Settings } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { laboratorioSchema } from "@/lib/validations"

interface Laboratorio {
  id: number
  nombre: string
  pais: string | null
  contacto: string | null
  telefono: string | null
  correo: string | null
  direccion: string | null
  observaciones: string | null
  activo: boolean
  _count?: {
    productos: number
  }
}

export default function LaboratoriosPage() {
  const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    nombre: "",
    pais: "",
    contacto: "",
    telefono: "",
    correo: "",
    direccion: "",
    observaciones: "",
    activo: true
  })

  useEffect(() => {
    fetchLaboratorios()
  }, [])

  const fetchLaboratorios = async () => {
    try {
      const res = await fetch("/api/laboratorios?estado=todos")
      if (res.ok) {
        setLaboratorios(await res.json())
      }
    } catch (e) {
      console.error(e)
      toast.error("Error al cargar laboratorios")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validation = laboratorioSchema.safeParse(formData)
    if (!validation.success) {
      validation.error.issues.forEach((err) => {
        toast.error(err.message)
      })
      return
    }

    try {
      const url = editingId ? `/api/laboratorios/${editingId}` : "/api/laboratorios"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(editingId ? "Laboratorio actualizado" : "Laboratorio creado con éxito")
        handleCancelForm()
        fetchLaboratorios()
      } else {
        toast.error(data.error || "Error al guardar el laboratorio")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error de conexión")
    }
  }

  const handleEditClick = (lab: Laboratorio) => {
    setEditingId(lab.id)
    setFormData({
      nombre: lab.nombre,
      pais: lab.pais || "",
      contacto: lab.contacto || "",
      telefono: lab.telefono || "",
      correo: lab.correo || "",
      direccion: lab.direccion || "",
      observaciones: lab.observaciones || "",
      activo: lab.activo
    })
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setFormData({
      nombre: "",
      pais: "",
      contacto: "",
      telefono: "",
      correo: "",
      direccion: "",
      observaciones: "",
      activo: true
    })
    setEditingId(null)
    setShowForm(false)
  }

  const handleToggleActivo = async (lab: Laboratorio) => {
    const accion = lab.activo ? "desactivar" : "reactivar"
    const ok = window.confirm(`¿Seguro que deseas ${accion} el laboratorio "${lab.nombre}"?`)
    if (!ok) return
    try {
      const res = await fetch(`/api/laboratorios/${lab.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !lab.activo })
      })
      if (res.ok) {
        toast.success(`Laboratorio ${lab.activo ? "desactivado" : "reactivado"}`)
        fetchLaboratorios()
      } else {
        const data = await res.json()
        toast.error(data.error || "No se pudo cambiar el estado")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error de conexión")
    }
  }

  const handleDelete = async (lab: Laboratorio) => {
    const ok = window.confirm(`¿Seguro que deseas ELIMINAR el laboratorio "${lab.nombre}"?\nEsta acción fallará si contiene productos asociados.`)
    if (!ok) return
    try {
      const res = await fetch(`/api/laboratorios/${lab.id}`, { method: "DELETE" })
      const data = await res.json()
      if (res.ok) {
        toast.success("Laboratorio eliminado con éxito")
        fetchLaboratorios()
      } else {
        toast.error(data.error || "No se pudo eliminar el laboratorio")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error de conexión")
    }
  }

  const filteredLaboratorios = laboratorios.filter((lab) => lab.nombre.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Settings className="w-8 h-8 text-primary" />
                Laboratorios Farmacéuticos
              </h1>
              <p className="text-muted-foreground mt-1">Gestiona las casas y laboratorios fabricantes de los medicamentos</p>
            </div>
            <Button onClick={showForm ? handleCancelForm : () => setShowForm(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              {showForm ? "Cancelar" : "Nuevo Laboratorio"}
            </Button>
          </div>

          <Card className="glass-card p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="text" placeholder="Buscar laboratorio por nombre..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-muted/30 border-border" />
            </div>
          </Card>

          {showForm && (
            <Card className="glass-card p-6 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                {editingId ? "Editar Laboratorio" : "Nuevo Laboratorio"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Nombre del Laboratorio <span className="text-red-500">*</span></label>
                    <Input required value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: Laboratorios Solka" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">País de Origen <span className="text-muted-foreground text-xs font-normal">(Opcional)</span></label>
                    <Input value={formData.pais} onChange={(e) => setFormData({ ...formData, pais: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: Nicaragua" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Persona de Contacto <span className="text-muted-foreground text-xs font-normal">(Opcional)</span></label>
                    <Input value={formData.contacto} onChange={(e) => setFormData({ ...formData, contacto: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: Lic. Ronald Gómez" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Teléfono <span className="text-muted-foreground text-xs font-normal">(Opcional)</span></label>
                    <Input value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: 88881234" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Correo <span className="text-muted-foreground text-xs font-normal">(Opcional)</span></label>
                    <Input type="email" value={formData.correo} onChange={(e) => setFormData({ ...formData, correo: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: info@solka.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Dirección <span className="text-muted-foreground text-xs font-normal">(Opcional)</span></label>
                    <Input value={formData.direccion} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: Reparto Los Robles, N-24" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-1">Observaciones <span className="text-muted-foreground text-xs font-normal">(Opcional)</span></label>
                    <Input value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} className="bg-muted/30 border-border" placeholder="Notas sobre despachos o convenios especiales" />
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
                      {["Nombre", "País / Contacto", "Teléfono", "Correo", "Productos Asociados", "Estado", "Acciones"].map((h) => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLaboratorios.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-sm">No se encontraron laboratorios</td>
                      </tr>
                    )}
                    {filteredLaboratorios.map((lab) => (
                      <tr key={lab.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{lab.nombre}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          <div>{lab.pais || "—"}</div>
                          {lab.contacto && <div className="text-xs text-muted-foreground mt-0.5">Cont: {lab.contacto}</div>}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{lab.telefono || "—"}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{lab.correo || "—"}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{lab._count?.productos ?? 0} prod.</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${lab.activo ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"}`}>
                            {lab.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEditClick(lab)} className="text-muted-foreground hover:text-foreground" title="Editar"><Edit2 className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => handleToggleActivo(lab)} className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10" title={lab.activo ? "Desactivar" : "Reactivar"}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(lab)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10" title="Eliminar"><Trash2 className="w-4 h-4" /></Button>
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
