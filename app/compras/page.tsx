"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Eye, Trash2 } from "lucide-react"

interface Compra {
  id: number
  fecha: string
  proveedor: { nombre: string }
  total: string
  detalles: Array<{
    producto: { nombre: string }
    cantidad: number
  }>
}

interface Proveedor {
  id: number
  nombre: string
}

interface Producto {
  id: number
  nombre: string
}

interface DetalleForm {
  idProducto: string // lo manejamos como string en el form
  cantidad: string
  precioUnitario: string
}

export default function ComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([])
  const [loading, setLoading] = useState(true)

  // Formulario nueva compra
  const [showForm, setShowForm] = useState(false)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [proveedorId, setProveedorId] = useState<string>("")
  const [detalles, setDetalles] = useState<DetalleForm[]>([
    { idProducto: "", cantidad: "1", precioUnitario: "" },
  ])
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Detalle de compra seleccionada
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null)

  useEffect(() => {
    fetchCompras()
    fetchProveedores()
    fetchProductos()
  }, [])

  const fetchCompras = async () => {
    try {
      const res = await fetch("/api/compras")
      const data = await res.json()
      setCompras(data)
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProveedores = async () => {
    try {
      const res = await fetch("/api/proveedores")
      const data = await res.json()
      setProveedores(data)
    } catch (error) {
      console.error("Error cargando proveedores:", error)
    }
  }

  const fetchProductos = async () => {
    try {
      // si tu API de productos tiene filtro de estado, aquí podrías usar ?estado=activos
      const res = await fetch("/api/productos")
      const data = await res.json()
      setProductos(data)
    } catch (error) {
      console.error("Error cargando productos:", error)
    }
  }

  const resetForm = () => {
    setProveedorId("")
    setDetalles([{ idProducto: "", cantidad: "1", precioUnitario: "" }])
    setFormError(null)
  }

  const handleToggleForm = () => {
    if (showForm) {
      resetForm()
    }
    setShowForm(!showForm)
  }

  const handleDetalleChange = (index: number, field: keyof DetalleForm, value: string) => {
    setDetalles((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)),
    )
  }

  const handleAddDetalle = () => {
    setDetalles((prev) => [...prev, { idProducto: "", cantidad: "1", precioUnitario: "" }])
  }

  const handleRemoveDetalle = (index: number) => {
    setDetalles((prev) => prev.filter((_, i) => i !== index))
  }

  const totalCalculado = detalles.reduce((acc, d) => {
    const precio = Number.parseFloat(d.precioUnitario || "0")
    const cant = Number.parseInt(d.cantidad || "0")
    return acc + precio * cant
  }, 0)

  const handleSubmitCompra = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!proveedorId) {
      setFormError("Selecciona un proveedor")
      return
    }

    const detallesValidos = detalles.filter(
      (d) => d.idProducto && d.cantidad && d.precioUnitario,
    )

    if (detallesValidos.length === 0) {
      setFormError("Agrega al menos un producto con cantidad y precio")
      return
    }

    const payload = {
      idProveedor: Number(proveedorId),
      detalles: detallesValidos.map((d) => ({
        idProducto: Number(d.idProducto),
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
      })),
    }

    try {
      setFormLoading(true)
      const res = await fetch("/api/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setFormError(data.error || "Error al registrar la compra")
        return
      }

      // recargar lista
      await fetchCompras()
      resetForm()
      setShowForm(false)
    } catch (error) {
      console.error("Error creando compra:", error)
      setFormError("Error en la conexión con el servidor")
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Compras</h1>
              <p className="text-gray-600 mt-1">Historial de compras a proveedores</p>
            </div>
            <Button onClick={handleToggleForm} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              {showForm ? "Cancelar" : "Nueva Compra"}
            </Button>
          </div>

          {/* Formulario Nueva Compra */}
          {showForm && (
            <Card className="mb-6 p-6 bg-white">
              <h2 className="text-lg font-semibold mb-4">Registrar nueva compra</h2>
              <form className="space-y-4" onSubmit={handleSubmitCompra}>
                {/* Proveedor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proveedor
                  </label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                    required
                  >
                    <option value="">Selecciona un proveedor</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Detalles */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Productos</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddDetalle}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar fila
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {detalles.map((d, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-2 items-center border rounded-md px-3 py-2"
                      >
                        <div className="col-span-5">
                          <select
                            className="w-full border rounded-md px-2 py-1 text-sm"
                            value={d.idProducto}
                            onChange={(e) =>
                              handleDetalleChange(index, "idProducto", e.target.value)
                            }
                            required
                          >
                            <option value="">Producto</option>
                            {productos.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            min={1}
                            value={d.cantidad}
                            onChange={(e) =>
                              handleDetalleChange(index, "cantidad", e.target.value)
                            }
                            placeholder="Cantidad"
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            value={d.precioUnitario}
                            onChange={(e) =>
                              handleDetalleChange(index, "precioUnitario", e.target.value)
                            }
                            placeholder="Precio unit."
                          />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          {detalles.length > 1 && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveDetalle(index)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Error y total */}
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {formError}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t mt-2">
                  <p className="text-sm text-gray-700">
                    Total estimado:{" "}
                    <span className="font-semibold">
                      C${totalCalculado.toFixed(2)}
                    </span>
                  </p>
                  <Button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={formLoading}
                  >
                    {formLoading ? "Guardando..." : "Registrar compra"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Tabla de compras */}
          <Card className="bg-white overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">Cargando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Fecha
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Proveedor
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Productos
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Total
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {compras.map((compra) => (
                      <tr key={compra.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(compra.fecha).toLocaleDateString("es-ES")}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {compra.proveedor.nombre}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {compra.detalles.length} item(s)
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          C${Number.parseFloat(compra.total).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedCompra(compra)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Detalle de compra */}
          {selectedCompra && (
            <Card className="mt-6 p-6 bg-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Detalle de Compra #{selectedCompra.id}
                  </h2>
                  <p className="text-gray-600">
                    {selectedCompra.proveedor.nombre} -{" "}
                    {new Date(selectedCompra.fecha).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setSelectedCompra(null)}>
                  Cerrar
                </Button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Producto</th>
                    <th className="text-right py-2">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCompra.detalles.map((det, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2">{det.producto.nombre}</td>
                      <td className="text-right">{det.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 pt-4 border-t text-right">
                <p className="text-lg font-bold">
                  Total: C${Number.parseFloat(selectedCompra.total).toFixed(2)}
                </p>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
