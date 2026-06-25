"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScannerModal } from "@/components/scanner-modal"
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner"
import { esPosibleCedula } from "@/lib/cedulaValidator"
import {
  Plus, Trash2, ShoppingCart, Search, X,
  Scan, AlertTriangle, UserPlus, ScanLine
} from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Lote {
  id: number
  codigoLote: string
  fechaVencimiento?: string | null
  stockActual: number
  costoCompra: string
}

interface Producto {
  id: number
  nombre: string
  codigoBarras?: string | null
  precioVenta: string
  precioBlister?: string | null
  precioCaja?: string | null
  stockActual: number
  unidadesPorBlister?: number | null
  unidadesPorCaja?: number | null
  lotes?: Lote[]
}

interface Cliente {
  id: number
  nombreCompleto: string
  cedula?: string | null
  ruc?: string | null
  telefono?: string | null
  correo?: string | null
  direccion?: string | null
  activo?: boolean
}

interface LineaVenta {
  idProducto: number
  nombre: string
  cantidad: number
  precioUnitario: number
  subtotal: number
  tipoUnidad: string
  alertaVencimiento?: string | null
}

// Modal ligero para crear un cliente rápido desde ventas
function QuickClientModal({
  isOpen,
  cedulaPre,
  onClose,
  onCreated,
}: {
  isOpen: boolean
  cedulaPre: string
  onClose: () => void
  onCreated: (cliente: Cliente) => void
}) {
  const [nombre, setNombre] = useState("")
  const [cedula, setCedula] = useState(cedulaPre)
  const [ruc, setRuc] = useState("")
  const [telefono, setTelefono] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => { setCedula(cedulaPre) }, [cedulaPre])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) { toast.error("El nombre es requerido"); return }
    setLoading(true)
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreCompleto: nombre.trim(),
          cedula: cedula || null,
          ruc: ruc || null,
          telefono: telefono || null
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Error al crear cliente")
        return
      }
      const nuevo = await res.json()
      toast.success("Cliente creado exitosamente")
      onCreated({
        id: nuevo.id,
        nombreCompleto: nuevo.nombreCompleto,
        cedula: nuevo.cedula,
        ruc: nuevo.ruc
      })
      onClose()
    } catch {
      toast.error("Error al crear cliente")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Registrar Cliente</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Nombre Completo *</label>
            <Input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Juan Pérez López" className="bg-muted/30 border-border text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Cédula</label>
            <Input value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="001-280599-1004A" className="bg-muted/30 border-border text-sm font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">RUC (Opcional)</label>
            <Input value={ruc} onChange={(e) => setRuc(e.target.value)} placeholder="001-280599-1004A" className="bg-muted/30 border-border text-sm font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Teléfono</label>
            <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="8888-8888" className="bg-muted/30 border-border text-sm" />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            {loading ? "Guardando..." : "Crear y Seleccionar"}
          </Button>
        </form>
      </div>
    </div>
  )
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
  const [tipoComprobante, setTipoComprobante] = useState("RECIBO")
  const [rucCliente, setRucCliente] = useState("")
  const [montoRecibido, setMontoRecibido] = useState("")
  const [selectedDescuento, setSelectedDescuento] = useState("")

  const { data: descuentos = [] } = useSWR<any[]>("/api/descuentos?estado=ACTIVO", fetcher)

  // Scanner states
  const [scannerOpen, setScannerOpen] = useState(false)
  const [buscandoScanner, setBuscandoScanner] = useState(false)
  const [quickClientOpen, setQuickClientOpen] = useState(false)
  const [cedulaParaCliente, setCedulaParaCliente] = useState("")

  // Expired lot alert state
  const [alertaLoteVencido, setAlertaLoteVencido] = useState<{ nombre: string; lote: string; vencimiento: string } | null>(null)

  // Smart search states
  const [productoSearch, setProductoSearch] = useState("")
  const [showProductoDropdown, setShowProductoDropdown] = useState(false)
  const [clienteSearch, setClienteSearch] = useState("")
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const productoDropdownRef = useRef<HTMLDivElement>(null)
  const clienteDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchData() }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productoDropdownRef.current && !productoDropdownRef.current.contains(e.target as Node)) {
        setShowProductoDropdown(false)
      }
      if (clienteDropdownRef.current && !clienteDropdownRef.current.contains(e.target as Node)) {
        setShowClienteDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredProductos = productos.filter(p =>
    p.nombre.toLowerCase().includes(productoSearch.toLowerCase()) ||
    (p.codigoBarras && p.codigoBarras.toLowerCase().includes(productoSearch.toLowerCase()))
  )

  const filteredClientes = clientes.filter(c =>
    c.nombreCompleto.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    (c.cedula && c.cedula.replace(/-/g, "").includes(clienteSearch.replace(/-/g, "")))
  )

  const fetchData = async () => {
    try {
      const [resP, resC] = await Promise.all([fetch("/api/productos"), fetch("/api/clientes")])
      setProductos(await resP.json()); setClientes(await resC.json())
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  // ─── Scanner handler ─────────────────────────────────────────────────────────
  const handleScanCode = useCallback(async (code: string) => {
    if (buscandoScanner) return
    setBuscandoScanner(true)

    try {
      // Intentar detectar si es una cédula nicaragüense primero
      if (esPosibleCedula(code)) {
        toast.info("Cédula detectada. Buscando cliente...")
        const res = await fetch(`/api/clientes/by-cedula?cedula=${encodeURIComponent(code)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.encontrado && data.cliente) {
            const cli = data.cliente as Cliente
            setSelectedCliente(String(cli.id))
            setClienteSearch("")
            if (cli.ruc) {
              setRucCliente(cli.ruc)
            } else {
              setRucCliente("")
            }
            toast.success(`✓ Cliente asignado: ${cli.nombreCompleto}`)
          } else {
            // No encontrado, abrir modal de registro rápido con cédula
            setCedulaParaCliente(data.cedulaFormateada || code)
            setQuickClientOpen(true)
            toast.info("Cliente no registrado. Ingrese sus datos.")
          }
        } else {
          toast.error("Error al buscar cliente por cédula")
        }
        return
      }

      // Buscar como código de barras de producto
      const res = await fetch(`/api/productos/by-barcode?code=${encodeURIComponent(code)}`)
      const data = await res.json()

      if (!data.encontrado) {
        toast.error(`Código no encontrado: ${code}`)
        return
      }

      // ¡BLOQUEO DE SEGURIDAD SANITARIA!
      if (data.alertaVencimiento) {
        setAlertaLoteVencido({
          nombre: data.producto.nombre,
          lote: data.alertaVencimiento.codigoLote,
          vencimiento: new Date(data.alertaVencimiento.fechaVencimiento).toLocaleDateString("es-NI"),
        })
        toast.error("Venta Bloqueada: El lote del medicamento está vencido", { duration: 6000 })
        return
      }

      // Producto válido → seleccionar directamente
      const prod = data.producto as Producto
      const existe = productos.find(p => p.id === prod.id)
      setSelectedProducto(existe || prod)
      const defaultUnit = prod.precioVenta && Number(prod.precioVenta) > 0 ? "UNIDAD" : (prod.precioBlister && Number(prod.precioBlister) > 0 ? "BLISTER" : "CAJA")
      setTipoUnidad(defaultUnit)
      if (!existe) {
        setProductos(prev => [...prev, prod])
      }
      toast.success(`✓ Producto: ${prod.nombre}`)
    } catch (err) {
      console.error("Error al procesar código:", err)
      toast.error("Error al buscar el código")
    } finally {
      setBuscandoScanner(false)
    }
  }, [buscandoScanner, productos])

  // Hook de lector físico (solo activo cuando no hay modal abierto)
  useBarcodeScanner(handleScanCode, !scannerOpen && !quickClientOpen && !procesando)

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

    if (cantDeducir + ocupadoEnCarrito > selectedProducto.stockActual) { toast.error("Stock insuficiente"); return }

    const precioUnitario = getPrecioUnitario()
    if (precioUnitario <= 0) { toast.error("El precio del producto es inválido (debe ser mayor a 0)"); return }

    setLineas([...lineas, { idProducto: selectedProducto.id, nombre: selectedProducto.nombre, cantidad: cant, precioUnitario, subtotal: precioUnitario * cant, tipoUnidad }])
    setSelectedProducto(null); setCantidad(""); setTipoUnidad("UNIDAD")
  }

  const total = lineas.reduce((sum, l) => sum + l.subtotal, 0)

  // Find selected discount object
  const descObj = descuentos.find((d: any) => String(d.id) === selectedDescuento)
  
  let discountTotal = 0
  if (descObj) {
    if (descObj.tipo === "PORCENTAJE") {
      discountTotal = total * (Number(descObj.valor) / 100)
      if (descObj.maxDescuento) {
        discountTotal = Math.min(discountTotal, Number(descObj.maxDescuento))
      }
    } else if (descObj.tipo === "MONTO") {
      discountTotal = Number(descObj.valor)
    }
    discountTotal = Math.min(discountTotal, total)
  }

  const totalNeto = total - discountTotal

  const cambio = (metodoPago === "EFECTIVO" && montoRecibido && Number(montoRecibido) >= totalNeto)
    ? Number(montoRecibido) - totalNeto
    : 0

  const handleRegistrarVenta = async () => {
    if (lineas.length === 0) { toast.error("Agregue al menos un producto"); return }
    if (metodoPago === "EFECTIVO" && montoRecibido && Number(montoRecibido) < totalNeto) {
      toast.error("El monto recibido no cubre el total de la venta")
      return
    }
    setProcesando(true)
    try {
      const res = await fetch("/api/ventas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idCliente: selectedCliente ? Number.parseInt(selectedCliente) : null,
          detalles: lineas.map((l) => ({ idProducto: l.idProducto, cantidad: l.cantidad, precioUnitario: l.precioUnitario, tipoUnidad: l.tipoUnidad })),
          metodoPago,
          nombrePodologo: nombrePodologo || null,
          numeroReceta: numeroReceta || null,
          tipoComprobante,
          montoRecibido: montoRecibido ? Number(montoRecibido) : null,
          cambio: montoRecibido ? cambio : null,
          rucCliente: tipoComprobante === "FACTURA" ? rucCliente : null,
          idDescuento: selectedDescuento ? Number.parseInt(selectedDescuento) : null,
          descuentoTotal: discountTotal,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Venta registrada exitosamente")
        router.push("/ventas/historial")
      } else {
        // Mostrar alerta especial para lotes vencidos
        if (data.codigoError === "LOTE_VENCIDO") {
          setAlertaLoteVencido({
            nombre: data.productoNombre || "Producto",
            lote: data.loteInfo?.codigoLote || "—",
            vencimiento: data.loteInfo?.fechaVencimiento
              ? new Date(data.loteInfo.fechaVencimiento).toLocaleDateString("es-NI")
              : "—",
          })
          toast.error(data.error || "Venta Bloqueada: El lote del medicamento está vencido", { duration: 8000 })
        } else {
          toast.error(data.error || "Error al registrar venta")
        }
      }
    } catch (e) { console.error(e); toast.error("Error al registrar venta") } finally { setProcesando(false) }
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
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-primary" />
              Nueva Venta
            </h1>
            {/* Botón de escáner */}
            <Button
              id="btn-scanner-venta"
              variant="outline"
              size="sm"
              onClick={() => setScannerOpen(true)}
              className="border-primary/30 text-primary hover:bg-primary/10 gap-2"
            >
              <ScanLine className="w-4 h-4" />
              Escanear
            </Button>
          </div>
          <p className="text-muted-foreground mb-8">Registra una nueva venta · El lector físico detecta automáticamente</p>

          {/* ALERTA DE LOTE VENCIDO */}
          {alertaLoteVencido && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 animate-pulse-once">
              <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-red-400 text-sm">🚫 Venta Bloqueada: El lote del medicamento está vencido</p>
                <p className="text-xs text-red-400/80 mt-1">
                  <strong>Producto:</strong> {alertaLoteVencido.nombre} ·{" "}
                  <strong>Lote:</strong> {alertaLoteVencido.lote} ·{" "}
                  <strong>Venció:</strong> {alertaLoteVencido.vencimiento}
                </p>
                <p className="text-xs text-red-400/60 mt-1">Retira este lote del inventario activo antes de continuar.</p>
              </div>
              <button
                onClick={() => setAlertaLoteVencido(null)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel izquierdo */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Agregar Productos</h2>
                </div>
                <div className="space-y-4">
                  <div ref={productoDropdownRef} className="relative">
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Producto
                      {buscandoScanner && <span className="ml-2 text-xs text-primary animate-pulse">Procesando escáner...</span>}
                    </label>
                    {selectedProducto ? (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-primary/40 text-foreground text-sm">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{selectedProducto.nombre}</span>
                          <span className="text-xs text-muted-foreground ml-2">Stock: {selectedProducto.stockActual} und</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSelectedProducto(null); setProductoSearch(""); setTipoUnidad("UNIDAD") }}
                          className="text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={productoSearch}
                          onChange={(e) => { setProductoSearch(e.target.value); setShowProductoDropdown(true) }}
                          onFocus={() => setShowProductoDropdown(true)}
                          placeholder="Buscar por nombre o escanear código de barras..."
                          className={`${selectClass} pl-10`}
                          autoComplete="off"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              const searchTrimmed = productoSearch.trim()
                              if (searchTrimmed) {
                                const match = productos.find(
                                  p =>
                                    (p.codigoBarras && p.codigoBarras.trim() === searchTrimmed) ||
                                    p.nombre.toLowerCase() === searchTrimmed.toLowerCase()
                                )
                                if (match) {
                                  setSelectedProducto(match)
                                  const defaultUnit = match.precioVenta && Number(match.precioVenta) > 0 ? "UNIDAD" : (match.precioBlister && Number(match.precioBlister) > 0 ? "BLISTER" : "CAJA")
                                  setTipoUnidad(defaultUnit)
                                  setProductoSearch("")
                                  setShowProductoDropdown(false)
                                  toast.success(`✓ Producto: ${match.nombre}`)
                                } else {
                                  handleScanCode(searchTrimmed)
                                  setProductoSearch("")
                                  setShowProductoDropdown(false)
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    )}
                    {showProductoDropdown && !selectedProducto && (
                      <div className="absolute z-30 mt-1 w-full bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {filteredProductos.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground text-center">No se encontraron productos</div>
                        ) : (
                          filteredProductos.map((p) => {
                            let stockDisplay = `${p.stockActual} und`
                            const parts = []
                            if (p.unidadesPorCaja && p.unidadesPorCaja > 0) {
                              parts.push(`${Math.floor(p.stockActual / p.unidadesPorCaja)} cajas`)
                            }
                            if (p.unidadesPorBlister && p.unidadesPorBlister > 0) {
                              parts.push(`${Math.floor(p.stockActual / p.unidadesPorBlister)} blísters`)
                            }
                            if (parts.length > 0) {
                              stockDisplay += ` (${parts.join(" / ")})`
                            }
                            const isLowStock = p.stockActual <= 10
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setSelectedProducto(p)
                                  const defaultUnit = p.precioVenta && Number(p.precioVenta) > 0 ? "UNIDAD" : (p.precioBlister && Number(p.precioBlister) > 0 ? "BLISTER" : "CAJA")
                                  setTipoUnidad(defaultUnit)
                                  setShowProductoDropdown(false)
                                  setProductoSearch("")
                                }}
                                className="w-full text-left px-4 py-2.5 hover:bg-muted/40 transition-colors flex items-center justify-between gap-2 border-b border-border/30 last:border-b-0"
                              >
                                <span className="text-sm font-medium text-foreground truncate">{p.nombre}</span>
                                <span className={`text-xs font-semibold shrink-0 px-2 py-0.5 rounded-full ${
                                  isLowStock
                                    ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                    : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                }`}>
                                  {stockDisplay}
                                </span>
                              </button>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {selectedProducto && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Tipo de Venta</label>
                      <select value={tipoUnidad} onChange={(e) => setTipoUnidad(e.target.value)} className={selectClass}>
                        {selectedProducto.precioVenta && Number(selectedProducto.precioVenta) > 0 && <option value="UNIDAD">Unidad</option>}
                        {selectedProducto.precioBlister && Number(selectedProducto.precioBlister) > 0 && <option value="BLISTER">Blister</option>}
                        {selectedProducto.precioCaja && Number(selectedProducto.precioCaja) > 0 && <option value="CAJA">Caja</option>}
                      </select>
                    </div>
                  )}

                  {selectedProducto && selectedProducto.lotes && selectedProducto.lotes.length > 0 && (
                    <div className="p-3 bg-muted/40 border border-border rounded-lg space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lotes disponibles (Despacho FIFO):</p>
                      <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                        {selectedProducto.lotes.map((lote) => {
                          const dateStr = lote.fechaVencimiento ? new Date(lote.fechaVencimiento).toLocaleDateString("es-NI") : "Sin vencimiento"
                          return (
                            <div key={lote.id} className="flex justify-between items-center text-xs text-foreground bg-background/50 p-1.5 rounded border border-border/40 font-medium">
                              <span className="font-mono">Lote: <span className="font-bold text-foreground">{lote.codigoLote}</span></span>
                              <span className="text-muted-foreground">Vence: <span className="text-foreground">{dateStr}</span></span>
                              <span className="font-bold text-primary">{lote.stockActual} u.</span>
                            </div>
                          )
                        })}
                      </div>
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
                  {/* Cliente selector con soporte de cédula */}
                  <div ref={clienteDropdownRef} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-foreground">Cliente (Opcional)</label>
                      <button
                        type="button"
                        onClick={() => { setCedulaParaCliente(""); setQuickClientOpen(true) }}
                        className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                      >
                        <UserPlus className="w-3 h-3" />
                        Nuevo
                      </button>
                    </div>
                    {selectedCliente ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-primary/40 text-foreground text-sm">
                          <span className="flex-1 font-medium truncate">
                            {clientes.find(c => String(c.id) === selectedCliente)?.nombreCompleto || "Cliente"}
                          </span>
                          <button
                            type="button"
                            onClick={() => { setSelectedCliente(""); setClienteSearch("") }}
                            className="text-muted-foreground hover:text-foreground shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {(() => {
                          const client = clientes.find(c => String(c.id) === selectedCliente)
                          if (!client) return null
                          return (
                            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10 text-xs space-y-1.5 text-muted-foreground">
                              {client.cedula && (
                                <p className="font-mono flex justify-between">
                                  <span>Cédula:</span>
                                  <span className="font-semibold text-foreground">{client.cedula}</span>
                                </p>
                              )}
                              {client.telefono && (
                                <p className="flex justify-between">
                                  <span>Teléfono:</span>
                                  <span className="font-medium text-foreground">{client.telefono}</span>
                                </p>
                              )}
                              {client.direccion && (
                                <p className="flex flex-col gap-0.5 mt-1 border-t border-border/40 pt-1.5">
                                  <span>Dirección:</span>
                                  <span className="text-foreground font-normal line-clamp-2">{client.direccion}</span>
                                </p>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={clienteSearch}
                          onChange={(e) => { setClienteSearch(e.target.value); setShowClienteDropdown(true) }}
                          onFocus={() => setShowClienteDropdown(true)}
                          placeholder="Buscar por nombre o cédula..."
                          className={`${selectClass} pl-10`}
                          autoComplete="off"
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              const searchTrimmed = clienteSearch.trim()
                              if (searchTrimmed) {
                                const exactMatch = clientes.find(
                                  c => c.cedula && c.cedula.replace(/-/g, "") === searchTrimmed.replace(/-/g, "")
                                )
                                if (exactMatch) {
                                  setSelectedCliente(String(exactMatch.id))
                                  setShowClienteDropdown(false)
                                  setClienteSearch("")
                                  setRucCliente(exactMatch.ruc || "")
                                  toast.success(`✓ Cliente: ${exactMatch.nombreCompleto}`)
                                } else {
                                  await handleScanCode(searchTrimmed)
                                  setClienteSearch("")
                                  setShowClienteDropdown(false)
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    )}
                    {showClienteDropdown && !selectedCliente && (
                      <div className="absolute z-30 mt-1 w-full bg-card border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => { setSelectedCliente(""); setShowClienteDropdown(false); setClienteSearch("") }}
                          className="w-full text-left px-4 py-2.5 hover:bg-muted/40 transition-colors text-sm text-muted-foreground border-b border-border/30"
                        >
                          Sin cliente (Público General)
                        </button>
                        {filteredClientes.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground text-center">No se encontraron clientes</div>
                        ) : (
                          filteredClientes.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCliente(String(c.id))
                                setShowClienteDropdown(false)
                                setClienteSearch("")
                                if (c.ruc) {
                                  setRucCliente(c.ruc)
                                } else {
                                  setRucCliente("")
                                }
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-muted/40 transition-colors text-sm font-medium text-foreground border-b border-border/30 last:border-b-0"
                            >
                              <span>{c.nombreCompleto}</span>
                              {c.cedula && <span className="block text-xs text-muted-foreground font-mono">{c.cedula}</span>}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Tipo de Comprobante</label>
                    <select value={tipoComprobante} onChange={(e) => setTipoComprobante(e.target.value)} className={selectClass}>
                      <option value="RECIBO">Recibo</option>
                      <option value="FACTURA">Factura Local (Nicaragua)</option>
                    </select>
                  </div>
                  {tipoComprobante === "FACTURA" && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">RUC del Cliente (Facturación)</label>
                      <Input value={rucCliente} onChange={(e) => setRucCliente(e.target.value)} placeholder="001-280599-1004A" className="bg-muted/30 border-border text-sm font-mono" />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Método de Pago</label>
                    <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className={selectClass}>
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TARJETA">Tarjeta</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                  </div>

                  {metodoPago === "EFECTIVO" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Monto Recibido</label>
                        <Input type="number" step="0.01" min="0" value={montoRecibido} onChange={(e) => setMontoRecibido(e.target.value)} placeholder="C$0.00" className="bg-muted/30 border-border text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Cambio (Vuelto)</label>
                        <Input type="text" disabled value={montoRecibido && Number(montoRecibido) >= totalNeto ? `C$${cambio.toFixed(2)}` : "C$0.00"} className="bg-muted/30 border-border text-sm font-semibold text-emerald-500" />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Podólogo (Opcional)</label>
                    <Input value={nombrePodologo} onChange={(e) => setNombrePodologo(e.target.value)} placeholder="Nombre del podólogo" className="bg-muted/30 border-border text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">Cargar Receta Médica</label>
                    <div className="flex gap-2">
                      <Input
                        value={numeroReceta}
                        onChange={(e) => setNumeroReceta(e.target.value)}
                        placeholder="RECETA-YYYYMMDD-XXXX"
                        className="bg-muted/30 border-border text-sm"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={async () => {
                          if (!numeroReceta.trim()) {
                            toast.error("Ingresa el código de la receta")
                            return
                          }
                          try {
                            const res = await fetch(`/api/clinica/recetas?codigoReceta=${encodeURIComponent(numeroReceta.trim())}`)
                            const data = await res.json()
                            if (!res.ok || !data || data.length === 0) {
                              toast.error("Receta no encontrada o inválida")
                              return
                            }
                            
                            const receta = data[0]
                            if (receta.estado === "USADA_COMPLETAMENTE" || receta.estado === "ANULADA") {
                              toast.error(`La receta ya está en estado: ${receta.estado}`)
                              return
                            }
                            
                            if (receta.fechaVencimiento && new Date(receta.fechaVencimiento).getTime() < new Date().getTime()) {
                              toast.error("La receta está vencida")
                              return
                            }

                            // Cargar paciente
                            setSelectedCliente(String(receta.idCliente))
                            if (receta.cliente?.ruc) {
                              setRucCliente(receta.cliente.ruc)
                            }
                            if (receta.usuario?.nombreCompleto) {
                              setNombrePodologo(receta.usuario.nombreCompleto)
                            }

                            // Cargar líneas de venta correspondientes
                            const lineasReceta: LineaVenta[] = []
                            for (const d of receta.detalles) {
                              const pendiente = d.cantidad - d.cantidadFacturada
                              if (pendiente <= 0) continue

                              lineasReceta.push({
                                idProducto: d.idProducto,
                                nombre: d.producto.nombre,
                                cantidad: d.producto.esServicio ? d.cantidad : Math.min(pendiente, d.producto.stockActual || 0), // Si es servicio no limita por stock físico
                                precioUnitario: Number(d.producto.precioVenta),
                                subtotal: Number(d.producto.precioVenta) * Math.min(pendiente, d.producto.esServicio ? d.cantidad : (d.producto.stockActual || 0)),
                                tipoUnidad: "UNIDAD"
                              })
                            }

                            if (lineasReceta.length === 0) {
                              toast.error("Todos los artículos de esta receta ya han sido facturados o no cuentan con stock físico.")
                              return
                            }

                            setLineas(lineasReceta)
                            setNumeroReceta(receta.codigoReceta)
                            toast.success(`✓ Receta cargada. ${lineasReceta.length} artículos agregados al carrito.`)
                          } catch (err) {
                            toast.error("Error al buscar la receta")
                          }
                        }}
                        className="text-xs shrink-0"
                      >
                        Cargar
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Descuento General</label>
                      <select
                        value={selectedDescuento}
                        onChange={(e) => setSelectedDescuento(e.target.value)}
                        className={selectClass}
                      >
                        <option value="">Ningún descuento</option>
                        {descuentos.map((d: any) => (
                          <option key={d.id} value={d.id}>
                            {d.motivo} ({d.tipo === "PORCENTAJE" ? `${Number(d.valor).toFixed(0)}%` : `C$${Number(d.valor).toFixed(2)}`})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-border/40">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Artículos</span>
                        <span className="font-medium text-foreground">{lineas.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium text-foreground">C${total.toFixed(2)}</span>
                      </div>
                      {discountTotal > 0 && (
                        <div className="flex items-center justify-between text-xs text-red-500">
                          <span>Descuento</span>
                          <span className="font-semibold">-C${discountTotal.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-border/60">
                        <span className="text-sm font-semibold text-muted-foreground">Total Neto</span>
                        <span className="text-2xl font-bold text-primary">C${totalNeto.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    id="btn-registrar-venta"
                    onClick={handleRegistrarVenta}
                    disabled={procesando || lineas.length === 0}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium shadow-lg shadow-emerald-500/20"
                  >
                    {procesando ? "Procesando..." : "Registrar Venta"}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Scanner Modal */}
      <ScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => {
          setScannerOpen(false)
          handleScanCode(code)
        }}
        title="Escanear Producto"
        hint="Apunta al código de barras del medicamento"
      />

      {/* Quick Client Modal */}
      <QuickClientModal
        isOpen={quickClientOpen}
        cedulaPre={cedulaParaCliente}
        onClose={() => setQuickClientOpen(false)}
        onCreated={(cliente) => {
          setClientes(prev => {
            if (prev.find(c => c.id === cliente.id)) return prev
            return [...prev, cliente]
          })
          setSelectedCliente(String(cliente.id))
        }}
      />
    </div>
  )
}
