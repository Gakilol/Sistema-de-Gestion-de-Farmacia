"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit2, Trash2, Heart, Search, Calendar, User, ShieldAlert, BookOpen } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { clienteSchema } from "@/lib/validations"

interface DatosClinicos {
  antecedentes: string | null
  alergias: string | null
  observacionesClinicas: string | null
  diagnosticoGeneral: string | null
}

interface Paciente {
  id: number
  nombreCompleto: string
  cedula: string | null
  telefono: string | null
  correo: string | null
  direccion: string | null
  sexo: string | null
  fechaNacimiento: string | null
  activo: boolean
  tipoPerfil: "FARMACIA" | "CLINICA" | "AMBOS"
  datosClinicos?: DatosClinicos | null
}

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  // Tabs inside the form
  const [formTab, setFormTab] = useState<"personales" | "clinicos">("personales")

  const [formData, setFormData] = useState({
    nombreCompleto: "",
    cedula: "",
    telefono: "",
    correo: "",
    direccion: "",
    sexo: "",
    fechaNacimiento: "",
    tipoPerfil: "CLINICA" as "CLINICA" | "AMBOS",
    datosClinicos: {
      antecedentes: "",
      alergias: "",
      observacionesClinicas: "",
      diagnosticoGeneral: "",
    }
  })

  useEffect(() => {
    fetchPacientes()
  }, [])

  const fetchPacientes = async () => {
    try {
      const res = await fetch("/api/pacientes?estado=todos")
      const data = await res.json()
      setPacientes(data)
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al cargar pacientes")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate using Zod schema
    const personalData = {
      nombreCompleto: formData.nombreCompleto,
      cedula: formData.cedula,
      telefono: formData.telefono,
      correo: formData.correo,
      direccion: formData.direccion,
      sexo: formData.sexo || null,
      fechaNacimiento: formData.fechaNacimiento || null,
      tipoPerfil: formData.tipoPerfil,
    }

    const validation = clienteSchema.safeParse(personalData)

    if (!validation.success) {
      // Focus on personal tab to see errors
      setFormTab("personales")
      validation.error.issues.forEach((err: any) => {
        toast.error(err.message)
      })
      return
    }

    try {
      const url = editingId ? `/api/pacientes/${editingId}` : "/api/pacientes"
      const method = editingId ? "PUT" : "POST"
      
      const payload = {
        ...personalData,
        datosClinicos: formData.datosClinicos
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(editingId ? "Paciente clínico actualizado" : "Paciente clínico registrado exitosamente")
        resetForm()
        setShowForm(false)
        fetchPacientes()
      } else {
        toast.error(data.error || "Error al guardar el paciente")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error de conexión al guardar")
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setFormTab("personales")
    setFormData({
      nombreCompleto: "",
      cedula: "",
      telefono: "",
      correo: "",
      direccion: "",
      sexo: "",
      fechaNacimiento: "",
      tipoPerfil: "CLINICA",
      datosClinicos: {
        antecedentes: "",
        alergias: "",
        observacionesClinicas: "",
        diagnosticoGeneral: "",
      }
    })
  }

  const handleOpenCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const handleEdit = (paciente: Paciente) => {
    setEditingId(paciente.id)
    setFormTab("personales")
    
    // Format date if present
    let formattedDate = ""
    if (paciente.fechaNacimiento) {
      formattedDate = new Date(paciente.fechaNacimiento).toISOString().split("T")[0]
    }

    setFormData({
      nombreCompleto: paciente.nombreCompleto,
      cedula: paciente.cedula || "",
      telefono: paciente.telefono || "",
      correo: paciente.correo || "",
      direccion: paciente.direccion || "",
      sexo: paciente.sexo || "",
      fechaNacimiento: formattedDate,
      tipoPerfil: paciente.tipoPerfil === "AMBOS" ? "AMBOS" : "CLINICA",
      datosClinicos: {
        antecedentes: paciente.datosClinicos?.antecedentes || "",
        alergias: paciente.datosClinicos?.alergias || "",
        observacionesClinicas: paciente.datosClinicos?.observacionesClinicas || "",
        diagnosticoGeneral: paciente.datosClinicos?.diagnosticoGeneral || "",
      }
    })
    setShowForm(true)
  }

  const handleToggleActivo = async (paciente: Paciente) => {
    const accion = paciente.activo ? "desactivar" : "reactivar"
    const ok = window.confirm(`¿Seguro que deseas ${accion} al paciente "${paciente.nombreCompleto}"?`)
    if (!ok) return
    try {
      const res = await fetch(`/api/pacientes/${paciente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !paciente.activo })
      })
      if (res.ok) {
        toast.success(`Paciente ${paciente.activo ? "desactivado" : "reactivado"}`)
        fetchPacientes()
      } else {
        const data = await res.json()
        toast.error(data.error || "No se pudo cambiar el estado")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error de conexión")
    }
  }

  const handleHardDelete = async (paciente: Paciente) => {
    const ok = window.confirm(`¿Seguro que deseas ELIMINAR permanentemente al paciente "${paciente.nombreCompleto}"?\nEsta acción no se puede deshacer.`)
    if (!ok) return
    try {
      const res = await fetch(`/api/pacientes/${paciente.id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Paciente eliminado permanentemente")
        fetchPacientes()
      } else {
        const data = await res.json()
        toast.error(data.error || "No se pudo eliminar el paciente")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error de conexión")
    }
  }

  const filteredPacientes = pacientes.filter((p) =>
    p.nombreCompleto.toLowerCase().includes(search.toLowerCase()) ||
    (p.cedula && p.cedula.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Heart className="w-8 h-8 text-primary animate-pulse" />
                Pacientes Clínicos
              </h1>
              <p className="text-muted-foreground mt-1">Gestiona el historial y datos de podología de pacientes</p>
            </div>
            <Button onClick={showForm ? () => setShowForm(false) : handleOpenCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              {showForm ? "Cancelar" : "Nuevo Paciente"}
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
              <h2 className="text-lg font-semibold text-foreground mb-4">{editingId ? "Editar Paciente Clínico" : "Nuevo Paciente Clínico"}</h2>
              
              {/* Form Tabs */}
              <div className="flex border-b border-border mb-6">
                <button
                  type="button"
                  onClick={() => setFormTab("personales")}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all ${
                    formTab === "personales"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <User className="w-4 h-4" />
                  Datos Personales
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab("clinicos")}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all ${
                    formTab === "clinicos"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  Historial Clínico
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {formTab === "personales" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                      <Input required value={formData.nombreCompleto} onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: Maria Auxiliadora Chavarría" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Cédula <span className="text-red-500">*</span></label>
                      <Input required value={formData.cedula} onChange={(e) => setFormData({ ...formData, cedula: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: 001-150890-1002G" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Teléfono <span className="text-red-500">*</span></label>
                      <Input required value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: 88889999" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Correo <span className="text-muted-foreground text-xs font-normal">(Opcional)</span></label>
                      <Input type="email" value={formData.correo} onChange={(e) => setFormData({ ...formData, correo: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: correo@ejemplo.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Dirección <span className="text-muted-foreground text-xs font-normal">(Opcional)</span></label>
                      <Input value={formData.direccion} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: Altamira, de la vicky 1c abajo" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Fecha de Nacimiento <span className="text-muted-foreground text-xs font-normal">(Opcional)</span></label>
                      <Input type="date" value={formData.fechaNacimiento} onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })} className="bg-muted/30 border-border" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Sexo <span className="text-muted-foreground text-xs font-normal">(Opcional)</span></label>
                      <select value={formData.sexo} onChange={(e) => setFormData({ ...formData, sexo: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-muted/30 border-border px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        <option value="">Seleccionar...</option>
                        <option value="MASCULINO">Masculino</option>
                        <option value="FEMENINO">Femenino</option>
                        <option value="OTRO">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Tipo de Perfil</label>
                      <select value={formData.tipoPerfil} onChange={(e) => setFormData({ ...formData, tipoPerfil: e.target.value as any })} className="flex h-10 w-full rounded-md border border-input bg-muted/30 border-border px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <option value="CLINICA">Solo Paciente Clínico</option>
                        <option value="AMBOS">Farmacia + Paciente Clínico</option>
                      </select>
                    </div>
                  </div>
                )}

                {formTab === "clinicos" && (
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                        Alergias o Contraindicaciones
                      </label>
                      <Textarea value={formData.datosClinicos.alergias} onChange={(e) => setFormData({ ...formData, datosClinicos: { ...formData.datosClinicos, alergias: e.target.value } })} className="bg-muted/30 border-border min-h-[80px]" placeholder="Ej: Alérgico a la Penicilina, diabético..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                        <BookOpen className="w-4 h-4 text-blue-500" />
                        Antecedentes Patológicos / Familiares
                      </label>
                      <Textarea value={formData.datosClinicos.antecedentes} onChange={(e) => setFormData({ ...formData, datosClinicos: { ...formData.datosClinicos, antecedentes: e.target.value } })} className="bg-muted/30 border-border min-h-[80px]" placeholder="Ej: Hipertensión arterial hereditaria, cirugías previas..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                        <Heart className="w-4 h-4 text-emerald-500" />
                        Diagnóstico General Podológico
                      </label>
                      <Textarea value={formData.datosClinicos.diagnosticoGeneral} onChange={(e) => setFormData({ ...formData, datosClinicos: { ...formData.datosClinicos, diagnosticoGeneral: e.target.value } })} className="bg-muted/30 border-border min-h-[80px]" placeholder="Ej: Onicomicosis severa en primer dedo de pie derecho..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Observaciones Clínicas Adicionales</label>
                      <Textarea value={formData.datosClinicos.observacionesClinicas} onChange={(e) => setFormData({ ...formData, datosClinicos: { ...formData.datosClinicos, observacionesClinicas: e.target.value } })} className="bg-muted/30 border-border min-h-[80px]" placeholder="Notas de seguimiento o indicaciones especiales de calzado..." />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">{editingId ? "Actualizar Paciente" : "Guardar Paciente"}</Button>
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm() }}>Cancelar</Button>
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
                      {["Paciente", "Cédula", "Teléfono", "Alergias / Diagnóstico", "Estado", "Acciones"].map((h) => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPacientes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                          No se encontraron pacientes clínicos.
                        </td>
                      </tr>
                    ) : (
                      filteredPacientes.map((paciente) => (
                        <tr key={paciente.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-foreground">
                            <div>{paciente.nombreCompleto}</div>
                            {paciente.fechaNacimiento && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                {new Date(paciente.fechaNacimiento).toLocaleDateString('es-NI')}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{paciente.cedula || "—"}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{paciente.telefono || "—"}</td>
                          <td className="px-6 py-4 text-sm max-w-[280px]">
                            {paciente.datosClinicos?.alergias && (
                              <div className="text-xs text-red-500 font-medium truncate" title={`Alergias: ${paciente.datosClinicos.alergias}`}>
                                Alergias: {paciente.datosClinicos.alergias}
                              </div>
                            )}
                            {paciente.datosClinicos?.diagnosticoGeneral ? (
                              <div className="text-xs text-muted-foreground truncate" title={paciente.datosClinicos.diagnosticoGeneral}>
                                Diag: {paciente.datosClinicos.diagnosticoGeneral}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/50 italic">Sin diagnóstico clínico</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${paciente.activo ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"}`}>
                              {paciente.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(paciente)} className="text-muted-foreground hover:text-foreground" title="Editar"><Edit2 className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => handleToggleActivo(paciente)} className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10" title={paciente.activo ? "Desactivar" : "Reactivar"}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleHardDelete(paciente)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10" title="Eliminar permanentemente"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
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
