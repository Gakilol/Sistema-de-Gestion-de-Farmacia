"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Edit2, Trash2, Search, Settings, Tag, Calendar, ShoppingCart, Percent, User, Layers, Info, Package } from "lucide-react"
import useSWR from "swr"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Descuento {
  id: number
  nombre: string
  descripcion: string | null
  tipoAplicacion: "PRODUCTO" | "CATEGORIA" | "CLIENTE" | "VENTA_GENERAL"
  tipoValor: "PORCENTAJE" | "MONTO_FIJO"
  valor: string
  fechaInicio: string | null
  fechaFin: string | null
  montoMinimoCompra: string | null
  cantidadMinima: number
  limiteUso: number | null
  usosActuales: number
  esAcumulable: boolean
  activo: boolean
  _count?: {
    ventas: number
  }
  productos?: Array<{ producto: { id: number; nombre: string } }>
  categorias?: Array<{ categoria: { id: number; nombre: string } }>
  clientes?: Array<{ cliente: { id: number; nombreCompleto: string } }>
}

export default function DescuentosPage() {
  const { data: descuentos = [], mutate: mutateDescuentos, isLoading: loadingDescuentos } = useSWR<Descuento[]>("/api/descuentos?estado=todos", fetcher)
  const { data: productos = [] } = useSWR<any[]>("/api/productos?estado=activos", fetcher)
  const { data: categorias = [] } = useSWR<any[]>("/api/categorias", fetcher)
  const { data: clientes = [] } = useSWR<any[]>("/api/clientes?estado=activos", fetcher)

  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Form State
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [tipoAplicacion, setTipoAplicacion] = useState<"PRODUCTO" | "CATEGORIA" | "CLIENTE" | "VENTA_GENERAL">("VENTA_GENERAL")
  const [tipoValor, setTipoValor] = useState<"PORCENTAJE" | "MONTO_FIJO">("PORCENTAJE")
  const [valor, setValor] = useState("")
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")
  const [montoMinimoCompra, setMontoMinimoCompra] = useState("")
  const [cantidadMinima, setCantidadMinima] = useState("0")
  const [limiteUso, setLimiteUso] = useState("")
  const [esAcumulable, setEsAcumulable] = useState(false)
  const [activo, setActivo] = useState(true)

  // Selected Relationships
  const [selectedProductos, setSelectedProductos] = useState<number[]>([])
  const [selectedCategorias, setSelectedCategorias] = useState<number[]>([])
  const [selectedClientes, setSelectedClientes] = useState<number[]>([])

  // Search filters for lists inside form
  const [prodSearch, setProdSearch] = useState("")
  const [cliSearch, setCliSearch] = useState("")

  const resetForm = () => {
    setEditingId(null)
    setNombre("")
    setDescripcion("")
    setTipoAplicacion("VENTA_GENERAL")
    setTipoValor("PORCENTAJE")
    setValor("")
    setFechaInicio("")
    setFechaFin("")
    setMontoMinimoCompra("")
    setCantidadMinima("0")
    setLimiteUso("")
    setEsAcumulable(false)
    setActivo(true)
    setSelectedProductos([])
    setSelectedCategorias([])
    setSelectedClientes([])
    setProdSearch("")
    setCliSearch("")
  }

  const handleOpenCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const handleOpenEdit = async (d: Descuento) => {
    resetForm()
    setEditingId(d.id)
    setNombre(d.nombre)
    setDescripcion(d.descripcion || "")
    setTipoAplicacion(d.tipoAplicacion)
    setTipoValor(d.tipoValor)
    setValor(String(d.valor))
    setFechaInicio(d.fechaInicio ? new Date(d.fechaInicio).toISOString().split("T")[0] : "")
    setFechaFin(d.fechaFin ? new Date(d.fechaFin).toISOString().split("T")[0] : "")
    setMontoMinimoCompra(d.montoMinimoCompra ? String(d.montoMinimoCompra) : "")
    setCantidadMinima(String(d.cantidadMinima))
    setLimiteUso(d.limiteUso ? String(d.limiteUso) : "")
    setEsAcumulable(d.esAcumulable)
    setActivo(d.activo)

    // Load relations
    try {
      const res = await fetch(`/api/descuentos/${d.id}`)
      if (res.ok) {
        const fullDesc = await res.json()
        setSelectedProductos(fullDesc.productosIds || [])
        setSelectedCategorias(fullDesc.categoriasIds || [])
        setSelectedClientes(fullDesc.clientesIds || [])
      }
    } catch (err) {
      console.error("Error loading discount details:", err)
    }

    setShowForm(true)
  }

  const handleCancelForm = () => {
    resetForm()
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim()) {
      toast.error("El nombre del descuento es requerido")
      return
    }

    const valNum = parseFloat(valor)
    if (isNaN(valNum) || valNum <= 0) {
      toast.error("El valor del descuento debe ser mayor a 0")
      return
    }

    if (tipoValor === "PORCENTAJE" && valNum > 100) {
      toast.error("Un descuento porcentual no puede superar el 100%")
      return
    }

    // Prepare body
    const body: any = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      tipoAplicacion,
      tipoValor,
      valor: valNum,
      fechaInicio: fechaInicio || null,
      fechaFin: fechaFin || null,
      montoMinimoCompra: montoMinimoCompra ? parseFloat(montoMinimoCompra) : null,
      cantidadMinima: parseInt(cantidadMinima, 10) || 0,
      limiteUso: limiteUso ? parseInt(limiteUso, 10) : null,
      esAcumulable,
      activo,
      productosIds: tipoAplicacion === "PRODUCTO" ? selectedProductos : [],
      categoriasIds: tipoAplicacion === "CATEGORIA" ? selectedCategorias : [],
      clientesIds: tipoAplicacion === "CLIENTE" ? selectedClientes : [],
    }

    // Relations validation
    if (tipoAplicacion === "PRODUCTO" && selectedProductos.length === 0) {
      toast.error("Debes seleccionar al menos un producto para este descuento")
      return
    }
    if (tipoAplicacion === "CATEGORIA" && selectedCategorias.length === 0) {
      toast.error("Debes seleccionar al menos una categoría para este descuento")
      return
    }
    if (tipoAplicacion === "CLIENTE" && selectedClientes.length === 0) {
      toast.error("Debes seleccionar al menos un cliente para este descuento")
      return
    }

    setFormLoading(true)
    try {
      const url = editingId ? `/api/descuentos/${editingId}` : "/api/descuentos"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(editingId ? "Descuento actualizado correctamente" : "Descuento creado con éxito")
        resetForm()
        setShowForm(false)
        mutateDescuentos()
      } else {
        toast.error(data.error || "Error al guardar el descuento")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error de conexión al guardar")
    } finally {
      setFormLoading(false)
    }
  }

  const handleToggleActivo = async (d: Descuento) => {
    const accion = d.activo ? "desactivar" : "reactivar"
    const ok = window.confirm(`¿Seguro que deseas ${accion} el descuento "${d.nombre}"?`)
    if (!ok) return
    try {
      const res = await fetch(`/api/descuentos/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !d.activo })
      })
      if (res.ok) {
        toast.success(`Descuento ${d.activo ? "desactivado" : "reactivado"}`)
        mutateDescuentos()
      } else {
        const data = await res.json()
        toast.error(data.error || "No se pudo cambiar el estado")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error de conexión")
    }
  }

  const handleDelete = async (d: Descuento) => {
    const isUsed = d._count?.ventas && d._count.ventas > 0
    const msg = isUsed 
      ? `El descuento "${d.nombre}" tiene ventas asociadas. Se desactivará lógicamente en lugar de eliminarse permanentemente. ¿Deseas continuar?`
      : `¿Seguro que deseas ELIMINAR el descuento "${d.nombre}" permanentemente?`

    const ok = window.confirm(msg)
    if (!ok) return

    try {
      const res = await fetch(`/api/descuentos/${d.id}`, { method: "DELETE" })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || "Descuento eliminado/desactivado correctamente")
        mutateDescuentos()
      } else {
        toast.error(data.error || "No se pudo eliminar el descuento")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error de conexión")
    }
  }

  const toggleProductSelect = (id: number) => {
    setSelectedProductos(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleCategorySelect = (id: number) => {
    setSelectedCategorias(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleClientSelect = (id: number) => {
    setSelectedClientes(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const filteredDescuentos = descuentos.filter(d => 
    d.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (d.descripcion && d.descripcion.toLowerCase().includes(search.toLowerCase()))
  )

  const filteredProductsSelect = productos.filter(p => 
    p.nombre.toLowerCase().includes(prodSearch.toLowerCase())
  )

  const filteredClientsSelect = clientes.filter(c => 
    c.nombreCompleto.toLowerCase().includes(cliSearch.toLowerCase())
  )

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Tag className="w-8 h-8 text-primary animate-pulse" />
                Descuentos y Promociones
              </h1>
              <p className="text-muted-foreground mt-1">Administra las reglas de descuento de farmacia aplicadas en ventas</p>
            </div>
            <Button onClick={showForm ? handleCancelForm : handleOpenCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              {showForm ? "Cancelar" : "Nuevo Descuento"}
            </Button>
          </div>

          <Card className="glass-card p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="text" placeholder="Buscar descuento por nombre o descripción..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-muted/30 border-border" />
            </div>
          </Card>

          {showForm && (
            <Card className="glass-card p-6 mb-6">
              <h2 className="text-lg font-bold text-foreground mb-4">
                {editingId ? "Editar Regla de Descuento" : "Nueva Regla de Descuento"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Datos Básicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-border/50 pb-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-foreground/80 mb-1">Nombre de la Promoción *</label>
                    <Input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Descuento Día del Padre, Promoción Solka..." className="bg-background" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-foreground/80 mb-1">Descripción / Regla</label>
                    <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: 10% de descuento en analgésicos durante junio" className="bg-background" />
                  </div>
                </div>

                {/* Parámetros de Descuento */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-border/50 pb-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground/80 mb-1">Tipo de Aplicación</label>
                    <select value={tipoAplicacion} onChange={(e) => setTipoAplicacion(e.target.value as any)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                      <option value="VENTA_GENERAL">Venta General (Carrito)</option>
                      <option value="PRODUCTO">Productos Específicos</option>
                      <option value="CATEGORIA">Categorías de Productos</option>
                      <option value="CLIENTE">Clientes Específicos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground/80 mb-1">Tipo de Valor</label>
                    <select value={tipoValor} onChange={(e) => setTipoValor(e.target.value as any)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                      <option value="PORCENTAJE">Porcentaje (%)</option>
                      <option value="MONTO_FIJO">Monto Fijo (C$)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground/80 mb-1">Valor de Descuento *</label>
                    <Input required type="number" step="0.01" min="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder={tipoValor === "PORCENTAJE" ? "Ej: 10 para 10%" : "Ej: 50 para C$50"} className="bg-background" />
                  </div>
                </div>

                {/* Restricciones */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-border/50 pb-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground/80 mb-1">Monto Mínimo Compra (C$)</label>
                    <Input type="number" step="0.01" min="0" value={montoMinimoCompra} onChange={(e) => setMontoMinimoCompra(e.target.value)} placeholder="Ej: 200 (Opcional)" className="bg-background" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground/80 mb-1">Cantidad Mínima Artículos</label>
                    <Input type="number" min="0" value={cantidadMinima} onChange={(e) => setCantidadMinima(e.target.value)} placeholder="Ej: 3 (Opcional)" className="bg-background" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground/80 mb-1">Límite Total de Usos</label>
                    <Input type="number" min="1" value={limiteUso} onChange={(e) => setLimiteUso(e.target.value)} placeholder="Ej: 100 cupones (Opcional)" className="bg-background" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground/80 mb-1">Fecha de Inicio</label>
                    <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="bg-background" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground/80 mb-1">Fecha de Finalización</label>
                    <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="bg-background" />
                  </div>
                  <div className="flex flex-col justify-end pb-2.5 pl-2 gap-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-foreground/80 cursor-pointer">
                      <input type="checkbox" checked={esAcumulable} onChange={(e) => setEsAcumulable(e.target.checked)} className="rounded border-border text-primary focus:ring-primary w-4 h-4 bg-background" />
                      ¿Es acumulable con otros descuentos?
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-foreground/80 cursor-pointer">
                      <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="rounded border-border text-primary focus:ring-primary w-4 h-4 bg-background" />
                      Activo / Habilitado
                    </label>
                  </div>
                </div>

                {/* Selectores de Relaciones */}
                {tipoAplicacion === "PRODUCTO" && (
                  <div className="space-y-3 bg-muted/15 p-4 rounded-xl border border-border">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" />
                        Seleccionar Productos ({selectedProductos.length} seleccionados)
                      </h3>
                      <Input size={15} placeholder="Filtrar productos..." value={prodSearch} onChange={e => setProdSearch(e.target.value)} className="max-w-[200px] h-8 bg-background text-xs" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {filteredProductsSelect.map((p) => {
                        const isSel = selectedProductos.includes(p.id)
                        return (
                          <div key={p.id} onClick={() => toggleProductSelect(p.id)} className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${isSel ? "bg-primary/10 border-primary text-foreground font-medium" : "bg-background border-border text-muted-foreground hover:bg-muted/40"}`}>
                            <span className="text-xs truncate max-w-[200px]">{p.nombre}</span>
                            <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-foreground">{p.categoria?.nombre}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {tipoAplicacion === "CATEGORIA" && (
                  <div className="space-y-3 bg-muted/15 p-4 rounded-xl border border-border">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      Seleccionar Categorías ({selectedCategorias.length} seleccionadas)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {categorias.map((cat) => {
                        const isSel = selectedCategorias.includes(cat.id)
                        return (
                          <div key={cat.id} onClick={() => toggleCategorySelect(cat.id)} className={`p-2 rounded-lg border text-center cursor-pointer transition-all text-xs ${isSel ? "bg-primary/10 border-primary text-foreground font-medium" : "bg-background border-border text-muted-foreground hover:bg-muted/40"}`}>
                            {cat.nombre}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {tipoAplicacion === "CLIENTE" && (
                  <div className="space-y-3 bg-muted/15 p-4 rounded-xl border border-border">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        Seleccionar Clientes ({selectedClientes.length} seleccionados)
                      </h3>
                      <Input size={15} placeholder="Filtrar clientes..." value={cliSearch} onChange={e => setCliSearch(e.target.value)} className="max-w-[200px] h-8 bg-background text-xs" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {filteredClientsSelect.map((cli) => {
                        const isSel = selectedClientes.includes(cli.id)
                        return (
                          <div key={cli.id} onClick={() => toggleClientSelect(cli.id)} className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${isSel ? "bg-primary/10 border-primary text-foreground font-medium" : "bg-background border-border text-muted-foreground hover:bg-muted/40"}`}>
                            <span className="text-xs truncate">{cli.nombreCompleto}</span>
                            <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-foreground">{cli.cedula || "S/C"}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={handleCancelForm} disabled={formLoading}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={formLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                    {formLoading ? "Guardando..." : editingId ? "Actualizar Descuento" : "Crear Descuento"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Tabla de Descuentos */}
          <Card className="glass-card overflow-hidden">
            {loadingDescuentos ? (
              <div className="p-8 space-y-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      {["Descuento", "Aplicación", "Valor", "Condiciones", "Uso", "Estado", "Acciones"].map((h) => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredDescuentos.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-sm">
                          No se encontraron reglas de descuento registradas.
                        </td>
                      </tr>
                    ) : (
                      filteredDescuentos.map((d) => {
                        let appStr = "Venta General"
                        if (d.tipoAplicacion === "PRODUCTO") appStr = `${d.productos?.length || 0} Prod.`
                        if (d.tipoAplicacion === "CATEGORIA") appStr = `${d.categorias?.length || 0} Cat.`
                        if (d.tipoAplicacion === "CLIENTE") appStr = `${d.clientes?.length || 0} Cli.`

                        const valStr = d.tipoValor === "PORCENTAJE" ? `${Number(d.valor).toFixed(0)}%` : `C$${Number(d.valor).toFixed(2)}`
                        
                        let conds = []
                        if (d.montoMinimoCompra) conds.push(`Compra Min: C$${Number(d.montoMinimoCompra).toFixed(2)}`)
                        if (d.cantidadMinima > 0) conds.push(`Mín: ${d.cantidadMinima} art.`)
                        if (d.fechaInicio || d.fechaFin) {
                          const finStr = d.fechaFin ? new Date(d.fechaFin).toLocaleDateString("es-NI") : "Siempre"
                          conds.push(`Vence: ${finStr}`)
                        }

                        return (
                          <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-foreground">
                              <div>{d.nombre}</div>
                              {d.descripcion && <p className="text-xs text-muted-foreground mt-0.5 font-normal">{d.descripcion}</p>}
                            </td>
                            <td className="px-6 py-4 text-sm text-foreground">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                {appStr}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-foreground">{valStr}</td>
                            <td className="px-6 py-4 text-xs text-muted-foreground">
                              {conds.length > 0 ? (
                                <ul className="list-disc pl-4 space-y-0.5">
                                  {conds.map((c, idx) => <li key={idx}>{c}</li>)}
                                </ul>
                              ) : (
                                <span className="italic text-muted-foreground/60">Sin condiciones</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              {d.usosActuales} / {d.limiteUso || "∞"}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${d.activo ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"}`}>
                                {d.activo ? "Activo" : "Inactivo"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(d)} className="text-muted-foreground hover:text-foreground" title="Editar"><Edit2 className="w-4 h-4" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => handleToggleActivo(d)} className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10" title={d.activo ? "Desactivar" : "Reactivar"}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDelete(d)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10" title="Eliminar"><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
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
