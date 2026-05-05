"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit2, Trash2, Users, Search } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface Cliente {
  id: number
  nombreCompleto: string
  cedula: string | null
  telefono: string | null
  correo: string | null
  activo: boolean
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    nombreCompleto: "",
    cedula: "",
    telefono: "",
    correo: "",
    direccion: "",
  })

  useEffect(() => { fetchClientes() }, [])

  const fetchClientes = async () => {
    try {
      const res = await fetch("/api/clientes?estado=todos")
      const data = await res.json()
      setClientes(data)
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingId ? `/api/clientes/${editingId}` : "/api/clientes"
      const method = editingId ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) })
      if (res.ok) {
        setFormData({ nombreCompleto: "", cedula: "", telefono: "", correo: "", direccion: "" })
        setEditingId(null)
        setShowForm(false)
        fetchClientes()
      }
    } catch (error) { console.error("Error:", error) }
  }

  const handleOpenCreate = () => {
    setEditingId(null)
    setFormData({ nombreCompleto: "", cedula: "", telefono: "", correo: "", direccion: "" })
    setShowForm(true)
  }

  const handleEdit = (cliente: Cliente) => {
    setEditingId(cliente.id)
    setFormData({ nombreCompleto: cliente.nombreCompleto, cedula: cliente.cedula || "", telefono: cliente.telefono || "", correo: cliente.correo || "", direccion: "" })
    setShowForm(true)
  }

  const handleToggleActivo = async (cliente: Cliente) => {
    const accion = cliente.activo ? "desactivar" : "reactivar"
    const ok = window.confirm(`¿Seguro que deseas ${accion} al cliente "${cliente.nombreCompleto}"?`)
    if (!ok) return
    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !cliente.activo }) })
      if (res.ok) fetchClientes()
    } catch (error) { console.error("Error:", error) }
  }

  const filteredClientes = clientes.filter((c) =>
    c.nombreCompleto.toLowerCase().includes(search.toLowerCase()) ||
    (c.cedula && c.cedula.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                Clientes
              </h1>
              <p className="text-muted-foreground mt-1">Gestiona la base de datos de clientes</p>
            </div>
            <Button onClick={showForm ? () => setShowForm(false) : handleOpenCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              {showForm ? "Cancelar" : "Nuevo Cliente"}
            </Button>
          </div>

          {/* Búsqueda */}
          <Card className="glass-card p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="text" placeholder="Buscar por nombre o cédula..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-muted/30 border-border" />
            </div>
          </Card>

          {/* Formulario */}
          {showForm && (
            <Card className="glass-card p-6 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">{editingId ? "Editar Cliente" : "Nuevo Cliente"}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                    <Input required value={formData.nombreCompleto} onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })} className="bg-muted/30 border-border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Cédula</label>
                    <Input value={formData.cedula} onChange={(e) => setFormData({ ...formData, cedula: e.target.value })} className="bg-muted/30 border-border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Teléfono</label>
                    <Input value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} className="bg-muted/30 border-border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Correo</label>
                    <Input type="email" value={formData.correo} onChange={(e) => setFormData({ ...formData, correo: e.target.value })} className="bg-muted/30 border-border" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">{editingId ? "Actualizar" : "Guardar"}</Button>
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null) }}>Cancelar</Button>
                </div>
              </form>
            </Card>
          )}

          {/* Tabla */}
          <Card className="glass-card overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      {["Nombre", "Cédula", "Teléfono", "Correo", "Estado", "Acciones"].map((h) => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredClientes.map((cliente) => (
                      <tr key={cliente.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{cliente.nombreCompleto}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{cliente.cedula || "—"}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{cliente.telefono || "—"}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{cliente.correo || "—"}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${cliente.activo ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"}`}>
                            {cliente.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(cliente)} className="text-muted-foreground hover:text-foreground"><Edit2 className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => handleToggleActivo(cliente)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></Button>
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
