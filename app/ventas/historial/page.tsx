"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye } from "lucide-react"

interface Venta {
  id: number
  fecha: string
  cliente: { nombreCompleto: string } | null
  total: string
  metodoPago: string
  numeroReceta: string | null
  detalles: Array<{
    producto: { nombre: string }
    cantidad: number
    precioUnitario: string
  }>
}

export default function HistorialVentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null)
  const [dateFilter, setDateFilter] = useState("")

  useEffect(() => {
    fetchVentas()
  }, [])

  const fetchVentas = async () => {
    try {
      const res = await fetch("/api/ventas")
      const data = await res.json()
      setVentas(data)
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredVentas = ventas.filter((v) => {
    if (!dateFilter) return true
    const fecha = new Date(v.fecha).toISOString().split("T")[0]
    return fecha === dateFilter
  })

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Historial de Ventas</h1>
            <p className="text-gray-600 mt-1">Consulta el historial completo de ventas</p>
          </div>

          {/* Filtros */}
          <Card className="p-4 mb-6 bg-white">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por fecha</label>
                <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
              </div>
              {dateFilter && (
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => setDateFilter("")}>
                    Limpiar filtro
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Tabla de ventas */}
          <Card className="bg-white overflow-hidden mb-6">
            {loading ? (
              <div className="p-8 text-center">Cargando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Fecha</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Cliente</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Productos</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Método Pago</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Total</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredVentas.map((venta) => (
                      <tr key={venta.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(venta.fecha).toLocaleDateString("es-ES")}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {venta.cliente?.nombreCompleto || "Sin cliente"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{venta.detalles.length} item(s)</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {venta.metodoPago}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          C${Number.parseFloat(venta.total).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedVenta(venta)}>
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

          {/* Detalle de venta */}
          {selectedVenta && (
            <Card className="p-6 bg-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Detalle de Venta #{selectedVenta.id}</h2>
                  <p className="text-gray-600">{new Date(selectedVenta.fecha).toLocaleDateString("es-ES")}</p>
                </div>
                <Button variant="outline" onClick={() => setSelectedVenta(null)}>
                  Cerrar
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Cliente</p>
                  <p className="font-medium text-gray-900">{selectedVenta.cliente?.nombreCompleto || "Sin cliente"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Método de Pago</p>
                  <p className="font-medium text-gray-900">{selectedVenta.metodoPago}</p>
                </div>
                {selectedVenta.numeroReceta && (
                  <div>
                    <p className="text-sm text-gray-600">Número de Receta</p>
                    <p className="font-medium text-gray-900">{selectedVenta.numeroReceta}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Productos</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Producto</th>
                      <th className="text-right py-2">Cantidad</th>
                      <th className="text-right py-2">Precio</th>
                      <th className="text-right py-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVenta.detalles.map((det, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2">{det.producto.nombre}</td>
                        <td className="text-right">{det.cantidad}</td>
                        <td className="text-right">C${Number.parseFloat(det.precioUnitario).toFixed(2)}</td>
                        <td className="text-right font-medium">
                          C${(det.cantidad * Number.parseFloat(det.precioUnitario)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 pt-4 border-t text-right">
                  <p className="text-lg font-bold">Total: C${Number.parseFloat(selectedVenta.total).toFixed(2)}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
