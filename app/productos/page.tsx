"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit2, Trash2, Download, Package, DollarSign, Layers, BarChart3, HelpCircle, Info, Search } from "lucide-react"
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
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"><Package className="w-8 h-8 text-primary" />Productos</h1>
              <p className="text-muted-foreground mt-1">Gestiona el inventario de productos</p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button
                  onClick={handleExportExcel}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
                <Button
                  onClick={showForm ? handleCancelForm : handleOpenCreate}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {showForm ? "Cancelar" : "Nuevo Producto"}
                </Button>
              </div>
            )}
          </div>

          {/* Formulario crear / editar */}
          {isAdmin && showForm && (
            <Card className="glass-card p-6 mb-6 transition-all">
              <h2 className="text-lg font-semibold mb-1 text-primary">
                {editingId ? "Editar Producto" : "Nuevo Producto"}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {editingId 
                  ? "Modifica los campos que necesites y presiona Actualizar." 
                  : "Completa los campos obligatorios (*) para registrar un nuevo producto."}
              </p>

              <form onSubmit={handleSaveProducto} className="space-y-6">
                
                {/* ─── SECCIÓN 1: INFORMACIÓN BÁSICA ─── */}
                <div className="rounded-lg border border-blue-100 bg-blue-50/30 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-blue-100 rounded-md">
                      <Package className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-blue-800">Información Básica</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre del producto <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Ej: Paracetamol 500mg"
                        required
                      />
                      <p className="text-xs text-gray-400 mt-1">Nombre comercial o genérico del medicamento.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Categoría <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
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
                      <p className="text-xs text-gray-400 mt-1">Grupo al que pertenece (Analgésicos, Antibióticos, etc.)</p>
                    </div>
                  </div>
                </div>

                {/* ─── SECCIÓN 2: PRECIOS ─── */}
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-emerald-100 rounded-md">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-emerald-800">Precios</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Precio de compra (C$)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={precioCompra}
                        onChange={(e) => setPrecioCompra(e.target.value)}
                        placeholder="Ej: 2.00"
                      />
                      <p className="text-xs text-gray-400 mt-1">Lo que pagaste al proveedor por unidad.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Precio de venta por unidad (C$) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={precioVenta}
                        onChange={(e) => setPrecioVenta(e.target.value)}
                        placeholder="Ej: 5.00"
                        required
                      />
                      <p className="text-xs text-gray-400 mt-1">Precio al público por 1 pastilla o unidad suelta.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Precio por blister (C$) <span className="text-gray-400 text-xs font-normal">— opcional</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={precioBlister}
                        onChange={(e) => setPrecioBlister(e.target.value)}
                        placeholder="Ej: 45.00"
                      />
                      <p className="text-xs text-gray-400 mt-1">Precio al vender un blister/cartoncito completo.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Precio por caja (C$) <span className="text-gray-400 text-xs font-normal">— opcional</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={precioCaja}
                        onChange={(e) => setPrecioCaja(e.target.value)}
                        placeholder="Ej: 400.00"
                      />
                      <p className="text-xs text-gray-400 mt-1">Precio al vender la caja cerrada completa.</p>
                    </div>
                  </div>
                </div>

                {/* ─── SECCIÓN 3: EMPAQUE / PRESENTACIÓN ─── */}
                <div className="rounded-lg border border-purple-100 bg-purple-50/30 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-purple-100 rounded-md">
                        <Layers className="w-4 h-4 text-purple-600" />
                      </div>
                      <h3 className="text-sm font-semibold text-purple-800">Empaque / Presentación</h3>
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">Opcional</span>
                  </div>
                  <div className="flex items-start gap-2 mb-4 p-3 bg-purple-50 rounded-md border border-purple-100">
                    <Info className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-purple-700">
                      Define cuántas unidades tiene cada presentación. Esto permite que al vender por blister o caja, 
                      el sistema descuente automáticamente las unidades correctas del stock.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unidades por blister
                      </label>
                      <Input
                        type="number"
                        value={unidadesPorBlister}
                        onChange={(e) => setUnidadesPorBlister(e.target.value)}
                        placeholder="Ej: 10"
                      />
                      <p className="text-xs text-gray-400 mt-1">¿Cuántas pastillas trae cada blister?</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unidades por caja
                      </label>
                      <Input
                        type="number"
                        value={unidadesPorCaja}
                        onChange={(e) => setUnidadesPorCaja(e.target.value)}
                        placeholder="Ej: 100"
                      />
                      <p className="text-xs text-gray-400 mt-1">¿Cuántas pastillas trae la caja completa?</p>
                    </div>
                  </div>
                </div>

                {/* ─── SECCIÓN 4: INVENTARIO ─── */}
                <div className="rounded-lg border border-amber-100 bg-amber-50/30 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-amber-100 rounded-md">
                      <BarChart3 className="w-4 h-4 text-amber-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-amber-800">Inventario</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stock actual (unidades individuales) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        value={stockActual}
                        onChange={(e) => setStockActual(e.target.value)}
                        placeholder="Ej: 500"
                        required
                      />
                      <p className="text-xs text-gray-400 mt-1">Total de unidades sueltas que tienes ahora mismo.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stock mínimo <span className="text-gray-400 text-xs font-normal">— alerta automática</span>
                      </label>
                      <Input
                        type="number"
                        value={stockMinimo}
                        onChange={(e) => setStockMinimo(e.target.value)}
                        placeholder="Ej: 50"
                      />
                      <p className="text-xs text-gray-400 mt-1">Si el stock baja de este número, recibirás una alerta para reabastecer.</p>
                    </div>
                  </div>
                </div>

                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 shrink-0" />
                    {formError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
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
          <Card className="glass-card p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-muted/30 border-border w-full"
              />
            </div>
          </Card>

          {/* Tabla */}
          <Card className="glass-card overflow-hidden">
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
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      {["Nombre", "Categoría", "Precio", "Stock", "Estado", ...(isAdmin ? ["Acciones"] : [])].map((h) => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProductos.map((producto) => (
                      <tr key={producto.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-foreground">
                          {producto.nombre}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {producto.categoria.nombre}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-foreground">
                          C${Number.parseFloat(String(producto.precioVenta)).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {formatStock(producto)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              producto.activo
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : "bg-muted text-muted-foreground border border-border"
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
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleActivo(producto)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-4 h-4" />
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
