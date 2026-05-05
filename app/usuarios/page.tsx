"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ToggleRight, ToggleLeft, Settings } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface Usuario {
  id: number
  nombreCompleto: string
  correo: string
  rolNombre: string
  activo: boolean
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ nombreCompleto: "", correo: "", password: "", idRol: "2" })

  useEffect(() => { fetchUsuarios() }, [])

  const fetchUsuarios = async () => {
    try {
      setLoading(true); setError("")
      const res = await fetch("/api/usuarios")
      let data: any = null
      try { data = await res.json() } catch { data = null }
      if (!res.ok) { setUsuarios([]); setError(data?.error || "No autorizado"); return }
      if (!Array.isArray(data)) { setUsuarios([]); setError("Respuesta inesperada"); return }
      setUsuarios(data)
    } catch (err) { console.error(err); setUsuarios([]); setError("Error al cargar usuarios") } finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/usuarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) })
      const data = await res.json()
      if (!res.ok) { alert(data.error || "Error"); return }
      setFormData({ nombreCompleto: "", correo: "", password: "", idRol: "2" }); setShowForm(false); fetchUsuarios()
    } catch (err) { console.error(err); alert("Error al crear usuario") }
  }

  const handleToggleActivo = async (id: number, activo: boolean) => {
    try {
      const res = await fetch(`/api/usuarios/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !activo }) })
      const data = await res.json()
      if (!res.ok) { alert(data.error || "Error"); return }
      fetchUsuarios()
    } catch (err) { console.error(err) }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"><Settings className="w-8 h-8 text-primary" />Usuarios</h1>
              <p className="text-muted-foreground mt-1">Gestiona los usuarios del sistema</p>
            </div>
            <Button onClick={() => setShowForm(!showForm)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />{showForm ? "Cancelar" : "Nuevo Usuario"}
            </Button>
          </div>

          {error && <Card className="glass-card p-4 mb-6 border-destructive/30 bg-destructive/5 text-destructive">{error}</Card>}

          {showForm && !error && (
            <Card className="glass-card p-6 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Nuevo Usuario</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-foreground mb-1">Nombre Completo <span className="text-red-500">*</span></label><Input required value={formData.nombreCompleto} onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })} className="bg-muted/30 border-border" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Correo <span className="text-red-500">*</span></label><Input type="email" required value={formData.correo} onChange={(e) => setFormData({ ...formData, correo: e.target.value })} className="bg-muted/30 border-border" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Contraseña <span className="text-red-500">*</span></label><Input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="bg-muted/30 border-border" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Rol</label><select value={formData.idRol} onChange={(e) => setFormData({ ...formData, idRol: e.target.value })} className="w-full p-2 rounded-lg bg-muted/30 border border-border text-foreground text-sm"><option value="1">ADMIN</option><option value="2">EMPLEADO</option></select></div>
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
            ) : !error ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>{["Nombre", "Correo", "Rol", "Estado", "Acciones"].map((h) => (<th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>))}</tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {usuarios.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{u.nombreCompleto}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{u.correo}</td>
                        <td className="px-6 py-4 text-sm"><span className={`px-3 py-1 rounded-full text-xs font-medium ${u.rolNombre === "ADMIN" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"}`}>{u.rolNombre}</span></td>
                        <td className="px-6 py-4 text-sm"><span className={`px-3 py-1 rounded-full text-xs font-medium ${u.activo ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"}`}>{u.activo ? "Activo" : "Inactivo"}</span></td>
                        <td className="px-6 py-4 text-sm">
                          <button onClick={() => handleToggleActivo(u.id, u.activo)} className={`transition-colors ${u.activo ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-foreground"}`}>
                            {u.activo ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="p-6 text-sm text-muted-foreground">No hay datos de usuarios para mostrar.</div>}
          </Card>
        </div>
      </main>
    </div>
  )
}
