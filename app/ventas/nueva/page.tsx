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
  Scan, AlertTriangle, UserPlus, ScanLine, PauseCircle, Play, ChevronDown, ShieldCheck, PackageCheck, Clock3
} from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"
import { useCurrentUser } from "@/app/hooks/useCurrentUser"
import { tasaDescuentoNivel } from "@/lib/domain/loyalty"

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload
      ? String(payload.error)
      : "No fue posible cargar los datos"
    throw new Error(message)
  }
  return payload
}

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
  esServicio?: boolean
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
  puntosFidelidad?: number
  nivelFidelidad?: "BRONCE" | "PLATA" | "ORO"
  saldoFavor?: string
}

interface LineaVenta {
  idProducto: number
  nombre: string
  cantidad: number
  precioUnitario: number
  subtotal: number
  tipoUnidad: string
  alertaVencimiento?: string | null
  idLotePreferido?: number | null
  motivoCambioLote?: string | null
  loteCodigo?: string | null
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
  const { user } = useCurrentUser()
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
  const [selectedLoteId, setSelectedLoteId] = useState<number | null>(null)
  const [motivoCambioLote, setMotivoCambioLote] = useState("")
  const [alergiasPendientes, setAlergiasPendientes] = useState<string | null>(null)
  const [confirmarAlergias, setConfirmarAlergias] = useState(false)
  const [estadoEntrega, setEstadoEntrega] = useState<"ENTREGADA" | "LISTO_PARA_RETIRAR">("ENTREGADA")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showPausadas, setShowPausadas] = useState(false)
  const [aplicarSaldoFavor, setAplicarSaldoFavor] = useState(false)

  const { data: descuentosData } = useSWR<any[]>("/api/descuentos?estado=ACTIVO", fetcher)
  const descuentos = Array.isArray(descuentosData) ? descuentosData : []
  const { data: pausadasData, mutate: mutatePausadas } = useSWR<{ pausadas: any[] }>("/api/ventas/pausadas", fetcher)
  const ventasPausadas = pausadasData?.pausadas || []

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

  useEffect(() => {
    const modo = new URLSearchParams(window.location.search).get("modo")
    if (modo === "receta") setShowAdvanced(true)
  }, [])

  useEffect(() => {
    setSelectedLoteId(null)
    setMotivoCambioLote("")
  }, [selectedProducto?.id])

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

  const filteredProductos = productos
    .filter(p =>
      p.nombre.toLowerCase().includes(productoSearch.toLowerCase()) ||
      (p.codigoBarras && p.codigoBarras.toLowerCase().includes(productoSearch.toLowerCase()))
    )
    .slice(0, 50)

  const filteredClientes = clientes.filter(c =>
    c.nombreCompleto.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    (c.cedula && c.cedula.replace(/-/g, "").includes(clienteSearch.replace(/-/g, "")))
  )

  const fetchData = async () => {
    try {
      const [resP, resC] = await Promise.all([fetch("/api/productos?soloLotesVigentes=true"), fetch("/api/clientes")])
      const [productosPayload, clientesPayload] = await Promise.all([
        resP.json().catch(() => null),
        resC.json().catch(() => null),
      ])
      if (!resP.ok || !Array.isArray(productosPayload)) {
        throw new Error("No fue posible cargar el catálogo de productos")
      }
      if (!resC.ok || !Array.isArray(clientesPayload)) {
        throw new Error("No fue posible cargar los clientes")
      }
      setProductos(productosPayload)
      setClientes(clientesPayload)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Error al cargar los datos de venta")
    } finally {
      setLoading(false)
    }
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

    if (!selectedProducto.esServicio && cantDeducir + ocupadoEnCarrito > selectedProducto.stockActual) { toast.error("Stock insuficiente"); return }

    const precioUnitario = getPrecioUnitario()
    if (precioUnitario <= 0) { toast.error("El precio del producto es inválido (debe ser mayor a 0)"); return }

    const ahora = Date.now()
    const lotesVigentes = (selectedProducto.lotes || []).filter((l) => l.stockActual > 0 && (!l.fechaVencimiento || new Date(l.fechaVencimiento).getTime() > ahora))
    const loteFEFO = lotesVigentes[0]
    const loteElegido = lotesVigentes.find((l) => l.id === selectedLoteId) || loteFEFO
    const excepcion = Boolean(loteElegido && loteFEFO && loteElegido.id !== loteFEFO.id)
    if (excepcion && user?.rolNombre !== "ADMIN") { toast.error("Solo administración puede cambiar el lote FEFO"); return }
    if (excepcion && motivoCambioLote.trim().length < 5) { toast.error("Explique el motivo del cambio de lote"); return }
    setLineas([...lineas, { idProducto: selectedProducto.id, nombre: selectedProducto.nombre, cantidad: cant, precioUnitario, subtotal: precioUnitario * cant, tipoUnidad, idLotePreferido: excepcion ? loteElegido?.id : null, motivoCambioLote: excepcion ? motivoCambioLote.trim() : null, loteCodigo: loteElegido?.codigoLote || null }])
    setSelectedProducto(null); setCantidad(""); setTipoUnidad("UNIDAD"); setSelectedLoteId(null); setMotivoCambioLote("")
  }

  const total = lineas.reduce((sum, l) => sum + l.subtotal, 0)

  // Find selected discount object
  const now = new Date()

  // Filter discounts valid for today + meeting minimum purchase condition
  const descuentosValidos = descuentos.filter((d: any) => {
    if (!d.activo || d.estado === "INACTIVO") return false
    if (d.fechaInicio && new Date(d.fechaInicio) > now) return false
    if (d.fechaFin && new Date(d.fechaFin) < now) return false
    if (d.limiteUso != null && d.usosActuales >= d.limiteUso) return false
    return true
  })

  const descObj = descuentosValidos.find((d: any) => String(d.id) === selectedDescuento)

  // Auto-clear discount if minimum amount condition is no longer met
  useEffect(() => {
    if (!selectedDescuento) return
    const d = descuentosValidos.find((x: any) => String(x.id) === selectedDescuento)
    if (!d) return
    const minimo = Number(d.montoMinimoCompra || d.montoMinimo || 0)
    if (minimo > 0 && total < minimo) {
      setSelectedDescuento("")
      toast.warning(`Descuento eliminado: el subtotal (C$${total.toFixed(2)}) está por debajo del mínimo requerido (C$${minimo.toFixed(2)})`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, selectedDescuento])

  let discountTotal = 0
  if (descObj) {
    const minimo = Number(descObj.montoMinimoCompra || descObj.montoMinimo || 0)
    // Only apply if total meets minimum
    if (minimo <= 0 || total >= minimo) {
      const tipoValor = descObj.tipoValor || descObj.tipo // support both field names
      if (tipoValor === "PORCENTAJE") {
        discountTotal = total * (Number(descObj.valor) / 100)
        if (descObj.maxDescuento) {
          discountTotal = Math.min(discountTotal, Number(descObj.maxDescuento))
        }
      } else if (tipoValor === "MONTO" || tipoValor === "MONTO_FIJO") {
        discountTotal = Number(descObj.valor)
      }
      discountTotal = Math.min(discountTotal, total)
    }
  }

  const clienteSeleccionado = clientes.find((cliente) => String(cliente.id) === selectedCliente)
  const descuentoFidelizacion = Math.round(Math.max(0, total - discountTotal) * tasaDescuentoNivel(clienteSeleccionado?.nivelFidelidad || "BRONCE") * 100) / 100
  const saldoDisponible = Number(clienteSeleccionado?.saldoFavor || 0)
  const saldoAplicado = aplicarSaldoFavor ? Math.min(saldoDisponible, Math.max(0, total - discountTotal - descuentoFidelizacion)) : 0
  const totalNeto = Math.max(0, total - discountTotal - descuentoFidelizacion - saldoAplicado)

  const cambio = (metodoPago === "EFECTIVO" && montoRecibido && Number(montoRecibido) >= totalNeto)
    ? Number(montoRecibido) - totalNeto
    : 0

  const limpiarVenta = () => {
    setLineas([])
    setSelectedCliente("")
    setClienteSearch("")
    setMetodoPago("EFECTIVO")
    setNombrePodologo("")
    setNumeroReceta("")
    setTipoComprobante("RECIBO")
    setRucCliente("")
    setMontoRecibido("")
    setSelectedDescuento("")
    setAlergiasPendientes(null)
    setConfirmarAlergias(false)
    setEstadoEntrega("ENTREGADA")
    setShowAdvanced(false)
    setAplicarSaldoFavor(false)
  }

  const pausarVenta = async () => {
    if (!lineas.length) return toast.error("Agrega al menos un producto antes de pausar")
    const cliente = clientes.find((item) => String(item.id) === selectedCliente)
    const titulo = cliente?.nombreCompleto || `Venta ${new Date().toLocaleTimeString("es-NI", { hour: "2-digit", minute: "2-digit" })}`
    try {
      const response = await fetch("/api/ventas/pausadas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          idCliente: selectedCliente ? Number(selectedCliente) : null,
          payload: { lineas, selectedCliente, metodoPago, nombrePodologo, numeroReceta, tipoComprobante, rucCliente, montoRecibido, selectedDescuento, alergiasPendientes, confirmarAlergias, estadoEntrega, aplicarSaldoFavor },
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "No se pudo pausar la venta")
      limpiarVenta()
      await mutatePausadas()
      setShowPausadas(true)
      toast.success("Venta pausada y disponible para recuperar")
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "No se pudo pausar la venta") }
  }

  const recuperarVenta = async (pausa: any) => {
    if (lineas.length && !window.confirm("El carrito actual será reemplazado por la venta pausada. ¿Continuar?")) return
    const response = await fetch(`/api/ventas/pausadas/${pausa.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "RECUPERAR" }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) return toast.error(result.error || "No se pudo recuperar la venta")
    const payload = pausa.payload || {}
    setLineas(Array.isArray(payload.lineas) ? payload.lineas : [])
    setSelectedCliente(payload.selectedCliente || "")
    setMetodoPago(payload.metodoPago || "EFECTIVO")
    setNombrePodologo(payload.nombrePodologo || "")
    setNumeroReceta(payload.numeroReceta || "")
    setTipoComprobante(payload.tipoComprobante || "RECIBO")
    setRucCliente(payload.rucCliente || "")
    setMontoRecibido(payload.montoRecibido || "")
    setSelectedDescuento(payload.selectedDescuento || "")
    setAlergiasPendientes(payload.alergiasPendientes || null)
    setConfirmarAlergias(Boolean(payload.confirmarAlergias))
    setEstadoEntrega(payload.estadoEntrega === "LISTO_PARA_RETIRAR" ? "LISTO_PARA_RETIRAR" : "ENTREGADA")
    setAplicarSaldoFavor(Boolean(payload.aplicarSaldoFavor))
    setShowAdvanced(Boolean(payload.nombrePodologo || payload.numeroReceta || payload.tipoComprobante === "FACTURA" || payload.selectedDescuento))
    setShowPausadas(false)
    await mutatePausadas()
    toast.success("Venta recuperada")
  }

  const cancelarPausa = async (pausa: any) => {
    const response = await fetch(`/api/ventas/pausadas/${pausa.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "CANCELAR" }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) return toast.error(result.error || "No se pudo descartar la venta pausada")
    await mutatePausadas()
    toast.success("Venta pausada descartada")
  }

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
          detalles: lineas.map((l) => ({ idProducto: l.idProducto, cantidad: l.cantidad, precioUnitario: l.precioUnitario, tipoUnidad: l.tipoUnidad, idLotePreferido: l.idLotePreferido, motivoCambioLote: l.motivoCambioLote })),
          metodoPago,
          nombrePodologo: nombrePodologo || null,
          numeroReceta: numeroReceta || null,
          tipoComprobante,
          estadoEntrega,
          montoRecibido: montoRecibido ? Number(montoRecibido) : null,
          cambio: montoRecibido ? cambio : null,
          rucCliente: tipoComprobante === "FACTURA" ? rucCliente : null,
          idDescuento: selectedDescuento ? Number.parseInt(selectedDescuento) : null,
          descuentoTotal: discountTotal,
          confirmarAlergias,
          aplicarSaldoFavor,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        if ("BroadcastChannel" in window) {
          const channel = new BroadcastChannel("farmapos-caja")
          channel.postMessage({ type: "VENTA_REGISTRADA", idVenta: data.id })
          channel.close()
        }
        toast.success("Venta registrada exitosamente")
        router.push("/ventas/historial")
      } else {
        // Mostrar alerta especial para lotes vencidos
        if (data.codigoError === "ALERGIAS_PENDIENTES") {
          setAlergiasPendientes(data.alergias || "Alergias registradas")
          setConfirmarAlergias(false)
          toast.warning("Revise las alergias del paciente antes de confirmar")
        } else if (data.codigoError === "LOTE_VENCIDO") {
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-primary" />
              Nueva Venta
            </h1>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowPausadas((value) => !value)} className="gap-2">
                <Clock3 className="w-4 h-4" />
                Pausadas {ventasPausadas.length > 0 && `(${ventasPausadas.length})`}
              </Button>
              <Button variant="outline" size="sm" onClick={pausarVenta} disabled={lineas.length === 0} className="gap-2">
                <PauseCircle className="w-4 h-4" />
                Pausar venta
              </Button>
              <Button
                id="btn-scanner-venta"
                size="sm"
                onClick={() => setScannerOpen(true)}
                className="gap-2"
              >
                <ScanLine className="w-4 h-4" />
                Escanear
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground mb-5">Busca o escanea, confirma el cobro y entrega. Las opciones poco frecuentes permanecen ocultas.</p>

          {showPausadas && (
            <Card className="mb-6 border-blue-500/20 bg-blue-500/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Ventas pausadas</p>
                  <p className="text-xs text-muted-foreground">Recupera el carrito exactamente donde quedó.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowPausadas(false)}><X className="h-4 w-4" /></Button>
              </div>
              {ventasPausadas.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">No hay ventas pausadas.</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {ventasPausadas.map((pausa: any) => (
                    <div key={pausa.id} className="rounded-xl border border-border bg-background/70 p-3">
                      <p className="truncate text-sm font-semibold text-foreground">{pausa.titulo}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{Array.isArray(pausa.payload?.lineas) ? pausa.payload.lineas.length : 0} artículos · {new Date(pausa.createdAt).toLocaleTimeString("es-NI", { hour: "2-digit", minute: "2-digit" })}</p>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" onClick={() => recuperarVenta(pausa)} className="h-8 flex-1 gap-1"><Play className="h-3.5 w-3.5" /> Recuperar</Button>
                        <Button size="sm" variant="ghost" onClick={() => cancelarPausa(pausa)} className="h-8 text-muted-foreground">Descartar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-blue-300">
            <span className="flex items-center gap-1.5 font-semibold"><ShieldCheck className="h-4 w-4" /> Protecciones activas</span>
            <span>FEFO automático</span>
            <span>Lotes vencidos bloqueados</span>
            <span>Receta y alergias verificadas</span>
          </div>

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

          <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
            {/* Panel izquierdo */}
            <div className="min-w-0 space-y-6">
              <Card className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Agregar Productos</h2>
                </div>
                <div className="space-y-4">
                  <div ref={productoDropdownRef} className="relative">
                    <label htmlFor="producto-search" className="block text-sm font-medium text-foreground mb-1">
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
                          id="producto-search"
                          type="text"
                          value={productoSearch}
                          onChange={(e) => { setProductoSearch(e.target.value); setShowProductoDropdown(true) }}
                          onFocus={() => setShowProductoDropdown(true)}
                          placeholder="Buscar por nombre o escanear código de barras..."
                          className={`${selectClass} pl-10`}
                          autoComplete="off"
                          role="combobox"
                          aria-autocomplete="list"
                          aria-controls="producto-results"
                          aria-expanded={showProductoDropdown}
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
                            } else if (e.key === "Escape") {
                              setShowProductoDropdown(false)
                            }
                          }}
                        />
                      </div>
                    )}
                    {showProductoDropdown && !selectedProducto && (
                      <div
                        id="producto-results"
                        role="listbox"
                        aria-label="Resultados de productos"
                        className="relative z-10 mt-2 max-h-64 w-full overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl shadow-black/30"
                      >
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
                            const isUnavailable = !p.esServicio && p.stockActual <= 0
                            return (
                              <button
                                key={p.id}
                                type="button"
                                role="option"
                                aria-selected="false"
                                disabled={isUnavailable}
                                onClick={() => {
                                  setSelectedProducto(p)
                                  const defaultUnit = p.precioVenta && Number(p.precioVenta) > 0 ? "UNIDAD" : (p.precioBlister && Number(p.precioBlister) > 0 ? "BLISTER" : "CAJA")
                                  setTipoUnidad(defaultUnit)
                                  setShowProductoDropdown(false)
                                  setProductoSearch("")
                                }}
                                className="flex w-full items-center justify-between gap-2 border-b border-border/50 px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
                              >
                                <span className="text-sm font-medium text-foreground truncate">{p.nombre}</span>
                                <span className={`text-xs font-semibold shrink-0 px-2 py-0.5 rounded-full border ${
                                  isUnavailable
                                    ? "bg-muted text-muted-foreground border-border"
                                    : isLowStock
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                }`}>
                                  {isUnavailable ? "Sin stock" : stockDisplay}
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
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lotes disponibles (FEFO: primero en vencer, primero en salir)</p>
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
                      {user?.rolNombre === "ADMIN" && (() => {
                        const vigentes = selectedProducto.lotes!.filter((l) => !l.fechaVencimiento || new Date(l.fechaVencimiento) > new Date())
                        if (vigentes.length < 2) return null
                        return <div className="space-y-2 pt-2 border-t border-border">
                          <label className="text-xs font-medium text-foreground">Cambio administrativo de lote</label>
                          <select value={selectedLoteId || vigentes[0]?.id || ""} onChange={(e) => setSelectedLoteId(Number(e.target.value))} className={selectClass}>
                            {vigentes.map((l, index) => <option key={l.id} value={l.id}>{index === 0 ? "Sugerido FEFO: " : "Alternativo: "}{l.codigoLote}</option>)}
                          </select>
                          {selectedLoteId && selectedLoteId !== vigentes[0]?.id && <Input value={motivoCambioLote} onChange={(e) => setMotivoCambioLote(e.target.value)} placeholder="Motivo obligatorio del cambio" />}
                        </div>
                      })()}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Cantidad</label>
                      <Input id="cantidad-venta" type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} placeholder="0" className="bg-muted/30 border-border" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Precio Unitario</label>
                      <Input id="precio-unitario" type="text" disabled value={selectedProducto ? `C$${getPrecioUnitario().toFixed(2)}` : "—"} className="bg-muted/30 border-border" />
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
                            <td className="py-3 text-foreground">
                              <span>{linea.nombre}</span><span className="text-xs text-muted-foreground ml-2">({linea.tipoUnidad})</span>
                              {linea.loteCodigo && <span className="mt-1 block text-[11px] font-medium text-blue-400">FEFO · lote {linea.loteCodigo}</span>}
                            </td>
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
            <div className="min-w-0">
              <Card className="glass-card p-6 xl:sticky xl:top-8">
                <h2 className="text-lg font-semibold text-foreground mb-4">Información de Venta</h2>
                <div className="space-y-4">
                  {/* Cliente selector con soporte de cédula */}
                  <div ref={clienteDropdownRef} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="cliente-search" className="block text-sm font-medium text-foreground">Cliente (Opcional)</label>
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
                            onClick={() => { setSelectedCliente(""); setClienteSearch(""); setAplicarSaldoFavor(false) }}
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
                              <div className="mt-2 border-t border-border/40 pt-2">
                                <div className="flex items-center justify-between"><span>Fidelización</span><span className="font-semibold text-foreground">{client.nivelFidelidad || "BRONCE"} · {client.puntosFidelidad || 0} pts</span></div>
                                {Number(client.saldoFavor || 0) > 0 && <label className="mt-2 flex cursor-pointer items-center justify-between rounded-lg bg-emerald-500/10 p-2 text-emerald-300"><span>Usar saldo C${Number(client.saldoFavor).toFixed(2)}</span><input type="checkbox" checked={aplicarSaldoFavor} onChange={(event) => setAplicarSaldoFavor(event.target.checked)} /></label>}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          id="cliente-search"
                          type="text"
                          value={clienteSearch}
                          onChange={(e) => { setClienteSearch(e.target.value); setShowClienteDropdown(true) }}
                          onFocus={() => setShowClienteDropdown(true)}
                          placeholder="Buscar por nombre o cédula..."
                          className={`${selectClass} pl-10`}
                          autoComplete="off"
                          role="combobox"
                          aria-autocomplete="list"
                          aria-controls="cliente-results"
                          aria-expanded={showClienteDropdown}
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
                            } else if (e.key === "Escape") {
                              setShowClienteDropdown(false)
                            }
                          }}
                        />
                      </div>
                    )}
                    {showClienteDropdown && !selectedCliente && (
                      <div
                        id="cliente-results"
                        role="listbox"
                        aria-label="Resultados de clientes"
                        className="relative z-10 mt-2 max-h-52 w-full overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl shadow-black/30"
                      >
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
                    <label className="block text-sm font-medium text-foreground mb-2">Entrega</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setEstadoEntrega("ENTREGADA")} className={`rounded-xl border p-3 text-left transition-colors ${estadoEntrega === "ENTREGADA" ? "border-emerald-500/50 bg-emerald-500/10" : "border-border bg-muted/20 hover:bg-muted/40"}`}>
                        <PackageCheck className={`mb-1 h-4 w-4 ${estadoEntrega === "ENTREGADA" ? "text-emerald-400" : "text-muted-foreground"}`} />
                        <span className="block text-xs font-semibold text-foreground">Entrega ahora</span>
                      </button>
                      <button type="button" onClick={() => setEstadoEntrega("LISTO_PARA_RETIRAR")} className={`rounded-xl border p-3 text-left transition-colors ${estadoEntrega === "LISTO_PARA_RETIRAR" ? "border-amber-500/50 bg-amber-500/10" : "border-border bg-muted/20 hover:bg-muted/40"}`}>
                        <Clock3 className={`mb-1 h-4 w-4 ${estadoEntrega === "LISTO_PARA_RETIRAR" ? "text-amber-400" : "text-muted-foreground"}`} />
                        <span className="block text-xs font-semibold text-foreground">Listo para retirar</span>
                      </button>
                    </div>
                  </div>

                  <Button type="button" variant="ghost" onClick={() => setShowAdvanced((value) => !value)} className="w-full justify-between border border-dashed border-border text-muted-foreground hover:text-foreground">
                    Factura, receta, podólogo y descuentos
                    <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                  </Button>

                  {showAdvanced && (
                    <>
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
                            const alergias = receta.cliente?.datosClinicos?.alergias?.trim()
                            setAlergiasPendientes(alergias || null)
                            setConfirmarAlergias(!alergias)
                            if (alergias) toast.warning("Paciente con alergias registradas: revíselas antes de vender", { duration: 8000 })

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
                    </>
                  )}

                  <div className="pt-4 border-t border-border space-y-3">
                    {showAdvanced && <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Descuento General</label>
                      <select
                        value={selectedDescuento}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val) {
                            const d = descuentosValidos.find((x: any) => String(x.id) === val)
                            if (d) {
                              const minimo = Number(d.montoMinimoCompra || d.montoMinimo || 0)
                              if (minimo > 0 && total < minimo) {
                                toast.error(`Este descuento requiere un mínimo de C$${minimo.toFixed(2)}. Tu subtotal es C$${total.toFixed(2)}.`)
                                return
                              }
                            }
                          }
                          setSelectedDescuento(val)
                        }}
                        className={selectClass}
                      >
                        <option value="">Ningún descuento</option>
                        {descuentosValidos.map((d: any) => {
                          const minimo = Number(d.montoMinimoCompra || d.montoMinimo || 0)
                          const esCondicionada = minimo > 0 && total < minimo
                          const valorLabel = (d.tipoValor || d.tipo) === "PORCENTAJE"
                            ? `${Number(d.valor).toFixed(0)}%`
                            : `C$${Number(d.valor).toFixed(2)}`
                          const minimoLabel = minimo > 0 ? ` — Mín. C$${minimo.toFixed(2)}` : ""
                          return (
                            <option key={d.id} value={d.id} disabled={esCondicionada}>
                              {d.nombre || d.motivo} ({valorLabel}){minimoLabel}{esCondicionada ? " ⛔" : ""}
                            </option>
                          )
                        })}
                      </select>
                    </div>}

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
                        <div className="flex items-center justify-between text-xs text-emerald-400">
                          <span>Descuento</span>
                          <span className="font-semibold">-C${discountTotal.toFixed(2)}</span>
                        </div>
                      )}
                      {descuentoFidelizacion > 0 && (
                        <div className="flex items-center justify-between text-xs text-emerald-400"><span>Beneficio {clienteSeleccionado?.nivelFidelidad}</span><span className="font-semibold">-C${descuentoFidelizacion.toFixed(2)}</span></div>
                      )}
                      {saldoAplicado > 0 && (
                        <div className="flex items-center justify-between text-xs text-blue-300"><span>Saldo a favor</span><span className="font-semibold">-C${saldoAplicado.toFixed(2)}</span></div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-border/60">
                        <span className="text-sm font-semibold text-muted-foreground">Total Neto</span>
                        <span className="text-2xl font-bold text-primary">C${totalNeto.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {alergiasPendientes && (
                    <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm space-y-2">
                      <p className="font-bold text-red-500 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Alerta de alergias</p>
                      <p className="text-foreground">{alergiasPendientes}</p>
                      <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
                        <input type="checkbox" checked={confirmarAlergias} onChange={(e) => setConfirmarAlergias(e.target.checked)} className="mt-0.5" />
                        Confirmo que revisé esta información antes de surtir la receta.
                      </label>
                    </div>
                  )}

                  <Button
                    id="btn-registrar-venta"
                    onClick={handleRegistrarVenta}
                    disabled={procesando || lineas.length === 0 || Boolean(alergiasPendientes && !confirmarAlergias)}
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
