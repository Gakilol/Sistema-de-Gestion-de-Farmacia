"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit2, Trash2, Layers, Search } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { categoriaSchema } from "@/lib/validations"

interface Categoria {
  id: number
  nombre: string
  descripcion: string | null
  activo: boolean
  _count?: {
    productos: number
  }
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    activo: true
  })

  useEffect(() => {
    fetchCategorias()
  }, [])

  const fetchCategorias = async () => {
    try {
      const res = await fetch("/api/categorias?estado=todos")
      if (res.ok) {
        setCategorias(await res.json())
      }
    } catch (e) {
      console.error(e)
      toast.error("Error al cargar categorías")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validation = categoriaSchema.safeParse(formData)
    if (!validation.success) {
      validation.error.issues.forEach((err) => {
        toast.error(err.message)
      })
      return
    }

    try {
      const url = editingId ? `/api/categorias/${editingId}` : "/api/categorias"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(editingId ? "Categoría actualizada" : "Categoría creada con éxito")
        handleCancelForm()
        fetchCategorias()
      } else {
        toast.error(data.error || "Error al guardar la categoría")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error de conexión")
    }
  }

  const handleEditClick = (c: Categoria) => {
    setEditingId(c.id)
    setFormData({
      nombre: c.nombre,
      descripcion: c.descripcion || "",
      activo: c.activo
    })
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setFormData({ nombre: "", descripcion: "", activo: true })
    setEditingId(null)
    setShowForm(false)
  }

  const handleToggleActivo = async (c: Categoria) => {
    const accion = c.activo ? "desactivar" : "reactivar"
    const ok = window.confirm(`¿Seguro que deseas ${accion} la categoría "${c.nombre}"?`)
    if (!ok) return
    try {
      const res = await fetch(`/api/categorias/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !c.activo })
      })
      if (res.ok) {
        toast.success(`Categoría ${c.activo ? "desactivada" : "reactivada"}`)
        fetchCategorias()
      } else {
        const data = await res.json()
        toast.error(data.error || "No se pudo cambiar el estado")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error de conexión")
    }
  }

  const handleDelete = async (c: Categoria) => {
    const ok = window.confirm(`¿Seguro que deseas ELIMINAR la categoría "${c.nombre}"?\nEsta acción fallará si contiene productos asociados.`)
    if (!ok) return
    try {
      const res = await fetch(`/api/categorias/${c.id}`, { method: "DELETE" })
      const data = await res.json()
      if (res.ok) {
        toast.success("Categoría eliminada con éxito")
        fetchCategorias()
      } else {
        toast.error(data.error || "No se pudo eliminar la categoría")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error de conexión")
    }
  }

  const filteredCategorias = categorias.filter((c) => c.nombre.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Layers className="w-8 h-8 text-primary" />
                Categorías de Productos
              </h1>
              <p className="text-muted-foreground mt-1">Gestiona las categorías del catálogo de medicamentos y productos</p>
            </div>
            <Button onClick={showForm ? handleCancelForm : () => setShowForm(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              {showForm ? "Cancelar" : "Nueva Categoría"}
            </Button>
          </div>

          <Card className="glass-card p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="text" placeholder="Buscar categoría por nombre..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-muted/30 border-border" />
            </div>
          </Card>

          {showForm && (
            <Card className="glass-card p-6 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                {editingId ? "Editar Categoría" : "Nueva Categoría"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Nombre de la Categoría <span className="text-red-500">*</span></label>
                    <Input required value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: Analgésicos" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Descripción <span className="text-muted-foreground text-xs font-normal">(Opcional)</span></label>
                    <Input value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: Medicamentos para el alivio del dolor" />
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
                      {["Nombre", "Descripción", "Productos Asociados", "Estado", "Acciones"].map((h) => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredCategorias.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground text-sm">No se encontraron categorías</td>
                      </tr>
                    )}
                    {filteredCategorias.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{c.nombre}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{c.descripcion || "—"}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{c._count?.productos ?? 0} prod.</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${c.activo ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"}`}>
                            {c.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEditClick(c)} className="text-muted-foreground hover:text-foreground" title="Editar"><Edit2 className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => handleToggleActivo(c)} className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10" title={c.activo ? "Desactivar" : "Reactivar"}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(c)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10" title="Eliminar"><Trash2 className="w-4 h-4" /></Button>
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
