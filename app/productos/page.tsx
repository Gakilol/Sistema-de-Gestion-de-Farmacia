"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit2, Trash2, Download, Package, DollarSign, Layers, BarChart3, HelpCircle, Info, Search, AlertTriangle, Settings, Eye, Calendar, FileText, X, Loader2, Sliders } from "lucide-react"
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
  const { data: productos = [], mutate: mutateProductos, isLoading: loadingProductos } = useSWR<Producto[]>("/api/productos?estado=todos", fetcher)
  const { data: categorias = [], mutate: mutateCategorias } = useSWR<Categoria[]>("/api/categorias", fetcher)
  
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)

  // Detalles modal
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)

  // Ajuste de stock modal
  const [showAjusteModal, setShowAjusteModal] = useState(false)
  const [ajusteProducto, setAjusteProducto] = useState<Producto | null>(null)
  const [ajusteNuevoStock, setAjusteNuevoStock] = useState("")
  const [ajusteMotivo, setAjusteMotivo] = useState("Inventario Físico")
  const [ajusteMotivoCustom, setAjusteMotivoCustom] = useState("")
  const [ajusteLoading, setAjusteLoading] = useState(false)

  // formulario
  const [editingId, setEditingId] = useState<number | null>(null)
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [descripcionCorta, setDescripcionCorta] = useState("")
  const [descripcionDetallada, setDescripcionDetallada] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [fechaVencimiento, setFechaVencimiento] = useState("")
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
  const [precioVentaError, setPrecioVentaError] = useState<string | null>(null)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = () => {
    // TODO: leer rol desde token; por ahora true para pruebas
    setIsAdmin(true)
  }

  const handleOpenAjusteModal = (producto: Producto) => {
    setAjusteProducto(producto)
    setAjusteNuevoStock(String(producto.stockActual))
    setAjusteMotivo("Inventario Físico")
    setAjusteMotivoCustom("")
    setShowAjusteModal(true)
  }

  const handleAjustarStock = async () => {
    if (!ajusteProducto) return
    const nuevoStock = parseInt(ajusteNuevoStock)
    if (isNaN(nuevoStock) || nuevoStock < 0) {
      toast.error("El nuevo stock debe ser un número válido mayor o igual a 0")
      return
    }
    const motivoFinal = ajusteMotivo === "Otro" ? ajusteMotivoCustom.trim() : ajusteMotivo
    if (!motivoFinal) {
      toast.error("Debes ingresar un motivo para el ajuste")
      return
    }
    setAjusteLoading(true)
    try {
      const res = await fetch(`/api/productos/${ajusteProducto.id}/ajustar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nuevoStock, motivo: motivoFinal }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Error al ajustar el stock")
        return
      }
      toast.success(
        `Stock de "${ajusteProducto.nombre}" ajustado: ${data.stockAnterior} → ${data.nuevoStock} (${data.diferencia >= 0 ? "+" : ""}${data.diferencia})`
      )
      setShowAjusteModal(false)
      await mutateProductos()
    } catch (e) {
      toast.error("Error de conexión al ajustar stock")
    } finally {
      setAjusteLoading(false)
    }
  }

  const handleOpenDetails = async (producto: Producto) => {
    setDetailsLoading(true)
    setSelectedProduct(null)
    setShowDetailsModal(true)
    try {
      const res = await fetch(`/api/productos/${producto.id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedProduct(data)
      } else {
        toast.error("Error al cargar los detalles del producto")
        setShowDetailsModal(false)
      }
    } catch (e) {
      console.error(e)
      toast.error("Error de conexión al cargar detalles")
      setShowDetailsModal(false)
    } finally {
      setDetailsLoading(false)
    }
  }

  const filteredProductos = Array.isArray(productos) 
    ? productos.filter((p) => p.nombre.toLowerCase().includes(search.toLowerCase()))
    : []

  const resetForm = () => {
    setEditingId(null)
    setNombre("")
    setDescripcion("")
    setDescripcionCorta("")
    setDescripcionDetallada("")
    setObservaciones("")
    setFechaVencimiento("")
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
    setPrecioVentaError(null)
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
      setDescripcion(p.descripcion || "")
      setDescripcionCorta(p.descripcionCorta || "")
      setDescripcionDetallada(p.descripcionDetallada || "")
      setObservaciones(p.observaciones || "")
      setFechaVencimiento(p.fechaVencimiento ? String(p.fechaVencimiento).split("T")[0] : "")
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

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
      const res = await fetch("/api/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: newCategoryName, descripcion: "" })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Categoría agregada")
        setNewCategoryName("")
        mutateCategorias()
      } else {
        toast.error(data.error || "Error agregando categoría")
      }
    } catch (e) {
      toast.error("Error de conexión")
    }
  }

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta categoría?")) return
    try {
      const res = await fetch(`/api/categorias/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (res.ok) {
        toast.success("Categoría eliminada")
        if (idCategoria === String(id)) setIdCategoria("")
        mutateCategorias()
      } else {
        toast.error(data.error || "Error eliminando categoría")
      }
    } catch (e) {
      toast.error("Error de conexión")
    }
  }

  // ─── Helpers para sugerencia de precios con margen 20% ───
  const calcSugerido = (precioCompraVal: string, unidades: string) => {
    const pc = parseFloat(precioCompraVal)
    const u = parseInt(unidades)
    if (!isNaN(pc) && pc > 0 && !isNaN(u) && u > 0) {
      return (pc * u * 1.20).toFixed(2)
    }
    return ""
  }

  const handlePrecioCompraChange = (value: string) => {
    setPrecioCompra(value)
    // Validar precio de venta en tiempo real
    if (value && precioVenta) {
      const pc = parseFloat(value)
      const pv = parseFloat(precioVenta)
      if (!isNaN(pc) && !isNaN(pv) && pv <= pc) {
        setPrecioVentaError(`El precio de venta debe ser mayor a C$${pc.toFixed(2)}`)
      } else {
        setPrecioVentaError(null)
      }
    } else {
      setPrecioVentaError(null)
    }
    // Sugerir precios de blister y caja
    if (unidadesPorBlister) {
      const sugerido = calcSugerido(value, unidadesPorBlister)
      if (sugerido) setPrecioBlister(sugerido)
    }
    if (unidadesPorCaja) {
      const sugerido = calcSugerido(value, unidadesPorCaja)
      if (sugerido) setPrecioCaja(sugerido)
    }
  }

  const handlePrecioVentaChange = (value: string) => {
    setPrecioVenta(value)
    if (precioCompra && value) {
      const pc = parseFloat(precioCompra)
      const pv = parseFloat(value)
      if (!isNaN(pc) && !isNaN(pv) && pv <= pc) {
        setPrecioVentaError(`El precio de venta debe ser mayor a C$${pc.toFixed(2)}`)
      } else {
        setPrecioVentaError(null)
      }
    } else {
      setPrecioVentaError(null)
    }
  }

  const handleUnidadesPorBlisterChange = (value: string) => {
    setUnidadesPorBlister(value)
    if (precioCompra) {
      const sugerido = calcSugerido(precioCompra, value)
      if (sugerido) setPrecioBlister(sugerido)
    }
  }

  const handleUnidadesPorCajaChange = (value: string) => {
    setUnidadesPorCaja(value)
    if (precioCompra) {
      const sugerido = calcSugerido(precioCompra, value)
      if (sugerido) setPrecioCaja(sugerido)
    }
  }

  const handleSaveProducto = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormLoading(true)

    // ── Validación: precio de venta > precio de compra ──
    if (precioCompra && precioVenta) {
      const pc = parseFloat(precioCompra)
      const pv = parseFloat(precioVenta)
      if (!isNaN(pc) && !isNaN(pv) && pv <= pc) {
        setFormError(`El precio de venta (C$${pv.toFixed(2)}) debe ser mayor al precio de compra (C$${pc.toFixed(2)}). No puedes vender al costo o por debajo.`)
        setPrecioVentaError(`Debe ser mayor a C$${pc.toFixed(2)}`)
        setFormLoading(false)
        return
      }
    }

    try {
      const body = {
        nombre,
        descripcion: descripcion || null,
        descripcionCorta: descripcionCorta || null,
        descripcionDetallada: descripcionDetallada || null,
        observaciones: observaciones || null,
        fechaVencimiento: fechaVencimiento || null,
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
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                        <span>Categoría <span className="text-red-500">*</span></span>
                        <button type="button" onClick={() => setShowCategoryModal(true)} className="text-xs text-primary flex items-center hover:underline">
                          <Settings className="w-3 h-3 mr-1" />
                          Gestionar
                        </button>
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

                {/* ─── SECCIÓN: DESCRIPCIÓN Y DETALLES ─── */}
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/30 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-indigo-100 rounded-md">
                      <Info className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-indigo-800">Descripción y Detalles (Opcional)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción Corta</label>
                      <Input value={descripcionCorta} onChange={(e) => setDescripcionCorta(e.target.value)} placeholder="Ej: Analgésico y antipirético" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                      <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: Uso para el dolor y la fiebre" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción Detallada</label>
                      <textarea value={descripcionDetallada} onChange={(e) => setDescripcionDetallada(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none" rows={3} placeholder="Detalles completos..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                      <Input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Ej: Mantener fuera del alcance de niños" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
                      <Input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} className="bg-white" />
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
                        onChange={(e) => handlePrecioCompraChange(e.target.value)}
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
                        onChange={(e) => handlePrecioVentaChange(e.target.value)}
                        placeholder="Ej: 5.00"
                        required
                        className={precioVentaError ? "border-red-400 focus:ring-red-200 focus:border-red-400" : ""}
                      />
                      {precioVentaError ? (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {precioVentaError}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-1">Precio al público por 1 pastilla o unidad suelta.</p>
                      )}
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
                      <p className="text-xs text-gray-400 mt-1">
                        Precio al vender un blister completo.
                        {precioCompra && unidadesPorBlister && calcSugerido(precioCompra, unidadesPorBlister) && (
                          <span className="text-emerald-600 font-medium ml-1">
                            Sugerido con 20% de ganancia: {"C$" + calcSugerido(precioCompra, unidadesPorBlister)}
                          </span>
                        )}
                      </p>
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
                      <p className="text-xs text-gray-400 mt-1">
                        Precio al vender la caja cerrada completa.
                        {precioCompra && unidadesPorCaja && calcSugerido(precioCompra, unidadesPorCaja) && (
                          <span className="text-emerald-600 font-medium ml-1">
                            Sugerido con 20% de ganancia: {"C$" + calcSugerido(precioCompra, unidadesPorCaja)}
                          </span>
                        )}
                      </p>
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
                        onChange={(e) => handleUnidadesPorBlisterChange(e.target.value)}
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
                        onChange={(e) => handleUnidadesPorCajaChange(e.target.value)}
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
                                onClick={() => handleOpenDetails(producto)}
                                className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                title="Ver detalles"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEdit(producto)}
                                className="text-muted-foreground hover:text-foreground"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              {producto.activo && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenAjusteModal(producto)}
                                  className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                                  title="Ajustar Stock"
                                >
                                  <Sliders className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleActivo(producto)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                title={producto.activo ? "Desactivar" : "Reactivar"}
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

      {/* Modal Ajuste de Stock */}
      {showAjusteModal && ajusteProducto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="glass-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <Sliders className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Ajuste de Stock</h2>
                  <p className="text-xs text-muted-foreground">{ajusteProducto.nombre}</p>
                </div>
              </div>
              <button onClick={() => setShowAjusteModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Stock actual */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Stock actual</span>
                <span className="text-xl font-bold text-foreground">{ajusteProducto.stockActual} <span className="text-xs font-normal text-muted-foreground">uds</span></span>
              </div>

              {/* Nuevo stock */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nuevo Stock (unidades)</label>
                <input
                  type="number"
                  min="0"
                  value={ajusteNuevoStock}
                  onChange={e => setAjusteNuevoStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Ej: 100"
                />
                {ajusteNuevoStock !== "" && !isNaN(parseInt(ajusteNuevoStock)) && (
                  <p className={`text-xs mt-1 font-medium ${
                    parseInt(ajusteNuevoStock) > ajusteProducto.stockActual ? "text-emerald-500" :
                    parseInt(ajusteNuevoStock) < ajusteProducto.stockActual ? "text-red-400" : "text-muted-foreground"
                  }`}>
                    Diferencia: {parseInt(ajusteNuevoStock) - ajusteProducto.stockActual >= 0 ? "+" : ""}{parseInt(ajusteNuevoStock) - ajusteProducto.stockActual} unidades
                  </p>
                )}
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Motivo del ajuste</label>
                <select
                  value={ajusteMotivo}
                  onChange={e => setAjusteMotivo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 mb-2"
                >
                  <option value="Inventario Físico">Inventario Físico</option>
                  <option value="Medicamento Vencido">Medicamento Vencido</option>
                  <option value="Pérdida / Daño">Pérdida / Daño</option>
                  <option value="Error de Registro">Error de Registro</option>
                  <option value="Recepción de Mercancía">Recepción de Mercancía</option>
                  <option value="Otro">Otro (especificar)</option>
                </select>
                {ajusteMotivo === "Otro" && (
                  <input
                    type="text"
                    value={ajusteMotivoCustom}
                    onChange={e => setAjusteMotivoCustom(e.target.value)}
                    placeholder="Describe el motivo..."
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowAjusteModal(false)} disabled={ajusteLoading}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleAjustarStock}
                disabled={ajusteLoading}
              >
                {ajusteLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Ajustando...</>
                ) : (
                  <><Sliders className="w-4 h-4 mr-2" />Aplicar Ajuste</>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="glass-card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Gestionar Categorías</h2>
            
            <div className="flex gap-2 mb-6">
              <Input 
                value={newCategoryName} 
                onChange={(e) => setNewCategoryName(e.target.value)} 
                placeholder="Nueva categoría..." 
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
              />
              <Button onClick={handleCreateCategory} className="bg-primary hover:bg-primary/90 text-primary-foreground">Agregar</Button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {categorias.length === 0 && <p className="text-sm text-muted-foreground text-center">No hay categorías registradas</p>}
              {categorias.map(cat => (
                <div key={cat.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/30 border border-border">
                  <span className="text-sm">{cat.nombre}</span>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteCategory(cat.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => setShowCategoryModal(false)}>Cerrar</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de Detalles del Producto */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="glass-card w-full max-w-2xl p-6 relative max-h-[90vh] flex flex-col shadow-2xl rounded-2xl animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowDetailsModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 hover:bg-muted/40 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {detailsLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Cargando información del producto...</p>
              </div>
            ) : selectedProduct ? (
              <>
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold text-foreground">{selectedProduct.nombre}</h2>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${selectedProduct.activo ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"}`}>
                        {selectedProduct.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <p className="text-sm text-primary font-medium mt-1">Categoría: {selectedProduct.categoria?.nombre || "Sin Categoría"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleOpenEdit(selectedProduct);
                      }}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Editar
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 pr-1">
                  {/* Fila 1: Presentaciones y Precios */}
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/20 p-4">
                    <h3 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Precios y Presentaciones
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Unidad */}
                      <div className="bg-background/60 p-3 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground font-medium">Unidad Individual</p>
                        <div className="mt-1 space-y-1">
                          <p className="text-xs text-gray-500">Compra: <span className="font-semibold text-foreground">C${Number(selectedProduct.precioCompra || 0).toFixed(2)}</span></p>
                          <p className="text-sm font-bold text-emerald-600">Venta: C${Number(selectedProduct.precioVenta).toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Blister */}
                      <div className="bg-background/60 p-3 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground font-medium">Por Blister</p>
                        <div className="mt-1 space-y-1">
                          <p className="text-xs text-gray-500">Capacidad: <span className="font-medium text-foreground">{selectedProduct.unidadesPorBlister ? `${selectedProduct.unidadesPorBlister} uds` : "No define"}</span></p>
                          <p className="text-sm font-bold text-emerald-600">
                            Venta: {selectedProduct.precioBlister ? `C$${Number(selectedProduct.precioBlister).toFixed(2)}` : "—"}
                          </p>
                        </div>
                      </div>

                      {/* Caja */}
                      <div className="bg-background/60 p-3 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground font-medium">Por Caja</p>
                        <div className="mt-1 space-y-1">
                          <p className="text-xs text-gray-500">Capacidad: <span className="font-medium text-foreground">{selectedProduct.unidadesPorCaja ? `${selectedProduct.unidadesPorCaja} uds` : "No define"}</span></p>
                          <p className="text-sm font-bold text-emerald-600">
                            Venta: {selectedProduct.precioCaja ? `C$${Number(selectedProduct.precioCaja).toFixed(2)}` : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fila 2: Inventario y Alertas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-amber-100 bg-amber-50/20 p-4">
                      <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Inventario
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Stock Físico Real</p>
                          <p className="text-lg font-bold text-foreground">{formatStock(selectedProduct)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-100">
                          <div>
                            <p className="text-xs text-muted-foreground">Mínimo Requerido</p>
                            <p className="text-sm font-semibold text-foreground">{selectedProduct.stockMinimo != null ? `${selectedProduct.stockMinimo} uds` : "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Estado Stock</p>
                            {selectedProduct.stockActual <= (selectedProduct.stockMinimo || 0) ? (
                              <span className="text-xs font-semibold text-red-500 bg-red-100 px-2 py-0.5 rounded-full inline-block animate-pulse">¡Stock Bajo!</span>
                            ) : (
                              <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full inline-block">Óptimo</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-indigo-100 bg-indigo-50/20 p-4 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Fechas Críticas
                        </h3>
                        <p className="text-xs text-muted-foreground">Fecha de Vencimiento</p>
                        <p className="text-base font-semibold text-foreground mt-1">
                          {selectedProduct.fechaVencimiento ? new Date(selectedProduct.fechaVencimiento).toLocaleDateString('es-NI', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : "No especificada"}
                        </p>
                      </div>
                      {selectedProduct.fechaVencimiento && (
                        <div className="mt-2">
                          {new Date(selectedProduct.fechaVencimiento).getTime() <= new Date().getTime() ? (
                            <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-md block text-center border border-red-200">
                              ⚠️ Medicamento Vencido
                            </span>
                          ) : new Date(selectedProduct.fechaVencimiento).getTime() <= new Date().getTime() + (30 * 24 * 60 * 60 * 1000) ? (
                            <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-1 rounded-md block text-center border border-amber-200 animate-pulse">
                              ⚠️ Vence en menos de 30 días
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md block text-center border border-emerald-200">
                              ✓ Vigente y Seguro
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fila 3: Descripciones y Observaciones */}
                  <div className="rounded-lg border border-blue-100 bg-blue-50/20 p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-blue-800 mb-1 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Descripciones y Ficha Técnica
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-background/60 p-3 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground font-semibold">Descripción Corta</p>
                        <p className="text-sm text-foreground mt-1 font-medium">{selectedProduct.descripcionCorta || "—"}</p>
                      </div>

                      <div className="bg-background/60 p-3 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground font-semibold">Descripción General</p>
                        <p className="text-sm text-foreground mt-1 font-medium">{selectedProduct.descripcion || "—"}</p>
                      </div>

                      <div className="md:col-span-2 bg-background/60 p-3 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground font-semibold">Ficha / Descripción Detallada</p>
                        <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{selectedProduct.descripcionDetallada || "—"}</p>
                      </div>

                      <div className="md:col-span-2 bg-background/60 p-3 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground font-semibold">Observaciones / Indicaciones Especiales</p>
                        <p className="text-sm text-foreground mt-1">{selectedProduct.observaciones || "—"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowDetailsModal(false)}>Cerrar Detalles</Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-red-500">
                <AlertTriangle className="w-8 h-8" />
                <p className="text-sm font-medium">No se pudieron cargar los detalles del producto.</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
