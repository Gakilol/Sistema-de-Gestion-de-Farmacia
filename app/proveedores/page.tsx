"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit2, Trash2, Truck, Search, Tag, X, Info, Layers, Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface Proveedor {
  id: number
  nombre: string
  telefono: string | null
  correo: string | null
  direccion: string | null
}

interface CatalogoProducto {
  id: number
  idProducto: number
  precioCompra: number | null
  producto: {
    id: number
    nombre: string
    categoria: { nombre: string }
  }
}

interface ProductoSimplificado {
  id: number
  nombre: string
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  
  // Edición de proveedor
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ nombre: "", telefono: "", correo: "", direccion: "" })

  // Catálogo Proveedor-Producto
  const [showCatalogModal, setShowCatalogModal] = useState(false)
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null)
  const [catalogo, setCatalogo] = useState<CatalogoProducto[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  
  // Productos para asociar
  const [availableProducts, setAvailableProducts] = useState<ProductoSimplificado[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [customPrecioCompra, setCustomPrecioCompra] = useState<string>("")
  const [linkingProduct, setLinkingProduct] = useState(false)

  useEffect(() => {
    fetchProveedores()
    fetchAvailableProducts()
    setIsAdmin(true) // En local para pruebas admin es true
  }, [])

  const fetchProveedores = async () => {
    try {
      const res = await fetch("/api/proveedores")
      if (res.ok) {
        setProveedores(await res.json())
      }
    } catch (e) {
      console.error(e)
      toast.error("Error al cargar proveedores")
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableProducts = async () => {
    try {
      const res = await fetch("/api/productos?estado=activos")
      if (res.ok) {
        const data = await res.json()
        setAvailableProducts(data.map((p: any) => ({ id: p.id, nombre: p.nombre })))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchCatalog = async (proveedorId: number) => {
    setCatalogLoading(true)
    try {
      const res = await fetch(`/api/proveedores/${proveedorId}/productos`)
      if (res.ok) {
        setCatalogo(await res.json())
      }
    } catch (e) {
      console.error(e)
      toast.error("Error al obtener catálogo")
    } finally {
      setCatalogLoading(false)
    }
  }

  const handleOpenCatalog = (proveedor: Proveedor) => {
    setSelectedProveedor(proveedor)
    fetchCatalog(proveedor.id)
    setShowCatalogModal(true)
    setSelectedProductId("")
    setCustomPrecioCompra("")
  }

  const handleCloseCatalog = () => {
    setShowCatalogModal(false)
    setSelectedProveedor(null)
    setCatalogo([])
  }

  const handleLinkProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProveedor || !selectedProductId) return

    setLinkingProduct(true)
    try {
      const res = await fetch(`/api/proveedores/${selectedProveedor.id}/productos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idProducto: Number(selectedProductId),
          precioCompra: customPrecioCompra ? parseFloat(customPrecioCompra) : null
        })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("Producto asociado exitosamente al catálogo")
        setSelectedProductId("")
        setCustomPrecioCompra("")
        fetchCatalog(selectedProveedor.id)
      } else {
        toast.error(data.error || "No se pudo asociar el producto")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error de conexión")
    } finally {
      setLinkingProduct(false)
    }
  }

  const handleUnlinkProduct = async (idProducto: number) => {
    if (!selectedProveedor) return
    const ok = window.confirm("¿Seguro que deseas remover este producto del catálogo del proveedor?")
    if (!ok) return

    try {
      const res = await fetch(`/api/proveedores/${selectedProveedor.id}/productos?idProducto=${idProducto}`, {
        method: "DELETE"
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("Producto removido del catálogo")
        fetchCatalog(selectedProveedor.id)
      } else {
        toast.error(data.error || "No se pudo remover el producto")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error de conexión")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingId ? `/api/proveedores/${editingId}` : "/api/proveedores"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast.success(editingId ? "Proveedor actualizado" : "Proveedor creado con éxito")
        setFormData({ nombre: "", telefono: "", correo: "", direccion: "" })
        setEditingId(null)
        setShowForm(false)
        fetchProveedores()
      } else {
        const data = await res.json()
        toast.error(data.error || "Error al guardar el proveedor")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error de conexión")
    }
  }

  const handleEditClick = (p: Proveedor) => {
    setEditingId(p.id)
    setFormData({
      nombre: p.nombre,
      telefono: p.telefono || "",
      correo: p.correo || "",
      direccion: p.direccion || ""
    })
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setFormData({ nombre: "", telefono: "", correo: "", direccion: "" })
    setEditingId(null)
    setShowForm(false)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm("¿Eliminar este proveedor?\nSe perderán todas las asociaciones en el catálogo.")) {
      try {
        const res = await fetch(`/api/proveedores/${id}`, { method: "DELETE" })
        if (res.ok) {
          toast.success("Proveedor eliminado")
          fetchProveedores()
        } else {
          const data = await res.json()
          toast.error(data.error || "No se pudo eliminar el proveedor")
        }
      } catch (e) {
        console.error(e)
        toast.error("Error de conexión")
      }
    }
  }

  const filteredProveedores = proveedores.filter((p) => p.nombre.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Truck className="w-8 h-8 text-primary" />
                Proveedores
              </h1>
              <p className="text-muted-foreground mt-1">Gestiona la lista y catálogo de proveedores</p>
            </div>
            {isAdmin && (
              <Button onClick={showForm ? handleCancelForm : () => setShowForm(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                {showForm ? "Cancelar" : "Nuevo Proveedor"}
              </Button>
            )}
          </div>

          <Card className="glass-card p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="text" placeholder="Buscar proveedor por nombre..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-muted/30 border-border" />
            </div>
          </Card>

          {showForm && isAdmin && (
            <Card className="glass-card p-6 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                {editingId ? "Editar Proveedor" : "Nuevo Proveedor"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Nombre <span className="text-red-500">*</span></label>
                    <Input required value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="bg-muted/30 border-border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Teléfono</label>
                    <Input value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} className="bg-muted/30 border-border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Correo</label>
                    <Input type="email" value={formData.correo} onChange={(e) => setFormData({ ...formData, correo: e.target.value })} className="bg-muted/30 border-border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Dirección</label>
                    <Input value={formData.direccion} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} className="bg-muted/30 border-border" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {editingId ? "Actualizar" : "Guardar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancelForm}>Cancelar</Button>
                </div>
              </form>
            </Card>
          )}

          <Card className="glass-card overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      {["Nombre", "Teléfono", "Correo", "Dirección", "Catálogo", ...(isAdmin ? ["Acciones"] : [])].map((h) => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProveedores.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">No se encontraron proveedores</td>
                      </tr>
                    )}
                    {filteredProveedores.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{p.nombre}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{p.telefono || "—"}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{p.correo || "—"}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{p.direccion || "—"}</td>
                        <td className="px-6 py-4 text-sm">
                          <Button 
                            onClick={() => handleOpenCatalog(p)} 
                            size="sm" 
                            variant="outline" 
                            className="border-primary text-primary hover:bg-primary/10 flex items-center gap-1.5"
                          >
                            <Tag className="w-3.5 h-3.5" />
                            Ver Catálogo
                          </Button>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-sm">
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleEditClick(p)} className="text-muted-foreground hover:text-foreground"><Edit2 className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></Button>
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

      {/* MODAL DE CATÁLOGO PROVEEDOR-PRODUCTO */}
      {showCatalogModal && selectedProveedor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="glass-card w-full max-w-2xl p-6 relative max-h-[85vh] flex flex-col shadow-2xl rounded-2xl animate-in fade-in zoom-in duration-200">
            <button 
              onClick={handleCloseCatalog}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 hover:bg-muted/40 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <Truck className="w-6 h-6" />
                Catálogo de {selectedProveedor.nombre}
              </h2>
              <p className="text-xs text-muted-foreground">Vincula productos a este proveedor para agilizar compras.</p>
            </div>

            {/* Formulario para agregar producto al catálogo */}
            {isAdmin && (
              <form onSubmit={handleLinkProduct} className="p-4 bg-muted/40 rounded-lg border border-border mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  Asociar Nuevo Producto
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Producto <span className="text-red-500">*</span></label>
                    <select
                      className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      required
                    >
                      <option value="">Selecciona un producto</option>
                      {availableProducts
                        .filter(p => !catalogo.some(c => c.idProducto === p.id))
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))
                      }
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Precio Compra sugerido (C$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Opcional"
                      value={customPrecioCompra}
                      onChange={(e) => setCustomPrecioCompra(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-3 flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={linkingProduct || !selectedProductId} 
                      className="bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-1.5"
                    >
                      {linkingProduct ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Vincular al Catálogo
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {/* Listado de productos vinculados */}
            <div className="flex-1 overflow-y-auto pr-1">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-gray-500" />
                Productos Suministrados
              </h3>
              {catalogLoading ? (
                <div className="space-y-2 py-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : catalogo.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center gap-2">
                  <Info className="w-8 h-8 text-muted-foreground" />
                  <p>Este proveedor aún no tiene productos asociados en su catálogo.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {catalogo.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex justify-between items-center p-3 rounded-lg bg-background border border-border hover:bg-muted/10 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-sm text-foreground">{item.producto.nombre}</p>
                        <p className="text-xs text-muted-foreground">{item.producto.categoria.nombre}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Costo Sugerido</p>
                          <p className="text-sm font-medium text-foreground">
                            {item.precioCompra ? `C$${Number(item.precioCompra).toFixed(2)}` : "—"}
                          </p>
                        </div>
                        {isAdmin && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleUnlinkProduct(item.idProducto)} 
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                            title="Desasociar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-border flex justify-end">
              <Button variant="outline" onClick={handleCloseCatalog}>Cerrar Catálogo</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
