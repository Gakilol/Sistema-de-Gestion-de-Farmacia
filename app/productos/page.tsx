"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit2, Trash2, Download } from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"
import * as XLSX from "xlsx"
import { Skeleton } from "@/components/ui/skeleton"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Categoria {
  id: number
  nombre: string
}

interface Producto {
  id: number
  nombre: string
  categoria: { nombre: string }
  idCategoria?: number
  precioCompra?: string
  precioVenta: string
  precioBlister?: string
  precioCaja?: string
  unidadesPorBlister?: number | null
  unidadesPorCaja?: number | null
  stockActual: number
  stockMinimo?: number | null
  activo: boolean
}

export default function ProductosPage() {
  const { data: productos = [], mutate: mutateProductos, isLoading: loadingProductos } = useSWR("/api/productos?estado=todos", fetcher)
  const { data: categorias = [] } = useSWR("/api/categorias", fetcher)
  
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // formulario
  const [editingId, setEditingId] = useState<number | null>(null)
  const [nombre, setNombre] = useState("")
  const [idCategoria, setIdCategoria] = useState<string>("")
  const [precioCompra, setPrecioCompra] = useState("")
  const [precioVenta, setPrecioVenta] = useState("")
  const [precioBlister, setPrecioBlister] = useState("")
  const [precioCaja, setPrecioCaja] = useState("")
  const [unidadesPorBlister, setUnidadesPorBlister] = useState("")
  const [unidadesPorCaja, setUnidadesPorCaja] = useState("")
  const [stockActual, setStockActual] = useState("")
  const [stockMinimo, setStockMinimo] = useState("")
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = () => {
    // TODO: leer rol desde token; por ahora true para pruebas
    setIsAdmin(true)
  }

  const filteredProductos = Array.isArray(productos) 
    ? productos.filter((p) => p.nombre.toLowerCase().includes(search.toLowerCase()))
    : []

  const resetForm = () => {
    setEditingId(null)
    setNombre("")
    setIdCategoria("")
    setPrecioCompra("")
    setPrecioVenta("")
    setPrecioBlister("")
    setPrecioCaja("")
    setUnidadesPorBlister("")
    setUnidadesPorCaja("")
    setStockActual("")
    setStockMinimo("")
    setFormError(null)
  }

  // cargar datos para editar
  const handleOpenEdit = async (producto: Producto) => {
    try {
      const res = await fetch(`/api/productos/${producto.id}`)
      if (!res.ok) {
        toast.error("No se pudo cargar el producto para edición")
        return
      }
      const p = await res.json()

      setEditingId(p.id)
      setNombre(p.nombre)
      setIdCategoria(String(p.idCategoria))
      setPrecioCompra(p.precioCompra ? String(p.precioCompra) : "")
      setPrecioVenta(String(p.precioVenta))
      setPrecioBlister(p.precioBlister ? String(p.precioBlister) : "")
      setPrecioCaja(p.precioCaja ? String(p.precioCaja) : "")
      setUnidadesPorBlister(p.unidadesPorBlister != null ? String(p.unidadesPorBlister) : "")
      setUnidadesPorCaja(p.unidadesPorCaja != null ? String(p.unidadesPorCaja) : "")
      setStockActual(String(p.stockActual))
      setStockMinimo(p.stockMinimo != null ? String(p.stockMinimo) : "")
      setShowForm(true)
      setFormError(null)
    } catch (err) {
      console.error("Error cargando producto para editar:", err)
      toast.error("Error cargando producto para editar")
    }
  }

  const handleOpenCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const handleCancelForm = () => {
    resetForm()
    setShowForm(false)
  }

  const handleSaveProducto = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormLoading(true)

    try {
      const body = {
        nombre,
        descripcion: "",
        idCategoria: Number(idCategoria),
        precioCompra: precioCompra || null,
        precioVenta: precioVenta || null,
        precioBlister: precioBlister || null,
        precioCaja: precioCaja || null,
        unidadesPorBlister: unidadesPorBlister || null,
        unidadesPorCaja: unidadesPorCaja || null,
        stockActual: stockActual || 0,
        stockMinimo: stockMinimo || null,
        activo: true,
      }

      const url = editingId ? `/api/productos/${editingId}` : "/api/productos"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setFormError(data.error || "No autorizado")
        } else {
          setFormError(data.error || "Error al guardar producto")
        }
        return
      }

      await mutateProductos()
      toast.success(editingId ? "Producto actualizado correctamente" : "Producto creado correctamente")
      handleCancelForm()
    } catch (error) {
      console.error("Error guardando producto:", error)
      setFormError("Error en la conexión con el servidor")
      toast.error("Error en la conexión con el servidor")
    } finally {
      setFormLoading(false)
    }
  }

  // desactivar / reactivar
  const handleToggleActivo = async (producto: Producto) => {
    const accion = producto.activo ? "desactivar" : "reactivar"
    const ok = window.confirm(
      `¿Seguro que deseas ${accion} el producto "${producto.nombre}"?`,
    )
    if (!ok) return

    try {
      const res = await fetch(`/api/productos/${producto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !producto.activo }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(data.error || "No se pudo actualizar el estado del producto")
        return
      }

      await mutateProductos()
      toast.success(`Producto ${producto.activo ? 'desactivado' : 'reactivado'} correctamente`)
    } catch (error) {
      console.error("Error cambiando estado de producto:", error)
      toast.error("Error en la conexión con el servidor")
    }
  }

  const formatStock = (p: Producto) => {
    let uds = p.stockActual;
    let str = `${uds}`;
    if (p.unidadesPorCaja || p.unidadesPorBlister) {
      let cajas = 0;
      let blisters = 0;
      let restantes = uds;

      if (p.unidadesPorCaja) {
        cajas = Math.floor(restantes / p.unidadesPorCaja);
        restantes = restantes % p.unidadesPorCaja;
      }
      if (p.unidadesPorBlister) {
        blisters = Math.floor(restantes / p.unidadesPorBlister);
        restantes = restantes % p.unidadesPorBlister;
      }
      
      str += ` (`;
      if (cajas > 0) str += `${cajas} Caj `;
      if (blisters > 0) str += `${blisters} Blis `;
      if (restantes > 0 || (cajas === 0 && blisters === 0)) str += `${restantes} Uds`;
      str = str.trim() + `)`;
    }
    return str;
  }

  const handleExportExcel = () => {
    if (!Array.isArray(productos) || productos.length === 0) {
      toast.error("No hay productos para exportar");
      return;
    }

    const exportData = productos.map(p => ({
      ID: p.id,
      Nombre: p.nombre,
      Categoría: p.categoria?.nombre || "Sin Categoría",
      Precio_Compra: p.precioCompra ? `C$${Number(p.precioCompra).toFixed(2)}` : "-",
      Precio_Venta: `C$${Number(p.precioVenta).toFixed(2)}`,
      Stock_Actual: formatStock(p),
      Estado: p.activo ? "Activo" : "Inactivo"
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");
    XLSX.writeFile(workbook, "Inventario_Productos.xlsx");
    toast.success("Archivo Excel generado");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
              <p className="text-gray-600 mt-1">Gestiona el inventario de productos</p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button
                  onClick={handleExportExcel}
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
                <Button
                  onClick={showForm ? handleCancelForm : handleOpenCreate}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {showForm ? "Cancelar" : "Nuevo Producto"}
                </Button>
              </div>
            )}
          </div>

          {/* Formulario crear / editar */}
          {isAdmin && showForm && (
            <Card className="p-6 mb-6 bg-white/90 backdrop-blur-md shadow-lg border-gray-100 transition-all">
              <h2 className="text-lg font-semibold mb-4 text-primary">
                {editingId ? "Editar Producto" : "Nuevo Producto"}
              </h2>

              <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSaveProducto}>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <Input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={idCategoria}
                    onChange={(e) => setIdCategoria(e.target.value)}
                    required
                  >
                    <option value="">Selecciona una categoría</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio compra (C$)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={precioCompra}
                    onChange={(e) => setPrecioCompra(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio unidad (C$)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={precioVenta}
                    onChange={(e) => setPrecioVenta(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio blister (C$) (opcional)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={precioBlister}
                    onChange={(e) => setPrecioBlister(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio caja (C$) (opcional)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={precioCaja}
                    onChange={(e) => setPrecioCaja(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidades en Blister (opcional)
                  </label>
                  <Input
                    type="number"
                    value={unidadesPorBlister}
                    onChange={(e) => setUnidadesPorBlister(e.target.value)}
                    placeholder="Ej. 10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidades en Caja (opcional)
                  </label>
                  <Input
                    type="number"
                    value={unidadesPorCaja}
                    onChange={(e) => setUnidadesPorCaja(e.target.value)}
                    placeholder="Ej. 100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock actual (unidades)
                  </label>
                  <Input
                    type="number"
                    value={stockActual}
                    onChange={(e) => setStockActual(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock mínimo (opcional)
                  </label>
                  <Input
                    type="number"
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(e.target.value)}
                  />
                </div>

                {formError && (
                  <div className="col-span-1 md:col-span-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {formError}
                  </div>
                )}

                <div className="col-span-1 md:col-span-2 flex justify-end gap-2 mt-2">
                  <Button type="button" variant="outline" onClick={handleCancelForm}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={formLoading}
                  >
                    {formLoading
                      ? "Guardando..."
                      : editingId
                      ? "Actualizar"
                      : "Guardar"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Búsqueda */}
          <Card className="p-4 mb-6 bg-white/80 backdrop-blur-sm shadow-sm border-gray-100">
            <Input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </Card>

          {/* Tabla */}
          <Card className="bg-white/90 backdrop-blur-sm shadow-sm border-gray-100 overflow-hidden">
            {loadingProductos ? (
              <div className="p-8 space-y-4">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Nombre
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Categoría
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Precio
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Stock
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Estado
                      </th>
                      {isAdmin && (
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                          Acciones
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredProductos.map((producto) => (
                      <tr key={producto.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {producto.nombre}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {producto.categoria.nombre}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          C${Number.parseFloat(String(producto.precioVenta)).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatStock(producto)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              producto.activo
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {producto.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-sm">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEdit(producto)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleActivo(producto)}
                              >
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
