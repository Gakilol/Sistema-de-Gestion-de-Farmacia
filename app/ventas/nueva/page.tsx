"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, ShoppingCart } from "lucide-react"

interface Producto {
  id: number
  nombre: string
  precioVenta: string
  precioBlister?: string | null
  precioCaja?: string | null
  stockActual: number
  unidadesPorBlister?: number | null
  unidadesPorCaja?: number | null
}

interface Cliente { id: number; nombreCompleto: string }

interface LineaVenta {
  idProducto: number
  nombre: string
  cantidad: number
  precioUnitario: number
  subtotal: number
  tipoUnidad: string
}

export default function NuevaVentaPage() {
  const router = useRouter()
  const [productos, setProductos] = useState<Producto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [lineas, setLineas] = useState<LineaVenta[]>([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null)
  const [tipoUnidad, setTipoUnidad] = useState<string>("UNIDAD")
  const [cantidad, setCantidad] = useState("")
  const [selectedCliente, setSelectedCliente] = useState("")
  const [metodoPago, setMetodoPago] = useState("EFECTIVO")
  const [nombrePodologo, setNombrePodologo] = useState("")
  const [numeroReceta, setNumeroReceta] = useState("")

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [resP, resC] = await Promise.all([fetch("/api/productos"), fetch("/api/clientes")])
      setProductos(await resP.json()); setClientes(await resC.json())
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const getPrecioUnitario = () => {
    if (!selectedProducto) return 0
    if (tipoUnidad === "BLISTER" && selectedProducto.precioBlister) return Number.parseFloat(selectedProducto.precioBlister)
    if (tipoUnidad === "CAJA" && selectedProducto.precioCaja) return Number.parseFloat(selectedProducto.precioCaja)
    return Number.parseFloat(selectedProducto.precioVenta)
  }

  const agregarLinea = () => {
    if (!selectedProducto || !cantidad) return
    const cant = Number.parseInt(cantidad)
    if (cant <= 0) return
    let cantDeducir = cant
    if (tipoUnidad === "BLISTER") cantDeducir = cant * (selectedProducto.unidadesPorBlister || 1)
    else if (tipoUnidad === "CAJA") cantDeducir = cant * (selectedProducto.unidadesPorCaja || 1)

    const ocupadoEnCarrito = lineas.filter((l) => l.idProducto === selectedProducto.id).reduce((sum, l) => {
      let d = l.cantidad
      if (l.tipoUnidad === "BLISTER") d = l.cantidad * (selectedProducto.unidadesPorBlister || 1)
      if (l.tipoUnidad === "CAJA") d = l.cantidad * (selectedProducto.unidadesPorCaja || 1)
      return sum + d
    }, 0)

    if (cantDeducir + ocupadoEnCarrito > selectedProducto.stockActual) { alert("Stock insuficiente"); return }

    const precioUnitario = getPrecioUnitario()
    setLineas([...lineas, { idProducto: selectedProducto.id, nombre: selectedProducto.nombre, cantidad: cant, precioUnitario, subtotal: precioUnitario * cant, tipoUnidad }])
    setSelectedProducto(null); setCantidad(""); setTipoUnidad("UNIDAD")
  }

  const total = lineas.reduce((sum, l) => sum + l.subtotal, 0)

  const handleRegistrarVenta = async () => {
    if (lineas.length === 0) { alert("Agregue al menos un producto"); return }
    setProcesando(true)
    try {
      const res = await fetch("/api/ventas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idCliente: selectedCliente ? Number.parseInt(selectedCliente) : null,
          detalles: lineas.map((l) => ({ idProducto: l.idProducto, cantidad: l.cantidad, precioUnitario: l.precioUnitario, tipoUnidad: l.tipoUnidad })),
          metodoPago, nombrePodologo: nombrePodologo || null, numeroReceta: numeroReceta || null,
        }),
      })
      if (res.ok) { alert("Venta registrada exitosamente"); router.push("/ventas/historial") }
      else { const data = await res.json(); alert(data.error || "Error al registrar venta") }
    } catch (e) { console.error(e); alert("Error al registrar venta") } finally { setProcesando(false) }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="text-muted-foreground">Cargando...</div>
        </main>
      </div>
    )
  }

  const selectClass = "w-full p-2.5 rounded-lg bg-muted/30 border border-border text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-colors"

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-primary" />
            Nueva Venta
          </h1>
          <p className="text-muted-foreground mb-8">Registra una nueva venta de productos</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel izquierdo */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-card p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Agregar Productos</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Producto</label>
                    <select value={selectedProducto?.id || ""} onChange={(e) => { const prod = productos.find((p) => p.id === Number.parseInt(e.target.value)); setSelectedProducto(prod || null); setTipoUnidad("UNIDAD") }} className={selectClass}>
                      <option value="">Selecciona un producto</option>
                      {productos.map((p) => {
                        let stockDisplay = `${p.stockActual} uds`
                        if (p.unidadesPorCaja) stockDisplay += ` / ${Math.floor(p.stockActual / p.unidadesPorCaja)} cajas`
                        return <option key={p.id} value={p.id}>{p.nombre} - Stock: {stockDisplay}</option>
                      })}
                    </select>
                  </div>

                  {selectedProducto && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Tipo de Venta</label>
                      <select value={tipoUnidad} onChange={(e) => setTipoUnidad(e.target.value)} className={selectClass}>
                        <option value="UNIDAD">Unidad</option>
                        {selectedProducto.precioBlister && <option value="BLISTER">Blister</option>}
                        {selectedProducto.precioCaja && <option value="CAJA">Caja</option>}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Cantidad</label>
                      <Input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} placeholder="0" className="bg-muted/30 border-border" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Precio Unitario</label>
                      <Input type="text" disabled value={selectedProducto ? `C$${getPrecioUnitario().toFixed(2)}` : "—"} className="bg-muted/30 border-border" />
                    </div>
                  </div>

                  <Button onClick={agregarLinea} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="w-4 h-4 mr-2" />Agregar al carrito
                  </Button>
                </div>
              </Card>

              {/* Carrito */}
              <Card className="glass-card p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Carrito</h2>
                {lineas.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Sin productos agregados</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border">
                        <tr>
                          {["Producto", "Cantidad", "Precio", "Subtotal", ""].map((h) => (
                            <th key={h} className={`py-3 text-xs font-semibold text-muted-foreground uppercase ${h === "Producto" ? "text-left" : "text-right"}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {lineas.map((linea, idx) => (
                          <tr key={idx} className="border-b border-border/50">
                            <td className="py-3 text-foreground">{linea.nombre}<span className="text-xs text-muted-foreground ml-2">({linea.tipoUnidad})</span></td>
                            <td className="text-right text-foreground">{linea.cantidad}</td>
                            <td className="text-right text-muted-foreground">C${linea.precioUnitario.toFixed(2)}</td>
                            <td className="text-right font-medium text-foreground">C${linea.subtotal.toFixed(2)}</td>
                            <td className="text-center"><Button size="sm" variant="ghost" onClick={() => setLineas(lineas.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></Button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 pt-4 border-t border-border text-right">
                      <p className="text-xl font-bold text-foreground">Total: <span className="text-primary">C${total.toFixed(2)}</span></p>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Panel derecho */}
            <div className="lg:col-span-1">
              <Card className="glass-card p-6 sticky top-8">
                <h2 className="text-lg font-semibold text-foreground mb-4">Información de Venta</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Cliente (Opcional)</label>
                    <select value={selectedCliente} onChange={(e) => setSelectedCliente(e.target.value)} className={selectClass}>
                      <option value="">Sin cliente</option>
                      {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombreCompleto}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Método de Pago</label>
                    <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className={selectClass}>
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TARJETA">Tarjeta</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Podólogo (Opcional)</label>
                    <Input value={nombrePodologo} onChange={(e) => setNombrePodologo(e.target.value)} placeholder="Nombre del podólogo" className="bg-muted/30 border-border text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1"># Receta (Opcional)</label>
                    <Input value={numeroReceta} onChange={(e) => setNumeroReceta(e.target.value)} placeholder="Número de receta" className="bg-muted/30 border-border text-sm" />
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">Productos</span>
                      <span className="text-2xl font-bold text-foreground">{lineas.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="text-2xl font-bold text-primary">C${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button onClick={handleRegistrarVenta} disabled={procesando || lineas.length === 0} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium shadow-lg shadow-emerald-500/20">
                    {procesando ? "Procesando..." : "Registrar Venta"}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
