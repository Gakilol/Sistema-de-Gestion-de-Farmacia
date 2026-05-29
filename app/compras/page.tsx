"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Eye, Trash2, X, ShoppingCart, ChevronRight, ChevronLeft, Check, FileText, Calendar, Package, Layers } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface Compra { id: number; fecha: string; fechaCompra?: string; numeroFactura?: string; proveedor: { nombre: string }; total: string; detalles: Array<{ producto: { nombre: string }; cantidad: number; lote?: string; fechaVencimiento?: string; precioUnitario: string; subtotal: string }> }
interface Proveedor { id: number; nombre: string }
interface Producto { id: number; nombre: string; precioCompra?: string }
interface DetalleForm { idProducto: string; cantidad: string; precioUnitario: string; lote: string; fechaVencimiento: string }

export default function ComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [productos, setProductos] = useState<Producto[]>([])

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1)
  const [proveedorId, setProveedorId] = useState("")
  const [numeroFactura, setNumeroFactura] = useState("")
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().split("T")[0])
  const [detalles, setDetalles] = useState<DetalleForm[]>([{ idProducto: "", cantidad: "1", precioUnitario: "", lote: "", fechaVencimiento: "" }])
  const [formLoading, setFormLoading] = useState(false)
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null)

  useEffect(() => { fetchCompras(); fetchProveedores(); fetchProductos() }, [])

  const fetchCompras = async () => { try { setCompras(await (await fetch("/api/compras")).json()) } catch (e) { console.error(e) } finally { setLoading(false) } }
  const fetchProveedores = async () => { try { setProveedores(await (await fetch("/api/proveedores")).json()) } catch (e) { console.error(e) } }
  const fetchProductos = async () => { try { setProductos(await (await fetch("/api/productos")).json()) } catch (e) { console.error(e) } }

  const resetForm = () => {
    setProveedorId(""); setNumeroFactura(""); setFechaCompra(new Date().toISOString().split("T")[0])
    setDetalles([{ idProducto: "", cantidad: "1", precioUnitario: "", lote: "", fechaVencimiento: "" }])
    setWizardStep(1)
  }
  const handleToggleForm = () => { if (showForm) resetForm(); setShowForm(!showForm) }

  const handleDetalleChange = (i: number, f: keyof DetalleForm, v: string) => {
    setDetalles(p => p.map((d, idx) => idx === i ? { ...d, [f]: v } : d))
  }
  const handleAddDetalle = () => setDetalles(p => [...p, { idProducto: "", cantidad: "1", precioUnitario: "", lote: "", fechaVencimiento: "" }])
  const handleRemoveDetalle = (i: number) => setDetalles(p => p.filter((_, idx) => idx !== i))

  const totalCalc = detalles.reduce((a, d) => a + Number.parseFloat(d.precioUnitario || "0") * Number.parseInt(d.cantidad || "0"), 0)

  const canNextStep1 = proveedorId !== ""
  const canNextStep2 = detalles.some(d => d.idProducto && d.cantidad && d.precioUnitario)

  const handleSubmitCompra = async () => {
    setFormLoading(true)
    const valid = detalles.filter(d => d.idProducto && d.cantidad && d.precioUnitario)
    if (!valid.length) { toast.error("Agrega al menos un producto con cantidad y precio"); setFormLoading(false); return }

    try {
      const res = await fetch("/api/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idProveedor: Number(proveedorId),
          numeroFactura: numeroFactura || null,
          fechaCompra: fechaCompra || null,
          detalles: valid.map(d => ({
            idProducto: Number(d.idProducto),
            cantidad: Number(d.cantidad),
            precioUnitario: Number(d.precioUnitario),
            lote: d.lote || null,
            fechaVencimiento: d.fechaVencimiento || null,
          }))
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error || "Error"); setFormLoading(false); return }
      toast.success("Compra registrada exitosamente. Stock y lotes actualizados.")
      await fetchCompras(); resetForm(); setShowForm(false)
    } catch (e) { console.error(e); toast.error("Error de conexión") } finally { setFormLoading(false) }
  }

  const sc = "w-full p-2.5 rounded-lg bg-muted/30 border border-border text-foreground text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"

  const steps = [
    { n: 1, label: "Factura", icon: FileText },
    { n: 2, label: "Productos", icon: Package },
    { n: 3, label: "Revisar", icon: Check },
  ]

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"><ShoppingCart className="w-8 h-8 text-primary" />Compras</h1>
              <p className="text-muted-foreground mt-1">Registra compras a proveedores con lotes y vencimientos</p>
            </div>
            <Button onClick={handleToggleForm} className="bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="w-4 h-4 mr-2" />{showForm ? "Cancelar" : "Nueva Compra"}</Button>
          </div>

          {/* ═══ WIZARD FORM ═══ */}
          {showForm && (
            <Card className="glass-card mb-6 p-6">
              {/* Step Indicator */}
              <div className="flex items-center justify-center gap-2 mb-8">
                {steps.map((step, i) => (
                  <div key={step.n} className="flex items-center">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      wizardStep === step.n
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : wizardStep > step.n
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : "bg-muted/30 text-muted-foreground border border-border"
                    }`}>
                      {wizardStep > step.n ? <Check className="w-3.5 h-3.5" /> : <step.icon className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{step.label}</span>
                    </div>
                    {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />}
                  </div>
                ))}
              </div>

              {/* Step 1: Invoice Header */}
              {wizardStep === 1 && (
                <div className="space-y-5 max-w-lg mx-auto">
                  <div className="text-center mb-2">
                    <h2 className="text-lg font-bold text-foreground">Datos de Factura</h2>
                    <p className="text-sm text-muted-foreground">Selecciona el proveedor e ingresa los datos de la factura</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Proveedor <span className="text-red-500">*</span></label>
                    <select className={sc} value={proveedorId} onChange={e => setProveedorId(e.target.value)}>
                      <option value="">Selecciona un proveedor</option>
                      {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Nº Factura</label>
                      <Input value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)} placeholder="Ej: FAC-001234" className="bg-muted/30 border-border" />
                      <p className="text-xs text-muted-foreground mt-1">Número de la factura del proveedor</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Fecha de Compra</label>
                      <Input type="date" value={fechaCompra} onChange={e => setFechaCompra(e.target.value)} className="bg-muted/30 border-border" />
                      <p className="text-xs text-muted-foreground mt-1">Fecha de la factura</p>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setWizardStep(2)} disabled={!canNextStep1} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      Siguiente <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Products with Batch Details */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Agregar Productos</h2>
                      <p className="text-sm text-muted-foreground">Producto, cantidad, costo unitario, lote y vencimiento</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddDetalle} className="border-primary text-primary hover:bg-primary/10">
                      <Plus className="w-4 h-4 mr-1" />Agregar Línea
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {detalles.map((d, i) => (
                      <div key={i} className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-muted-foreground uppercase">Ítem {i + 1}</span>
                          {detalles.length > 1 && (
                            <Button type="button" size="icon" variant="ghost" onClick={() => handleRemoveDetalle(i)} className="text-red-400 hover:text-red-300 h-7 w-7">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-3">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Producto <span className="text-red-500">*</span></label>
                            <select className={sc} value={d.idProducto} onChange={e => handleDetalleChange(i, "idProducto", e.target.value)}>
                              <option value="">Selecciona un producto</option>
                              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Cantidad <span className="text-red-500">*</span></label>
                            <Input type="number" min={1} value={d.cantidad} onChange={e => handleDetalleChange(i, "cantidad", e.target.value)} placeholder="Uds" className="bg-muted/30 border-border" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Costo Unitario <span className="text-red-500">*</span></label>
                            <Input type="number" step="0.01" min={0} value={d.precioUnitario} onChange={e => handleDetalleChange(i, "precioUnitario", e.target.value)} placeholder="C$" className="bg-muted/30 border-border" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Subtotal</label>
                            <div className="p-2.5 rounded-lg bg-muted/20 border border-border text-sm font-semibold text-foreground">
                              C${(Number(d.precioUnitario || 0) * Number(d.cantidad || 0)).toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                              <Layers className="w-3 h-3" /> Código de Lote
                            </label>
                            <Input value={d.lote} onChange={e => handleDetalleChange(i, "lote", e.target.value)} placeholder="Ej: LOT-2026-A1" className="bg-muted/30 border-border" />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Fecha de Vencimiento
                            </label>
                            <Input type="date" value={d.fechaVencimiento} onChange={e => handleDetalleChange(i, "fechaVencimiento", e.target.value)} className="bg-muted/30 border-border" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <Button variant="outline" onClick={() => setWizardStep(1)}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
                    </Button>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">Total estimado</p>
                      <p className="text-lg font-bold text-foreground">C${totalCalc.toFixed(2)}</p>
                    </div>
                    <Button onClick={() => setWizardStep(3)} disabled={!canNextStep2} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      Revisar <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Review & Confirm */}
              {wizardStep === 3 && (
                <div className="space-y-5 max-w-2xl mx-auto">
                  <div className="text-center mb-2">
                    <h2 className="text-lg font-bold text-foreground">Confirmar Compra</h2>
                    <p className="text-sm text-muted-foreground">Revisa los datos antes de registrar</p>
                  </div>

                  {/* Invoice Summary */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Proveedor</p>
                      <p className="font-semibold text-foreground">{proveedores.find(p => String(p.id) === proveedorId)?.nombre || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Factura</p>
                      <p className="font-semibold text-foreground">{numeroFactura || "Sin número"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Fecha</p>
                      <p className="font-semibold text-foreground">{fechaCompra || "Hoy"}</p>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr>
                          {["Producto", "Cant.", "Costo", "Lote", "Vence", "Subtotal"].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {detalles.filter(d => d.idProducto && d.cantidad && d.precioUnitario).map((d, i) => (
                          <tr key={i} className="hover:bg-muted/10">
                            <td className="px-4 py-2.5 font-medium text-foreground">{productos.find(p => String(p.id) === d.idProducto)?.nombre}</td>
                            <td className="px-4 py-2.5 text-foreground">{d.cantidad}</td>
                            <td className="px-4 py-2.5 text-foreground">C${Number(d.precioUnitario).toFixed(2)}</td>
                            <td className="px-4 py-2.5">
                              {d.lote ? <span className="px-2 py-0.5 rounded bg-muted/40 text-xs font-mono">{d.lote}</span> : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">{d.fechaVencimiento || "—"}</td>
                            <td className="px-4 py-2.5 font-semibold text-foreground">C${(Number(d.precioUnitario) * Number(d.cantidad)).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <Button variant="outline" onClick={() => setWizardStep(2)}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
                    </Button>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total a Registrar</p>
                      <p className="text-2xl font-bold text-primary">C${totalCalc.toFixed(2)}</p>
                    </div>
                    <Button onClick={handleSubmitCompra} disabled={formLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6">
                      {formLoading ? "Registrando..." : <><Check className="w-4 h-4 mr-1.5" />Confirmar Compra</>}
                    </Button>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Al confirmar se actualizará el stock, se crearán los lotes y se recalculará el costo promedio automáticamente.</p>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Purchase History Table */}
          <Card className="glass-card overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>{["Fecha", "Proveedor", "Factura", "Items", "Total", "Ver"].map(h => <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {compras.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">No hay compras registradas</td></tr>
                    ) : compras.map(c => (
                      <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(c.fechaCompra || c.fecha).toLocaleDateString("es-NI")}</td>
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{c.proveedor.nombre}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{c.numeroFactura || "—"}</td>
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

          {/* Purchase Detail Modal */}
          {selectedCompra && (
            <Card className="glass-card mt-6 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Compra #{selectedCompra.id}</h2>
                  <p className="text-muted-foreground text-sm">
                    {selectedCompra.proveedor.nombre} — {new Date(selectedCompra.fechaCompra || selectedCompra.fecha).toLocaleDateString("es-NI")}
                    {selectedCompra.numeroFactura && <span className="ml-2 text-primary font-medium">(Fact: {selectedCompra.numeroFactura})</span>}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCompra(null)}><X className="w-5 h-5" /></Button>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  {["Producto", "Cant.", "Costo Uní.", "Lote", "Vence", "Subtotal"].map(h => (
                    <th key={h} className="text-left py-2 text-xs text-muted-foreground">{h}</th>
                  ))}
                </tr></thead>
                <tbody>{selectedCompra.detalles.map((d, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 text-foreground font-medium">{d.producto.nombre}</td>
                    <td className="py-2 text-foreground">{d.cantidad}</td>
                    <td className="py-2 text-foreground">C${Number(d.precioUnitario).toFixed(2)}</td>
                    <td className="py-2">{d.lote ? <span className="px-2 py-0.5 rounded bg-muted/40 text-xs font-mono">{d.lote}</span> : "—"}</td>
                    <td className="py-2 text-muted-foreground">{d.fechaVencimiento ? new Date(d.fechaVencimiento).toLocaleDateString("es-NI") : "—"}</td>
                    <td className="py-2 font-semibold text-foreground">C${Number(d.subtotal).toFixed(2)}</td>
                  </tr>
                ))}</tbody>
              </table>
              <div className="mt-4 pt-4 border-t border-border text-right"><p className="text-lg font-bold">Total: <span className="text-primary">C${Number.parseFloat(selectedCompra.total).toFixed(2)}</span></p></div>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
