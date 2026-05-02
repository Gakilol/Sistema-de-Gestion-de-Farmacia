"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit2, Trash2 } from "lucide-react"

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
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    correo: "",
    direccion: "",
  })

  useEffect(() => {
    fetchProveedores()
    checkAdmin()
  }, [])

  const fetchProveedores = async () => {
    try {
      const res = await fetch("/api/proveedores")
      const data = await res.json()
      setProveedores(data)
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const checkAdmin = () => {
    setIsAdmin(true) // Verificar en token real
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/proveedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setFormData({
          nombre: "",
          telefono: "",
          correo: "",
          direccion: "",
        })
        setShowForm(false)
        fetchProveedores()
      }
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm("¿Eliminar este proveedor?")) {
      try {
        const res = await fetch(`/api/proveedores/${id}`, {
          method: "DELETE",
        })

        if (res.ok) {
          fetchProveedores()
        }
      } catch (error) {
        console.error("Error:", error)
      }
    }
  }

  const filteredProveedores = proveedores.filter((p) => p.nombre.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Proveedores</h1>
              <p className="text-gray-600 mt-1">Gestiona la lista de proveedores</p>
            </div>
            {isAdmin && (
              <Button onClick={() => setShowForm(!showForm)} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Proveedor
              </Button>
            )}
          </div>

          {/* Búsqueda */}
          <Card className="p-4 mb-6 bg-white">
            <Input
              type="text"
              placeholder="Buscar proveedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </Card>

          {/* Formulario */}
          {showForm && isAdmin && (
            <Card className="p-6 mb-6 bg-white">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <Input
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <Input
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                    <Input
                      type="email"
                      value={formData.correo}
                      onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                    <Input
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    Guardar
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Tabla de proveedores */}
          <Card className="bg-white overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">Cargando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nombre</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Teléfono</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Correo</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Dirección</th>
                      {isAdmin && <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredProveedores.map((proveedor) => (
                      <tr key={proveedor.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{proveedor.nombre}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{proveedor.telefono || "-"}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{proveedor.correo || "-"}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{proveedor.direccion || "-"}</td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-sm">
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(proveedor.id)}>
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
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
