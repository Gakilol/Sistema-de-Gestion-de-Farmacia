"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ToggleRight, ToggleLeft } from "lucide-react"

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
  const [formData, setFormData] = useState({
    nombreCompleto: "",
    correo: "",
    password: "",
    idRol: "2", // EMPLEADO por defecto
  })

  useEffect(() => {
    fetchUsuarios()
  }, [])

  const fetchUsuarios = async () => {
    try {
      setLoading(true)
      setError("")

      const res = await fetch("/api/usuarios")
      let data: any = null

      try {
        data = await res.json()
      } catch {
        data = null
      }

      if (!res.ok) {
        // 401 / 403 / 500...
        setUsuarios([])
        setError(data?.error || "No autorizado para ver usuarios")
        return
      }

      if (!Array.isArray(data)) {
        setUsuarios([])
        setError("Respuesta inesperada del servidor")
        return
      }

      setUsuarios(data)
    } catch (err) {
      console.error("Error:", err)
      setUsuarios([])
      setError("Error al cargar usuarios")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || "Error al crear usuario")
        return
      }

      setFormData({
        nombreCompleto: "",
        correo: "",
        password: "",
        idRol: "2",
      })
      setShowForm(false)
      fetchUsuarios()
    } catch (err) {
      console.error("Error:", err)
      alert("Error al crear usuario")
    }
  }

  const handleToggleActivo = async (id: number, activo: boolean) => {
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !activo }), // solo cambiamos estado
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || "Error al actualizar usuario")
        return
      }

      fetchUsuarios()
    } catch (err) {
      console.error("Error:", err)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
              <p className="text-gray-600 mt-1">Gestiona los usuarios del sistema</p>
            </div>
            <Button onClick={() => setShowForm(!showForm)} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Usuario
            </Button>
          </div>

          {/* Mensaje de error / sin permisos */}
          {error && (
            <Card className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700">
              {error}
            </Card>
          )}

          {/* Formulario */}
          {showForm && !error && (
            <Card className="p-6 mb-6 bg-white">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo
                    </label>
                    <Input
                      required
                      value={formData.nombreCompleto}
                      onChange={(e) =>
                        setFormData({ ...formData, nombreCompleto: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correo
                    </label>
                    <Input
                      type="email"
                      required
                      value={formData.correo}
                      onChange={(e) =>
                        setFormData({ ...formData, correo: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña
                    </label>
                    <Input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rol
                    </label>
                    <select
                      value={formData.idRol}
                      onChange={(e) =>
                        setFormData({ ...formData, idRol: e.target.value })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                      <option value="1">ADMIN</option>
                      <option value="2">EMPLEADO</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    Guardar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Tabla de usuarios */}
          <Card className="bg-white overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">Cargando...</div>
            ) : !error ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Nombre
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Correo
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Rol
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Estado
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {usuarios.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {u.nombreCompleto}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {u.correo}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {u.rolNombre}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              u.activo
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {u.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleToggleActivo(u.id, u.activo)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {u.activo ? (
                              <ToggleRight className="w-5 h-5" />
                            ) : (
                              <ToggleLeft className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-sm text-gray-600">
                No hay datos de usuarios para mostrar.
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}
