"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Eye, X, ShoppingCart, Calendar, RefreshCw, PackageCheck, Clock3, RotateCcw, ArrowLeftRight } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentUser } from "@/app/hooks/useCurrentUser"
import { toast } from "sonner"
import { usePersistentState } from "@/hooks/usePersistentState"

interface Venta {
  id: number
  fecha: string
  cliente: { nombreCompleto: string } | null
  total: string
  metodoPago: string
  numeroReceta: string | null
  estado: string
  estadoEntrega: string
  devoluciones: Array<{
    id: number
    tipo: string
    total: string
    detalles: Array<{ idDetalleVenta: number; cantidad: number }>
  }>
  detalles: Array<{ id: number; producto: { nombre: string }; cantidad: number; precioUnitario: string; tipoUnidad: string }>
}

function getManaguaToday() {
  const now = new Date()
  const managua = new Date(now.getTime() - 6 * 60 * 60 * 1000)
  return managua.toISOString().split("T")[0]
}

export default function HistorialVentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null)
  
  // Date filter states
  const [preset, setPreset] = usePersistentState("farmapos:ventas:filtro-fecha", "todos")
  const [startDate, setStartDate] = usePersistentState("farmapos:ventas:desde", "")
  const [endDate, setEndDate] = usePersistentState("farmapos:ventas:hasta", "")
  
  const [anulando, setAnulando] = useState(false)
  const [devolucionVenta, setDevolucionVenta] = useState<Venta | null>(null)
  const [tipoDevolucion, setTipoDevolucion] = useState<"DEVOLUCION" | "CAMBIO">("DEVOLUCION")
  const [motivoDevolucion, setMotivoDevolucion] = useState("PRODUCTO_INCORRECTO")
  const [observacionDevolucion, setObservacionDevolucion] = useState("")
  const [cantidadesDevolucion, setCantidadesDevolucion] = useState<Record<number, number>>({})
  const [reintegrarStock, setReintegrarStock] = useState(false)
  const [procesandoDevolucion, setProcesandoDevolucion] = useState(false)

  const { user } = useCurrentUser()
  const isAdmin = user?.rolNombre === "ADMIN"

  const fetchVentas = async (start?: string, end?: string) => {
    setLoading(true)
    setLoadError(null)
    try {
      let url = "/api/ventas"
      const params = new URLSearchParams()
      if (start) params.append("startDate", start)
      if (end) params.append("endDate", end)
      if (params.toString()) {
        url += `?${params.toString()}`
      }
      const res = await fetch(url, { cache: "no-store" })
      const payload: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        const apiMessage = payload && typeof payload === "object" && "error" in payload
          ? String(payload.error)
          : "No fue posible consultar las ventas"
        throw new Error(apiMessage)
      }
      if (!Array.isArray(payload)) {
        throw new Error("La respuesta del historial no tiene el formato esperado")
      }
      setVentas(payload as Venta[])
    } catch (error) {
      console.error(error)
      setVentas([])
      const message = error instanceof Error ? error.message : "Error al cargar el historial de ventas"
      setLoadError(message)
      toast.error(message)
    } finally { 
      setLoading(false) 
    }
  }

  // Effect to fetch when preset or custom dates change
  useEffect(() => {
    const todayStr = getManaguaToday()
    
    if (preset === "todos") {
      setStartDate("")
      setEndDate("")
      fetchVentas()
    } else if (preset === "hoy") {
      setStartDate(todayStr)
      setEndDate(todayStr)
      fetchVentas(todayStr, todayStr)
    } else if (preset === "ayer") {
      const now = new Date()
      const yesterday = new Date(now.getTime() - (6 + 24) * 60 * 60 * 1000)
      const yesterdayStr = yesterday.toISOString().split("T")[0]
      setStartDate(yesterdayStr)
      setEndDate(yesterdayStr)
      fetchVentas(yesterdayStr, yesterdayStr)
    } else if (preset === "semana") {
      const now = new Date()
      const weekAgo = new Date(now.getTime() - (6 + 24 * 6) * 60 * 60 * 1000)
      const weekAgoStr = weekAgo.toISOString().split("T")[0]
      setStartDate(weekAgoStr)
      setEndDate(todayStr)
      fetchVentas(weekAgoStr, todayStr)
    } else if (preset === "mes") {
      const now = new Date()
      const managua = new Date(now.getTime() - 6 * 60 * 60 * 1000)
      const startOfMonthStr = `${managua.toISOString().split("-")[0]}-${managua.toISOString().split("-")[1]}-01`
      setStartDate(startOfMonthStr)
      setEndDate(todayStr)
      fetchVentas(startOfMonthStr, todayStr)
    }
  }, [preset])

  const handleApplyCustomFilter = () => {
    if (preset === "custom" && startDate && endDate) {
      fetchVentas(startDate, endDate)
    }
  }

  const handleAnularVenta = async (id: number) => {
    const ok = window.confirm(`¿Seguro que deseas ANULAR la venta #${id}? Esta acción restablecerá el inventario a los lotes originales de forma permanente y registrará el ajuste en el Kardex.`)
    if (!ok) return

    setAnulando(true)
    try {
      const res = await fetch(`/api/ventas/${id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Error al anular la venta")
        return
      }
      toast.success("Venta anulada correctamente")
      setSelectedVenta(null)
      // Refetch with current settings
      if (preset === "custom") {
        fetchVentas(startDate, endDate)
      } else {
        setPreset("todos")
      }
    } catch (e) {
      toast.error("Error de conexión al anular la venta")
    } finally {
      setAnulando(false)
    }
  }

  const refrescarVentas = () => fetchVentas(startDate || undefined, endDate || undefined)

  const actualizarEntrega = async (venta: Venta, accion: "MARCAR_LISTO" | "MARCAR_ENTREGADA") => {
    const response = await fetch(`/api/ventas/${venta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) return toast.error(payload.error || "No se pudo actualizar la entrega")
    toast.success(accion === "MARCAR_LISTO" ? "Pedido listo para retirar" : "Pedido marcado como entregado")
    setSelectedVenta(null)
    await refrescarVentas()
  }

  const cantidadDisponible = (venta: Venta, idDetalleVenta: number, cantidadVendida: number) => {
    const devuelta = (venta.devoluciones || []).reduce((total, devolucion) => {
      const linea = devolucion.detalles.find((detalle) => detalle.idDetalleVenta === idDetalleVenta)
      return total + (linea?.cantidad || 0)
    }, 0)
    return Math.max(0, cantidadVendida - devuelta)
  }

  const abrirDevolucion = (venta: Venta, tipo: "DEVOLUCION" | "CAMBIO") => {
    setDevolucionVenta(venta)
    setTipoDevolucion(tipo)
    setMotivoDevolucion("PRODUCTO_INCORRECTO")
    setObservacionDevolucion("")
    setCantidadesDevolucion({})
    setReintegrarStock(false)
  }

  const registrarDevolucion = async () => {
    if (!devolucionVenta) return
    const detalles = Object.entries(cantidadesDevolucion)
      .map(([idDetalleVenta, cantidad]) => ({ idDetalleVenta: Number(idDetalleVenta), cantidad: Number(cantidad) }))
      .filter((detalle) => detalle.cantidad > 0)
    if (detalles.length === 0) return toast.error("Selecciona al menos un artículo")
    setProcesandoDevolucion(true)
    try {
      const response = await fetch(`/api/ventas/${devolucionVenta.id}/devoluciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          tipo: tipoDevolucion,
          motivo: motivoDevolucion,
          observacion: observacionDevolucion || null,
          reintegrarStock,
          detalles,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "No se pudo registrar la operación")
      toast.success(tipoDevolucion === "CAMBIO" ? `Cambio registrado: crédito C$${Number(payload.creditoGenerado).toFixed(2)}` : `Devolución registrada por C$${Number(payload.total).toFixed(2)}`)
      setDevolucionVenta(null)
      setSelectedVenta(null)
      await refrescarVentas()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar la operación")
    } finally {
      setProcesandoDevolucion(false)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-primary" />
              Historial de Ventas
            </h1>
            <p className="text-muted-foreground mt-1">Consulta el historial completo de ventas en zona horaria de Nicaragua</p>
          </div>

          <Card className="glass-card p-4 mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  Rango de fecha (Nicaragua)
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "todos", label: "Todos" },
                    { id: "hoy", label: "Hoy" },
                    { id: "ayer", label: "Ayer" },
                    { id: "semana", label: "Últimos 7 días" },
                    { id: "mes", label: "Este mes" },
                    { id: "custom", label: "Personalizado" },
                  ].map((p) => (
                    <Button
                      key={p.id}
                      variant={preset === p.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPreset(p.id)}
                      className="text-xs"
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>

              {preset === "custom" && (
                <div className="flex flex-col sm:flex-row gap-4 items-end bg-muted/20 p-4 rounded-xl border border-border">
                  <div className="flex-1 w-full">
                    <label className="block text-xs text-muted-foreground mb-1">Desde</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs text-muted-foreground mb-1">Hasta</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                  <Button
                    onClick={handleApplyCustomFilter}
                    disabled={!startDate || !endDate}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Filtrar
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Card className="glass-card overflow-hidden mb-6">
            {loading ? (
              <div className="p-8 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center" role="alert">
                <div className="rounded-full border border-red-500/30 bg-red-500/10 p-3 text-red-400">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">No se pudo cargar el historial</p>
                  <p className="mt-1 max-w-lg text-sm text-muted-foreground">{loadError}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchVentas(startDate || undefined, endDate || undefined)}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reintentar
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      {["ID", "Fecha (Local)", "Cliente", "Items", "Pago", "Total", "Estado", "Ver"].map(h => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ventas.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground text-sm">
                          <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                          <p className="font-medium text-foreground">No hay ventas en este período</p>
                          <p className="mt-1">Prueba otro rango o inicia una nueva venta.</p>
                          <div className="mt-4 flex justify-center gap-2"><Button size="sm" variant="outline" onClick={() => setPreset("todos")}>Ver todas</Button><Button size="sm" onClick={() => window.location.assign("/ventas/nueva")}>Nueva venta</Button></div>
                        </td>
                      </tr>
                    ) : (
                      ventas.map(v => (
                        <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold text-primary">#{v.id}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {new Date(v.fecha).toLocaleDateString("es-NI", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-foreground">{v.cliente?.nombreCompleto || "Sin cliente"}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{v.detalles.length}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              {v.metodoPago}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-foreground">C${Number.parseFloat(v.total).toFixed(2)}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              v.estado === "ANULADA"
                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                : v.estadoEntrega === "LISTO_PARA_RETIRAR"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            }`}>
                              {v.estado === "ANULADA" ? "ANULADA" : v.estadoEntrega === "LISTO_PARA_RETIRAR" ? "LISTO PARA RETIRAR" : "ENTREGADA"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Button size="sm" variant="ghost" onClick={() => setSelectedVenta(v)} className="text-muted-foreground hover:text-foreground">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {selectedVenta && (
            <Card className="glass-card p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Venta #{selectedVenta.id}</h2>
                  <p className="text-muted-foreground text-sm">
                    {new Date(selectedVenta.fecha).toLocaleDateString("es-NI", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedVenta(null)}><X className="w-5 h-5" /></Button>
              </div>
              <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-3">
                <div><p className="text-xs text-muted-foreground uppercase mb-1">Cliente</p><p className="font-medium text-foreground">{selectedVenta.cliente?.nombreCompleto || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase mb-1">Pago</p><p className="font-medium text-foreground">{selectedVenta.metodoPago}</p></div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Entrega</p>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    selectedVenta.estado === "ANULADA"
                      ? "bg-red-500/10 text-red-500 border-red-500/20"
                      : selectedVenta.estadoEntrega === "LISTO_PARA_RETIRAR"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  }`}>
                    {selectedVenta.estado === "ANULADA" ? "ANULADA" : selectedVenta.estadoEntrega === "LISTO_PARA_RETIRAR" ? "LISTO PARA RETIRAR" : "ENTREGADA"}
                  </span>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-xs text-muted-foreground">Producto</th>
                      <th className="text-right py-2 text-xs text-muted-foreground">Cant</th>
                      <th className="text-right py-2 text-xs text-muted-foreground">Precio</th>
                      <th className="text-right py-2 text-xs text-muted-foreground">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVenta.detalles.map((d) => (
                      <tr key={d.id} className="border-b border-border/50">
                        <td className="py-2 text-foreground">{d.producto.nombre}</td>
                        <td className="text-right text-foreground">{d.cantidad} {d.tipoUnidad?.toLowerCase()}</td>
                        <td className="text-right text-muted-foreground">C${Number.parseFloat(d.precioUnitario).toFixed(2)}</td>
                        <td className="text-right font-medium text-foreground">C${(d.cantidad * Number.parseFloat(d.precioUnitario)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-6 pt-4 border-t border-border flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                  <div className="flex flex-wrap gap-2">
                    {selectedVenta.estado !== "ANULADA" && selectedVenta.estadoEntrega !== "LISTO_PARA_RETIRAR" && (
                      <Button variant="outline" onClick={() => actualizarEntrega(selectedVenta, "MARCAR_LISTO")} className="gap-2 border-amber-500/30 text-amber-400"><Clock3 className="h-4 w-4" /> Listo para retirar</Button>
                    )}
                    {selectedVenta.estado !== "ANULADA" && selectedVenta.estadoEntrega === "LISTO_PARA_RETIRAR" && (
                      <Button variant="outline" onClick={() => actualizarEntrega(selectedVenta, "MARCAR_ENTREGADA")} className="gap-2 border-emerald-500/30 text-emerald-400"><PackageCheck className="h-4 w-4" /> Marcar entregada</Button>
                    )}
                    {selectedVenta.estado !== "ANULADA" && selectedVenta.detalles.some((detalle) => cantidadDisponible(selectedVenta, detalle.id, detalle.cantidad) > 0) && (
                      <>
                        <Button variant="outline" onClick={() => abrirDevolucion(selectedVenta, "DEVOLUCION")} className="gap-2"><RotateCcw className="h-4 w-4" /> Devolución</Button>
                        <Button variant="outline" onClick={() => abrirDevolucion(selectedVenta, "CAMBIO")} className="gap-2"><ArrowLeftRight className="h-4 w-4" /> Cambio</Button>
                      </>
                    )}
                    {isAdmin && selectedVenta.estado !== "ANULADA" && (
                      <Button
                        onClick={() => handleAnularVenta(selectedVenta.id)}
                        variant="outline"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        disabled={anulando}
                      >
                        {anulando ? "Anulando..." : "Anular Venta"}
                      </Button>
                    )}
                  </div>
                  <p className="text-lg font-bold">Total: <span className="text-primary">C${Number.parseFloat(selectedVenta.total).toFixed(2)}</span></p>
                </div>
              </div>
            </Card>
          )}

          <Dialog open={Boolean(devolucionVenta)} onOpenChange={(open) => !open && setDevolucionVenta(null)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{tipoDevolucion === "CAMBIO" ? "Registrar cambio" : "Registrar devolución"}</DialogTitle>
                <DialogDescription>
                  Venta #{devolucionVenta?.id}. El importe se calcula proporcionalmente al total neto pagado.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  {devolucionVenta?.detalles.map((detalle) => {
                    const disponible = cantidadDisponible(devolucionVenta, detalle.id, detalle.cantidad)
                    return (
                      <div key={detalle.id} className="grid grid-cols-[minmax(0,1fr)_90px] items-center gap-3 rounded-xl border border-border p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{detalle.producto.nombre}</p>
                          <p className="text-xs text-muted-foreground">Disponible para devolver: {disponible} {detalle.tipoUnidad?.toLowerCase()}</p>
                        </div>
                        <Input
                          aria-label={`Cantidad de ${detalle.producto.nombre}`}
                          type="number"
                          min="0"
                          max={disponible}
                          disabled={disponible === 0}
                          value={cantidadesDevolucion[detalle.id] || ""}
                          onChange={(event) => setCantidadesDevolucion((current) => ({ ...current, [detalle.id]: Math.min(disponible, Math.max(0, Number(event.target.value))) }))}
                        />
                      </div>
                    )
                  })}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Motivo</label>
                  <select value={motivoDevolucion} onChange={(event) => setMotivoDevolucion(event.target.value)} className="w-full rounded-lg border border-border bg-muted/30 p-2.5 text-sm text-foreground">
                    <option value="PRODUCTO_INCORRECTO">Producto incorrecto</option>
                    <option value="DEFECTUOSO">Producto defectuoso</option>
                    <option value="REACCION_ADVERSA">Reacción adversa</option>
                    <option value="ERROR_COBRO">Error de cobro</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Observación</label>
                  <Input value={observacionDevolucion} onChange={(event) => setObservacionDevolucion(event.target.value)} placeholder="Detalle opcional" />
                </div>
                {isAdmin && (
                  <label className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-foreground">
                    <input type="checkbox" checked={reintegrarStock} onChange={(event) => setReintegrarStock(event.target.checked)} className="mt-0.5" />
                    <span><strong>Reintegrar al inventario.</strong> Úsalo solo después de comprobar que el producto conserva condiciones de venta. Un lote vencido seguirá bloqueado.</span>
                  </label>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDevolucionVenta(null)}>Cancelar</Button>
                <Button onClick={registrarDevolucion} disabled={procesandoDevolucion}>
                  {procesandoDevolucion ? "Procesando..." : tipoDevolucion === "CAMBIO" ? "Generar crédito de cambio" : "Confirmar devolución"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  )
}
