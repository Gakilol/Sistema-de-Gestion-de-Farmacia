"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Eye, Trash2, X, ShoppingCart } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface Compra { id: number; fecha: string; proveedor: { nombre: string }; total: string; detalles: Array<{ producto: { nombre: string }; cantidad: number }> }
interface Proveedor { id: number; nombre: string }
interface Producto { id: number; nombre: string }
interface DetalleForm { idProducto: string; cantidad: string; precioUnitario: string }

export default function ComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [proveedorId, setProveedorId] = useState("")
  const [detalles, setDetalles] = useState<DetalleForm[]>([{ idProducto: "", cantidad: "1", precioUnitario: "" }])
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null)

  useEffect(() => { fetchCompras(); fetchProveedores(); fetchProductos() }, [])

  const fetchCompras = async () => { try { setCompras(await (await fetch("/api/compras")).json()) } catch (e) { console.error(e) } finally { setLoading(false) } }
  const fetchProveedores = async () => { try { setProveedores(await (await fetch("/api/proveedores")).json()) } catch (e) { console.error(e) } }
  const fetchProductos = async () => { try { setProductos(await (await fetch("/api/productos")).json()) } catch (e) { console.error(e) } }

  const resetForm = () => { setProveedorId(""); setDetalles([{ idProducto: "", cantidad: "1", precioUnitario: "" }]); setFormError(null) }
  const handleToggleForm = () => { if (showForm) resetForm(); setShowForm(!showForm) }
  const handleDetalleChange = (i: number, f: keyof DetalleForm, v: string) => setDetalles(p => p.map((d, idx) => idx === i ? { ...d, [f]: v } : d))
  const handleAddDetalle = () => setDetalles(p => [...p, { idProducto: "", cantidad: "1", precioUnitario: "" }])
  const handleRemoveDetalle = (i: number) => setDetalles(p => p.filter((_, idx) => idx !== i))
  const totalCalc = detalles.reduce((a, d) => a + Number.parseFloat(d.precioUnitario || "0") * Number.parseInt(d.cantidad || "0"), 0)

  const handleSubmitCompra = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(null)
    if (!proveedorId) { setFormError("Selecciona un proveedor"); return }
    const valid = detalles.filter(d => d.idProducto && d.cantidad && d.precioUnitario)
    if (!valid.length) { setFormError("Agrega al menos un producto"); return }
    try {
      setFormLoading(true)
      const res = await fetch("/api/compras", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idProveedor: Number(proveedorId), detalles: valid.map(d => ({ idProducto: Number(d.idProducto), cantidad: d.cantidad, precioUnitario: d.precioUnitario })) }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setFormError(data.error || "Error"); return }
      await fetchCompras(); resetForm(); setShowForm(false)
    } catch (e) { console.error(e); setFormError("Error de conexión") } finally { setFormLoading(false) }
  }

  const sc = "w-full p-2.5 rounded-lg bg-muted/30 border border-border text-foreground text-sm outline-none"

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"><ShoppingCart className="w-8 h-8 text-primary" />Compras</h1>
              <p className="text-muted-foreground mt-1">Historial de compras a proveedores</p>
            </div>
            <Button onClick={handleToggleForm} className="bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="w-4 h-4 mr-2" />{showForm ? "Cancelar" : "Nueva Compra"}</Button>
          </div>

          {showForm && (
            <Card className="glass-card mb-6 p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Registrar nueva compra</h2>
              <form className="space-y-4" onSubmit={handleSubmitCompra}>
                <div><label className="block text-sm font-medium text-foreground mb-1">Proveedor <span className="text-red-500">*</span></label>
                  <select className={sc} value={proveedorId} onChange={e => setProveedorId(e.target.value)} required><option value="">Selecciona</option>{proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-medium text-foreground">Productos</h3><Button type="button" variant="outline" size="sm" onClick={handleAddDetalle}><Plus className="w-4 h-4 mr-1" />Agregar</Button></div>
                  <div className="space-y-2">
                    {detalles.map((d, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg bg-muted/20 border border-border">
                        <div className="col-span-5"><select className={sc} value={d.idProducto} onChange={e => handleDetalleChange(i, "idProducto", e.target.value)} required><option value="">Producto</option>{productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
                        <div className="col-span-3"><Input type="number" min={1} value={d.cantidad} onChange={e => handleDetalleChange(i, "cantidad", e.target.value)} placeholder="Cant" className="bg-muted/30 border-border" /></div>
                        <div className="col-span-3"><Input type="number" step="0.01" min={0} value={d.precioUnitario} onChange={e => handleDetalleChange(i, "precioUnitario", e.target.value)} placeholder="Precio" className="bg-muted/30 border-border" /></div>
                        <div className="col-span-1 flex justify-end">{detalles.length > 1 && <Button type="button" size="icon" variant="ghost" onClick={() => handleRemoveDetalle(i)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {formError && <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">{formError}</div>}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <p className="text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">C${totalCalc.toFixed(2)}</span></p>
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={formLoading}>{formLoading ? "Guardando..." : "Registrar"}</Button>
                </div>
              </form>
            </Card>
          )}

          <Card className="glass-card overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>{["Fecha","Proveedor","Items","Total","Ver"].map(h => <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {compras.map(c => (
                      <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(c.fecha).toLocaleDateString("es-ES")}</td>
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{c.proveedor.nombre}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{c.detalles.length}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-foreground">C${Number.parseFloat(c.total).toFixed(2)}</td>
                        <td className="px-6 py-4"><Button size="sm" variant="ghost" onClick={() => setSelectedCompra(c)} className="text-muted-foreground hover:text-foreground"><Eye className="w-4 h-4" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {selectedCompra && (
            <Card className="glass-card mt-6 p-6">
              <div className="flex justify-between items-start mb-4">
                <div><h2 className="text-xl font-bold text-foreground">Compra #{selectedCompra.id}</h2><p className="text-muted-foreground text-sm">{selectedCompra.proveedor.nombre} — {new Date(selectedCompra.fecha).toLocaleDateString("es-ES")}</p></div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCompra(null)}><X className="w-5 h-5" /></Button>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border"><th className="text-left py-2 text-xs text-muted-foreground">Producto</th><th className="text-right py-2 text-xs text-muted-foreground">Cantidad</th></tr></thead>
                <tbody>{selectedCompra.detalles.map((d, i) => <tr key={i} className="border-b border-border/50"><td className="py-2 text-foreground">{d.producto.nombre}</td><td className="text-right text-foreground">{d.cantidad}</td></tr>)}</tbody>
              </table>
              <div className="mt-4 pt-4 border-t border-border text-right"><p className="text-lg font-bold">Total: <span className="text-primary">C${Number.parseFloat(selectedCompra.total).toFixed(2)}</span></p></div>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
