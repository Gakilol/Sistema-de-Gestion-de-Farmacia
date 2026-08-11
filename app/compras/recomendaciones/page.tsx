"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { AlertTriangle, ArrowRight, Check, CheckCircle2, ClipboardCheck, Clock3, PackageCheck, RefreshCw, ShoppingCart, Sparkles, Truck } from "lucide-react"
import { toast } from "sonner"

import { useCurrentUser } from "@/app/hooks/useCurrentUser"
import { Sidebar } from "@/components/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || "No se pudo cargar la información")
  return data
}

const money = (value: unknown) => `C$${Number(value || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const estadoMeta: Record<string, { label: string; className: string }> = {
  BORRADOR: { label: "Borrador", className: "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  APROBADA: { label: "Aprobada", className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  PARCIAL: { label: "Recepción parcial", className: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  RECIBIDA: { label: "Recibida", className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  CANCELADA: { label: "Cancelada", className: "border-border bg-muted text-muted-foreground" },
}

type Seleccion = Record<number, { activa: boolean; cantidad: number; idProveedor: number | null }>
type RecepcionLinea = Record<number, { activa: boolean; cantidad: number; lote: string; fechaVencimiento: string }>

export default function RecomendacionesCompraPage() {
  const { user } = useCurrentUser()
  const esAdmin = user?.rolNombre === "ADMIN"
  const { data, error, isLoading, mutate: mutateRecomendaciones } = useSWR(esAdmin ? "/api/compras/recomendaciones" : null, fetcher)
  const { data: ordenesData, error: ordenesError, isLoading: loadingOrdenes, mutate: mutateOrdenes } = useSWR("/api/compras/ordenes", fetcher)
  const [seleccion, setSeleccion] = useState<Seleccion>({})
  const [saving, setSaving] = useState(false)
  const [ordenRecepcion, setOrdenRecepcion] = useState<any | null>(null)
  const [recepcion, setRecepcion] = useState<RecepcionLinea>({})
  const [numeroFactura, setNumeroFactura] = useState("")
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    if (!data?.recomendaciones) return
    setSeleccion((actual) => {
      const siguiente = { ...actual }
      for (const item of data.recomendaciones) {
        if (!siguiente[item.idProducto]) {
          siguiente[item.idProducto] = { activa: false, cantidad: item.cantidadSugerida, idProveedor: item.proveedorSugerido?.id || null }
        }
      }
      return siguiente
    })
  }, [data])

  const seleccionadas = useMemo(() => (data?.recomendaciones || []).filter((item: any) => seleccion[item.idProducto]?.activa), [data, seleccion])
  const totalEstimado = seleccionadas.reduce((sum: number, item: any) => {
    const state = seleccion[item.idProducto]
    const proveedor = item.proveedores.find((p: any) => p.id === state?.idProveedor)
    return sum + Number(state?.cantidad || 0) * Number(proveedor?.ultimoCosto || 0)
  }, 0)

  const crearBorradores = async () => {
    if (!seleccionadas.length) return toast.error("Selecciona al menos un producto")
    const sinProveedor = seleccionadas.find((item: any) => !seleccion[item.idProducto]?.idProveedor)
    if (sinProveedor) return toast.error(`${sinProveedor.producto} no tiene proveedor seleccionado`)
    setSaving(true)
    try {
      const lineas = seleccionadas.map((item: any) => {
        const state = seleccion[item.idProducto]
        const proveedor = item.proveedores.find((p: any) => p.id === state.idProveedor)
        return { idProducto: item.idProducto, idProveedor: state.idProveedor, cantidad: state.cantidad, costoUnitario: proveedor.ultimoCosto }
      })
      const response = await fetch("/api/compras/ordenes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lineas }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "No se pudieron crear los borradores")
      toast.success(result.totalCreadas === 1 ? "Borrador de orden creado" : `${result.totalCreadas} borradores creados por proveedor`)
      setSeleccion((actual) => Object.fromEntries(Object.entries(actual).map(([id, item]) => [id, { ...item, activa: false }])))
      await mutateOrdenes()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudieron crear los borradores")
    } finally { setSaving(false) }
  }

  const ejecutarAccion = async (orden: any, accion: "APROBAR" | "CANCELAR") => {
    try {
      const response = await fetch(`/api/compras/ordenes/${orden.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "No se pudo actualizar la orden")
      toast.success(accion === "APROBAR" ? `${orden.codigo} aprobada` : `${orden.codigo} cancelada`)
      await mutateOrdenes()
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "No se pudo actualizar la orden") }
  }

  const abrirRecepcion = (orden: any) => {
    const lineas: RecepcionLinea = {}
    for (const detalle of orden.detalles) {
      const pendiente = detalle.cantidadSolicitada - detalle.cantidadRecibida
      if (pendiente > 0) lineas[detalle.id] = { activa: true, cantidad: pendiente, lote: "", fechaVencimiento: "" }
    }
    setRecepcion(lineas)
    setNumeroFactura("")
    setFechaCompra(new Date().toISOString().slice(0, 10))
    setOrdenRecepcion(orden)
  }

  const registrarRecepcion = async () => {
    if (!ordenRecepcion) return
    const detalles = Object.entries(recepcion).filter(([, linea]) => linea.activa).map(([id, linea]) => ({ idDetalleOrden: Number(id), cantidad: Number(linea.cantidad), lote: linea.lote, fechaVencimiento: linea.fechaVencimiento }))
    if (!detalles.length) return toast.error("Selecciona al menos una línea para recibir")
    if (detalles.some((detalle) => !detalle.lote.trim() || !detalle.fechaVencimiento)) return toast.error("Completa lote y vencimiento en cada línea seleccionada")
    setSaving(true)
    try {
      const response = await fetch(`/api/compras/ordenes/${ordenRecepcion.id}/recepciones`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ numeroFactura: numeroFactura || null, fechaCompra, detalles }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "No se pudo registrar la recepción")
      toast.success(result.orden.estado === "RECIBIDA" ? "Orden recibida completamente" : "Recepción parcial registrada")
      setOrdenRecepcion(null)
      await Promise.all([mutateOrdenes(), mutateRecomendaciones()])
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "No se pudo registrar la recepción") }
    finally { setSaving(false) }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 pt-16 md:p-8">
        <div className="mx-auto max-w-[1500px] space-y-8">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary"><Sparkles className="size-4" /> Abastecimiento proactivo</div>
              <h1 className="text-3xl font-bold tracking-tight">Compras inteligentes</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Convierte la demanda y el stock disponible en órdenes controladas: borrador, aprobación y recepción trazable.</p>
            </div>
            {esAdmin && <Button onClick={crearBorradores} disabled={saving || !seleccionadas.length} size="lg"><ShoppingCart className="size-4" />Crear borrador{seleccionadas.length > 1 ? "es" : ""}<span className="rounded bg-primary-foreground/15 px-1.5 py-0.5 text-xs">{seleccionadas.length}</span></Button>}
          </header>

          {esAdmin && (
            <section aria-labelledby="sugerencias-title">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div><h2 id="sugerencias-title" className="text-xl font-semibold">Sugerencias para reponer</h2><p className="text-sm text-muted-foreground">Selecciona productos, ajusta cantidad y confirma el proveedor sugerido.</p></div>
                {!!seleccionadas.length && <p className="text-sm"><span className="text-muted-foreground">Estimado:</span> <strong>{money(totalEstimado)}</strong></p>}
              </div>
              {error ? <Card className="border-red-500/25 p-5 text-sm text-red-600">{error.message}</Card> : isLoading ? <div className="grid gap-3 lg:grid-cols-2">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-40 rounded-2xl" />)}</div> : !data?.recomendaciones?.length ? (
                <Card className="p-10 text-center"><CheckCircle2 className="mx-auto size-10 text-emerald-600" /><h3 className="mt-3 font-semibold">No hay reposiciones sugeridas</h3><p className="mt-1 text-sm text-muted-foreground">El inventario útil cubre la demanda y los mínimos actuales.</p></Card>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {data.recomendaciones.map((item: any) => {
                    const state = seleccion[item.idProducto] || { activa: false, cantidad: item.cantidadSugerida, idProveedor: item.proveedorSugerido?.id || null }
                    const proveedor = item.proveedores.find((p: any) => p.id === state.idProveedor)
                    return (
                      <Card key={item.idProducto} className={`p-5 transition-colors ${state.activa ? "border-primary/45 bg-primary/[0.035]" : "border-border"}`}>
                        <div className="flex gap-3">
                          <Checkbox checked={state.activa} onCheckedChange={(checked) => setSeleccion((actual) => ({ ...actual, [item.idProducto]: { ...state, activa: checked === true } }))} aria-label={`Seleccionar ${item.producto}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{item.producto}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.explicacion}</p></div><div className="text-right"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sugerido</p><p className="text-xl font-bold text-primary">{item.cantidadSugerida} u.</p></div></div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_110px]">
                              <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Proveedor · último costo</label><select value={state.idProveedor || ""} onChange={(event) => setSeleccion((actual) => ({ ...actual, [item.idProducto]: { ...state, idProveedor: Number(event.target.value) || null } }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Sin proveedor</option>{item.proveedores.map((p: any) => <option key={p.id} value={p.id}>{p.nombre} · {money(p.ultimoCosto)}</option>)}</select></div>
                              <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Cantidad</label><Input type="number" min={1} value={state.cantidad} onChange={(event) => setSeleccion((actual) => ({ ...actual, [item.idProducto]: { ...state, cantidad: Math.max(1, Number(event.target.value) || 1) } }))} /></div>
                            </div>
                            {proveedor && <p className="mt-2 text-right text-xs text-muted-foreground">Subtotal estimado: <strong className="text-foreground">{money(proveedor.ultimoCosto * state.cantidad)}</strong></p>}
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {esAdmin && data?.accionesLiquidacion?.length > 0 && (
            <section aria-labelledby="liquidacion-title">
              <div className="mb-3"><h2 id="liquidacion-title" className="flex items-center gap-2 text-xl font-semibold"><AlertTriangle className="h-5 w-5 text-amber-400" /> Acciones para evitar vencimientos</h2><p className="text-sm text-muted-foreground">Prioriza lotes FEFO y sugiere una liquidación proporcional al tiempo restante.</p></div>
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{data.accionesLiquidacion.map((item: any) => <Card key={item.idLote} className="border-amber-500/20 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.producto}</p><p className="mt-1 text-xs text-muted-foreground">Lote {item.codigoLote} · {item.unidades} u. · vence en {item.venceEnDias} días</p></div><Badge variant="outline" className="border-amber-500/25 bg-amber-500/10 text-amber-400">-{item.descuentoSugerido}%</Badge></div><div className="mt-3 rounded-lg bg-muted/30 p-3 text-xs"><p className="font-medium text-foreground">{item.accion}</p><p className="mt-1 text-muted-foreground">Precio sugerido: <strong className="text-foreground">{money(item.precioLiquidacion)}</strong></p></div></Card>)}</div>
            </section>
          )}

          <section aria-labelledby="ordenes-title">
            <div className="mb-3 flex items-center justify-between"><div><h2 id="ordenes-title" className="text-xl font-semibold">Órdenes de compra</h2><p className="text-sm text-muted-foreground">Seguimiento desde el borrador hasta la recepción final.</p></div><Button variant="outline" size="sm" onClick={() => mutateOrdenes()}><RefreshCw className="size-4" />Actualizar</Button></div>
            {ordenesError ? <Card className="border-red-500/25 p-5 text-sm text-red-600">{ordenesError.message}</Card> : loadingOrdenes ? <Skeleton className="h-60 rounded-2xl" /> : !ordenesData?.ordenes?.length ? (
              <Card className="p-10 text-center"><ClipboardCheck className="mx-auto size-10 text-muted-foreground/50" /><h3 className="mt-3 font-semibold">Aún no hay órdenes</h3><p className="mt-1 text-sm text-muted-foreground">Selecciona sugerencias para crear el primer borrador.</p></Card>
            ) : <div className="space-y-3">{ordenesData.ordenes.map((orden: any) => {
              const meta = estadoMeta[orden.estado] || estadoMeta.BORRADOR
              const solicitadas = orden.detalles.reduce((sum: number, detalle: any) => sum + detalle.cantidadSolicitada, 0)
              const recibidas = orden.detalles.reduce((sum: number, detalle: any) => sum + detalle.cantidadRecibida, 0)
              return <Card key={orden.id} className="overflow-hidden"><div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{orden.codigo}</h3><Badge variant="outline" className={meta.className}>{meta.label}</Badge></div><p className="mt-1 text-sm text-muted-foreground"><Truck className="mr-1 inline size-3.5" />{orden.proveedor.nombre} · {orden.detalles.length} productos</p><p className="mt-2 text-xs text-muted-foreground">Creada por {orden.creadoPor.nombreCompleto} · {new Date(orden.createdAt).toLocaleDateString("es-NI")}</p></div><div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Recepción</span><strong>{recibidas} / {solicitadas} u.</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${solicitadas ? (recibidas / solicitadas) * 100 : 0}%` }} /></div><p className="mt-2 text-sm"><span className="text-muted-foreground">Estimado:</span> <strong>{money(orden.totalEstimado)}</strong></p></div><div className="flex flex-wrap gap-2 lg:justify-end">{esAdmin && orden.estado === "BORRADOR" && <><Button size="sm" onClick={() => ejecutarAccion(orden, "APROBAR")}><Check className="size-4" />Aprobar</Button><Button size="sm" variant="ghost" onClick={() => ejecutarAccion(orden, "CANCELAR")}>Cancelar</Button></>}{["APROBADA", "PARCIAL"].includes(orden.estado) && <Button size="sm" onClick={() => abrirRecepcion(orden)}><PackageCheck className="size-4" />Recibir</Button>}{orden.estado === "RECIBIDA" && <span className="flex items-center gap-1 text-sm font-medium text-emerald-700"><CheckCircle2 className="size-4" />Completa</span>}</div></div><div className="border-t border-border bg-muted/20 px-5 py-3"><details><summary className="cursor-pointer text-xs font-medium text-muted-foreground">Ver productos y recepciones</summary><div className="mt-3 grid gap-2 md:grid-cols-2">{orden.detalles.map((detalle: any) => <div key={detalle.id} className="flex justify-between rounded-lg border bg-background px-3 py-2 text-xs"><span className="font-medium">{detalle.producto.nombre}</span><span className="text-muted-foreground">{detalle.cantidadRecibida}/{detalle.cantidadSolicitada} · {money(detalle.costoUnitario)}</span></div>)}</div></details></div></Card>
            })}</div>}
          </section>
        </div>
      </main>

      <Dialog open={!!ordenRecepcion} onOpenChange={(open) => !open && setOrdenRecepcion(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>Recibir {ordenRecepcion?.codigo}</DialogTitle><DialogDescription>Registra una parte o el total pendiente. Cada lote actualiza stock y kardex de forma atómica.</DialogDescription></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-sm font-medium">Factura (opcional)</label><Input value={numeroFactura} onChange={(event) => setNumeroFactura(event.target.value)} placeholder="Número de factura" /></div><div><label className="mb-1 block text-sm font-medium">Fecha de compra</label><Input type="date" value={fechaCompra} onChange={(event) => setFechaCompra(event.target.value)} /></div></div>
          <div className="space-y-3 py-2">{ordenRecepcion?.detalles.filter((detalle: any) => detalle.cantidadRecibida < detalle.cantidadSolicitada).map((detalle: any) => {
            const linea = recepcion[detalle.id]
            const pendiente = detalle.cantidadSolicitada - detalle.cantidadRecibida
            if (!linea) return null
            return <div key={detalle.id} className={`rounded-xl border p-4 ${linea.activa ? "border-primary/30 bg-primary/[0.025]" : "border-border opacity-70"}`}><div className="mb-3 flex items-center gap-3"><Checkbox checked={linea.activa} onCheckedChange={(checked) => setRecepcion((actual) => ({ ...actual, [detalle.id]: { ...actual[detalle.id], activa: checked === true } }))} /><div className="flex-1"><p className="font-medium">{detalle.producto.nombre}</p><p className="text-xs text-muted-foreground">Pendiente {pendiente} u. · costo {money(detalle.costoUnitario)}</p></div></div><div className="grid gap-3 sm:grid-cols-3"><div><label className="mb-1 block text-xs font-medium text-muted-foreground">Cantidad recibida</label><Input disabled={!linea.activa} type="number" min={1} max={pendiente} value={linea.cantidad} onInput={(event) => { const cantidad = Math.min(pendiente, Math.max(1, Number(event.currentTarget.value) || 1)); setRecepcion((actual) => ({ ...actual, [detalle.id]: { ...actual[detalle.id], cantidad } })) }} /></div><div><label className="mb-1 block text-xs font-medium text-muted-foreground">Código de lote</label><Input disabled={!linea.activa} value={linea.lote} onInput={(event) => { const lote = event.currentTarget.value; setRecepcion((actual) => ({ ...actual, [detalle.id]: { ...actual[detalle.id], lote } })) }} /></div><div><label className="mb-1 block text-xs font-medium text-muted-foreground">Vencimiento</label><Input disabled={!linea.activa} type="date" min={new Date().toISOString().slice(0, 10)} value={linea.fechaVencimiento} onInput={(event) => { const fechaVencimiento = event.currentTarget.value; setRecepcion((actual) => ({ ...actual, [detalle.id]: { ...actual[detalle.id], fechaVencimiento } })) }} /></div></div></div>
          })}</div>
          <DialogFooter><Button variant="outline" onClick={() => setOrdenRecepcion(null)}>Cancelar</Button><Button onClick={registrarRecepcion} disabled={saving}><PackageCheck className="size-4" />{saving ? "Registrando…" : "Registrar recepción"}<ArrowRight className="size-4" /></Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
