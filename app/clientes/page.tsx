"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit2, Trash2 } from "lucide-react"

interface Cliente {
  id: number
  nombreCompleto: string
  cedula: string | null
  telefono: string | null
  correo: string | null
  activo: boolean          // 👈 nuevo
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)   // 👈 nuevo
  const [formData, setFormData] = useState({
    nombreCompleto: "",
    cedula: "",
    telefono: "",
    correo: "",
    direccion: "",
  })

  useEffect(() => {
    fetchClientes()
  }, [])

  const fetchClientes = async () => {
    try {
      // 👇 pedimos activos + inactivos para poder reactivar luego
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

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setFormData({
          nombreCompleto: "",
          cedula: "",
          telefono: "",
          correo: "",
          direccion: "",
        })
        setEditingId(null)
        setShowForm(false)
        fetchClientes()
      }
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const handleOpenCreate = () => {
    setEditingId(null)
    setFormData({
      nombreCompleto: "",
      cedula: "",
      telefono: "",
      correo: "",
      direccion: "",
    })
    setShowForm(true)
  }

  const handleEdit = (cliente: Cliente) => {
    setEditingId(cliente.id)
    setFormData({
      nombreCompleto: cliente.nombreCompleto,
      cedula: cliente.cedula || "",
      telefono: cliente.telefono || "",
      correo: cliente.correo || "",
      direccion: "", // si luego quieres guardar dirección, aquí la cargas
    })
    setShowForm(true)
  }

  const handleToggleActivo = async (cliente: Cliente) => {
    const accion = cliente.activo ? "desactivar" : "reactivar"
    const ok = window.confirm(
      `¿Seguro que deseas ${accion} al cliente "${cliente.nombreCompleto}"?`,
    )
    if (!ok) return

    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !cliente.activo }),
      })

      if (res.ok) {
        fetchClientes()
      } else {
        console.error("No se pudo cambiar el estado del cliente")
      }
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const filteredClientes = clientes.filter(
    (c) =>
      c.nombreCompleto.toLowerCase().includes(search.toLowerCase()) ||
      (c.cedula && c.cedula.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
              <p className="text-gray-600 mt-1">Gestiona la base de datos de clientes</p>
            </div>
            <Button
              onClick={showForm ? () => setShowForm(false) : handleOpenCreate}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {showForm ? "Cancelar" : "Nuevo Cliente"}
            </Button>
          </div>

          {/* Búsqueda */}
          <Card className="p-4 mb-6 bg-white">
            <Input
              type="text"
              placeholder="Buscar por nombre o cédula..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </Card>

          {/* Formulario */}
          {showForm && (
            <Card className="p-6 mb-6 bg-white">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo
                    </label>
                    <Input
                      required
                      value={formData.nombreCompleto}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nombreCompleto: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cédula
                    </label>
                    <Input
                      value={formData.cedula}
                      onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <Input
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correo
                    </label>
                    <Input
                      type="email"
                      value={formData.correo}
                      onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    />
                  </div>
                 
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    {editingId ? "Actualizar" : "Guardar"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false)
                      setEditingId(null)
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Tabla de clientes */}
          <Card className="bg-white overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">Cargando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Nombre
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Cédula
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Teléfono
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Correo
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
                    {filteredClientes.map((cliente) => (
                      <tr key={cliente.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {cliente.nombreCompleto}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {cliente.cedula || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {cliente.telefono || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {cliente.correo || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              cliente.activo
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {cliente.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(cliente)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleActivo(cliente)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
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
