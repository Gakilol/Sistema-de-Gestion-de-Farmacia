"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ToggleRight, ToggleLeft, Settings, Eye, EyeOff, Edit, Trash2, Key, Check, X as XIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { usuarioSchema } from "@/lib/validations"
import { useCurrentUser } from "@/app/hooks/useCurrentUser"

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
  
  // Create / Edit Form states
  const [showForm, setShowForm] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  
  const [formData, setFormData] = useState({ 
    nombreCompleto: "", 
    correo: "", 
    password: "", 
    confirmPassword: "", 
    idRol: "2" 
  })

  // Reset Password states
  const [resettingUser, setResettingUser] = useState<Usuario | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [showResetPassword, setShowResetPassword] = useState(false)

  const { user: loggedInUser } = useCurrentUser()

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
    } catch (err) { 
      console.error(err)
      setUsuarios([]); setError("Error al cargar usuarios") 
    } finally { 
      setLoading(false) 
    }
  }

  // Password Validation Checks
  const getPasswordStrength = (pass: string) => {
    return {
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /\d/.test(pass),
      special: /[@$!%*?&._\-#]/.test(pass)
    }
  }

  const pwChecks = getPasswordStrength(showResetPassword ? newPassword : formData.password)

  const handleEditClick = (u: Usuario) => {
    setEditingUsuario(u)
    let rolId = "2" // default EMPLEADO
    if (u.rolNombre === "ADMIN") rolId = "1"
    else if (u.rolNombre === "DOCTOR") rolId = "3"

    setFormData({
      nombreCompleto: u.nombreCompleto,
      correo: u.correo,
      password: "",
      confirmPassword: "",
      idRol: rolId
    })
    setShowForm(true)
  }

  const handleResetPasswordClick = (u: Usuario) => {
    setResettingUser(u)
    setNewPassword("")
    setConfirmNewPassword("")
    setShowResetPassword(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // For editing, password is optional, so we only validate it if filled.
    if (!editingUsuario && !formData.password) {
      toast.error("La contraseña es requerida para nuevos usuarios")
      return
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error("Las contraseñas no coinciden")
      return
    }

    // Prepare payload
    const payload: any = {
      nombreCompleto: formData.nombreCompleto,
      correo: formData.correo,
      idRol: Number(formData.idRol)
    }
    if (formData.password) {
      payload.password = formData.password
    }

    // Validate using Zod schema
    const validation = usuarioSchema.safeParse(payload)
    if (!validation.success) {
      validation.error.issues.forEach((err: any) => {
        toast.error(err.message)
      })
      return
    }

    try {
      let res
      if (editingUsuario) {
        // PUT edit user details
        res = await fetch(`/api/usuarios/${editingUsuario.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      } else {
        // POST create user
        res = await fetch("/api/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      }

      const data = await res.json()
      if (!res.ok) { 
        toast.error(data.error || "Error al guardar el usuario")
        return 
      }
      
      toast.success(editingUsuario ? "Usuario actualizado exitosamente" : "Usuario creado exitosamente")
      setFormData({ nombreCompleto: "", correo: "", password: "", confirmPassword: "", idRol: "2" })
      setShowForm(false)
      setEditingUsuario(null)
      fetchUsuarios()
    } catch (err) { 
      console.error(err)
      toast.error("Error al guardar el usuario") 
    }
  }

  const handleToggleActivo = async (id: number, activo: boolean) => {
    try {
      const res = await fetch(`/api/usuarios/${id}`, { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ activo: !activo }) 
      })
      const data = await res.json()
      if (!res.ok) { 
        toast.error(data.error || "Error al cambiar estado")
        return 
      }
      toast.success(`Usuario ${!activo ? "activado" : "desactivado"} correctamente`)
      fetchUsuarios()
    } catch (err) { 
      console.error(err) 
      toast.error("Error de conexión al cambiar estado")
    }
  }

  const handleDeleteUsuario = async (id: number, nombre: string) => {
    const ok = window.confirm(`¿Seguro que deseas desactivar de forma permanente al usuario ${nombre}? Esta acción no eliminará sus registros históricos (ventas/auditorías), pero bloqueará su cuenta de forma lógica.`)
    if (!ok) return

    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: "DELETE"
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Error al desactivar el usuario")
        return
      }
      toast.success("Usuario desactivado lógicamente")
      fetchUsuarios()
    } catch (e) {
      toast.error("Error de conexión al desactivar el usuario")
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resettingUser) return

    if (newPassword !== confirmNewPassword) {
      toast.error("Las contraseñas no coinciden")
      return
    }

    if (newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres")
      return
    }

    // Verify rules
    const strength = getPasswordStrength(newPassword)
    if (!strength.lowercase || !strength.uppercase || !strength.number || !strength.special) {
      toast.error("La contraseña debe cumplir con todos los requisitos de seguridad")
      return
    }

    try {
      const res = await fetch(`/api/usuarios/${resettingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword })
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Error al restablecer la contraseña")
        return
      }
      toast.success("Contraseña restablecida exitosamente")
      setShowResetPassword(false)
      setResettingUser(null)
    } catch (e) {
      toast.error("Error de conexión al restablecer contraseña")
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Settings className="w-8 h-8 text-primary" />
                Gestión de Usuarios
              </h1>
              <p className="text-muted-foreground mt-1">Administra los roles, accesos y contraseñas de las cuentas</p>
            </div>
            <Button 
              onClick={() => {
                setEditingUsuario(null)
                setFormData({ nombreCompleto: "", correo: "", password: "", confirmPassword: "", idRol: "2" })
                setShowForm(!showForm)
              }} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              {showForm && !editingUsuario ? "Cancelar" : "Nuevo Usuario"}
            </Button>
          </div>

          {error && <Card className="glass-card p-4 mb-6 border-destructive/30 bg-destructive/5 text-destructive">{error}</Card>}

          {/* Form Create/Edit */}
          {showForm && !error && (
            <Card className="glass-card p-6 mb-6 border border-primary/20">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                {editingUsuario ? `Editar Perfil de: ${editingUsuario.nombreCompleto}` : "Crear Nuevo Usuario"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                    <Input required value={formData.nombreCompleto} onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })} className="bg-muted/30 border-border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Correo Electrónico <span className="text-red-500">*</span></label>
                    <Input type="email" required value={formData.correo} onChange={(e) => setFormData({ ...formData, correo: e.target.value })} className="bg-muted/30 border-border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Rol del Sistema <span className="text-red-500">*</span></label>
                    <select value={formData.idRol} onChange={(e) => setFormData({ ...formData, idRol: e.target.value })} className="w-full p-2.5 rounded-lg bg-muted/30 border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/50">
                      <option value="1">ADMIN - Administrador completo</option>
                      <option value="2">EMPLEADO - Farmacéutico / Caja</option>
                      <option value="3">DOCTOR - Podólogo Clínico</option>
                    </select>
                  </div>

                  {!editingUsuario && (
                    <>
                      <div className="relative">
                        <label className="block text-sm font-medium text-foreground mb-1">Contraseña <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            required={!editingUsuario} 
                            value={formData.password} 
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                            className="bg-muted/30 border-border pr-10" 
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Confirmar Contraseña <span className="text-red-500">*</span></label>
                        <Input 
                          type="password" 
                          required={!editingUsuario} 
                          value={formData.confirmPassword} 
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} 
                          className="bg-muted/30 border-border" 
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Password validation indicators (Only for new user creation) */}
                {!editingUsuario && formData.password.length > 0 && (
                  <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Requisitos de contraseña segura:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        {pwChecks.length ? <Check className="w-4 h-4 text-emerald-500" /> : <XIcon className="w-4 h-4 text-red-500" />}
                        <span className={pwChecks.length ? "text-emerald-500" : "text-muted-foreground"}>Mínimo 8 caracteres</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {pwChecks.uppercase ? <Check className="w-4 h-4 text-emerald-500" /> : <XIcon className="w-4 h-4 text-red-500" />}
                        <span className={pwChecks.uppercase ? "text-emerald-500" : "text-muted-foreground"}>Al menos una mayúscula (A-Z)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {pwChecks.lowercase ? <Check className="w-4 h-4 text-emerald-500" /> : <XIcon className="w-4 h-4 text-red-500" />}
                        <span className={pwChecks.lowercase ? "text-emerald-500" : "text-muted-foreground"}>Al menos una minúscula (a-z)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {pwChecks.number ? <Check className="w-4 h-4 text-emerald-500" /> : <XIcon className="w-4 h-4 text-red-500" />}
                        <span className={pwChecks.number ? "text-emerald-500" : "text-muted-foreground"}>Al menos un número (0-9)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {pwChecks.special ? <Check className="w-4 h-4 text-emerald-500" /> : <XIcon className="w-4 h-4 text-red-500" />}
                        <span className={pwChecks.special ? "text-emerald-500" : "text-muted-foreground"}>Carácter especial (@$!%*?&._-#)</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {editingUsuario ? "Actualizar Datos" : "Guardar Usuario"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingUsuario(null) }}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Reset Password Modal Overlay */}
          {showResetPassword && resettingUser && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <Card className="glass-card w-full max-w-md p-6 border border-primary/20 shadow-2xl relative">
                <button 
                  onClick={() => { setShowResetPassword(false); setResettingUser(null) }} 
                  className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="w-5 h-5" />
                </button>
                
                <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  Restablecer Contraseña
                </h2>
                <p className="text-xs text-muted-foreground mb-6">Restablecer la contraseña para {resettingUser.nombreCompleto}</p>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Nueva Contraseña</label>
                    <Input 
                      type="password" 
                      required 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      className="bg-muted/30 border-border" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Confirmar Nueva Contraseña</label>
                    <Input 
                      type="password" 
                      required 
                      value={confirmNewPassword} 
                      onChange={(e) => setConfirmNewPassword(e.target.value)} 
                      className="bg-muted/30 border-border" 
                    />
                  </div>

                  {newPassword.length > 0 && (
                    <div className="p-3 bg-muted/20 border border-border rounded-xl space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs">
                        {pwChecks.length ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <XIcon className="w-3.5 h-3.5 text-red-500" />}
                        <span className={pwChecks.length ? "text-emerald-500" : "text-muted-foreground"}>Mínimo 8 caracteres</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        {pwChecks.uppercase ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <XIcon className="w-3.5 h-3.5 text-red-500" />}
                        <span className={pwChecks.uppercase ? "text-emerald-500" : "text-muted-foreground"}>Al menos una mayúscula</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        {pwChecks.lowercase ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <XIcon className="w-3.5 h-3.5 text-red-500" />}
                        <span className={pwChecks.lowercase ? "text-emerald-500" : "text-muted-foreground"}>Al menos una minúscula</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        {pwChecks.number ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <XIcon className="w-3.5 h-3.5 text-red-500" />}
                        <span className={pwChecks.number ? "text-emerald-500" : "text-muted-foreground"}>Al menos un número</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        {pwChecks.special ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <XIcon className="w-3.5 h-3.5 text-red-500" />}
                        <span className={pwChecks.special ? "text-emerald-500" : "text-muted-foreground"}>Carácter especial (@$!%*?&._-#)</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 justify-end">
                    <Button type="button" variant="ghost" onClick={() => { setShowResetPassword(false); setResettingUser(null) }}>Cancelar</Button>
                    <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">Restablecer</Button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          {/* User List Table */}
          <Card className="glass-card overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}</div>
            ) : !error ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      {["Nombre", "Correo", "Rol", "Estado", "Acciones"].map((h) => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {usuarios.map((u) => {
                      const isSelf = loggedInUser?.id === u.id
                      return (
                        <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-foreground">
                            {u.nombreCompleto} {isSelf && <span className="text-xs text-primary font-normal bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full ml-2">Tú</span>}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{u.correo}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                              u.rolNombre === "ADMIN" 
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20" 
                                : u.rolNombre === "DOCTOR"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                            }`}>
                              {u.rolNombre}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${u.activo ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"}`}>
                              {u.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center gap-3">
                              {/* Toggle active */}
                              <button 
                                onClick={() => handleToggleActivo(u.id, u.activo)} 
                                title={u.activo ? "Desactivar usuario" : "Activar usuario"}
                                className={`transition-colors ${u.activo ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-foreground"}`}
                              >
                                {u.activo ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                              </button>

                              {/* Edit details */}
                              <button 
                                onClick={() => handleEditClick(u)} 
                                title="Editar perfil"
                                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {/* Reset password */}
                              <button 
                                onClick={() => handleResetPasswordClick(u)} 
                                title="Restablecer contraseña"
                                className="text-muted-foreground hover:text-primary transition-colors p-1"
                              >
                                <Key className="w-4 h-4" />
                              </button>

                              {/* Permanent logical delete */}
                              {!isSelf && (
                                <button 
                                  onClick={() => handleDeleteUsuario(u.id, u.nombreCompleto)} 
                                  title="Eliminar usuario (desactivación permanente)"
                                  className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-sm text-muted-foreground text-center">No hay datos de usuarios para mostrar.</div>
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}
