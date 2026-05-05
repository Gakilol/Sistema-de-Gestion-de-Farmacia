"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit2, Trash2, Truck, Search } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface Proveedor {
  id: number
  nombre: string
  telefono: string | null
  correo: string | null
  direccion: string | null
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [formData, setFormData] = useState({ nombre: "", telefono: "", correo: "", direccion: "" })

  useEffect(() => { fetchProveedores(); setIsAdmin(true) }, [])

  const fetchProveedores = async () => {
    try { const res = await fetch("/api/proveedores"); setProveedores(await res.json()) } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/proveedores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) })
      if (res.ok) { setFormData({ nombre: "", telefono: "", correo: "", direccion: "" }); setShowForm(false); fetchProveedores() }
    } catch (e) { console.error(e) }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm("¿Eliminar este proveedor?")) {
      try { const res = await fetch(`/api/proveedores/${id}`, { method: "DELETE" }); if (res.ok) fetchProveedores() } catch (e) { console.error(e) }
    }
  }

  const filteredProveedores = proveedores.filter((p) => p.nombre.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"><Truck className="w-8 h-8 text-primary" />Proveedores</h1>
              <p className="text-muted-foreground mt-1">Gestiona la lista de proveedores</p>
            </div>
            {isAdmin && (
              <Button onClick={() => setShowForm(!showForm)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />{showForm ? "Cancelar" : "Nuevo Proveedor"}
              </Button>
            )}
          </div>

          <Card className="glass-card p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="text" placeholder="Buscar proveedor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-muted/30 border-border" />
            </div>
          </Card>

          {showForm && isAdmin && (
            <Card className="glass-card p-6 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Nuevo Proveedor</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-foreground mb-1">Nombre <span className="text-red-500">*</span></label><Input required value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="bg-muted/30 border-border" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Teléfono</label><Input value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} className="bg-muted/30 border-border" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Correo</label><Input type="email" value={formData.correo} onChange={(e) => setFormData({ ...formData, correo: e.target.value })} className="bg-muted/30 border-border" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Dirección</label><Input value={formData.direccion} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} className="bg-muted/30 border-border" /></div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">Guardar</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
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
                      {["Nombre", "Teléfono", "Correo", "Dirección", ...(isAdmin ? ["Acciones"] : [])].map((h) => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProveedores.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{p.nombre}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{p.telefono || "—"}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{p.correo || "—"}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{p.direccion || "—"}</td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-sm">
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground"><Edit2 className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        )}
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
