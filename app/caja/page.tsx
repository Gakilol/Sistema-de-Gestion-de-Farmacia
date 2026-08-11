"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import {
  Activity,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileClock,
  LockKeyhole,
  MoreVertical,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  ShoppingCart,
  WalletCards,
} from "lucide-react"
import { toast } from "sonner"

import { useCurrentUser } from "@/app/hooks/useCurrentUser"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type MetodoPago = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA"

type VentaCaja = {
  id: number
  fecha: string
  metodoPago: MetodoPago
  total: string | number
  tipoComprobante: string
  usuario?: { nombreCompleto: string }
  cliente?: { nombreCompleto: string } | null
}

type MovimientoCaja = {
  id: number
  tipo: "INGRESO" | "RETIRO" | "GASTO"
  monto: string | number
  concepto: string
  createdAt: string
  usuario?: { nombreCompleto: string }
}

type CajaSesion = {
  id: number
  idUsuario: number
  estado: "ABIERTA" | "CERRADA" | "DIFERENCIA_RESUELTA"
  abiertaEn: string
  cerradaEn?: string | null
  montoInicial: string | number
  montoFinalContado?: string | number | null
  montoEsperado?: string | number | null
  diferencia?: string | number | null
  observacionCierre?: string | null
  usuario: { nombreCompleto: string }
  ventas: VentaCaja[]
  movimientos: MovimientoCaja[]
  resumen: {
    pagos: Record<MetodoPago, number>
    totalVendido: number
    ventasCount: number
    montoEsperadoActual: number
  }
}

type CajaResponse = {
  sesiones: CajaSesion[]
  total: number
  page: number
  pages: number
  ultimaActualizacion: string
}

const fetcher = async (url: string): Promise<CajaResponse> => {
  const response = await fetch(url, { cache: "no-store" })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || "No se pudo actualizar la caja")
  return data
}

const money = (value: unknown) =>
  new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
  })
    .format(Number(value || 0))
    .replace("NIO", "C$")

const dateLabel = (value: string | Date) =>
  new Intl.DateTimeFormat("es-NI", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value))

const timeLabel = (value: string | Date) =>
  new Intl.DateTimeFormat("es-NI", { hour: "numeric", minute: "2-digit" }).format(new Date(value))

const methodMeta: Record<MetodoPago, { label: string; icon: typeof Banknote; color: string; surface: string }> = {
  EFECTIVO: { label: "Efectivo", icon: Banknote, color: "text-emerald-700 dark:text-emerald-300", surface: "bg-emerald-50 dark:bg-emerald-950/35" },
  TARJETA: { label: "Tarjeta", icon: CreditCard, color: "text-blue-700 dark:text-blue-300", surface: "bg-blue-50 dark:bg-blue-950/35" },
  TRANSFERENCIA: { label: "Transferencia", icon: ArrowLeftRight, color: "text-cyan-700 dark:text-cyan-300", surface: "bg-cyan-50 dark:bg-cyan-950/35" },
}

export default function CajaPage() {
  const { user } = useCurrentUser()
  const { data, error, isLoading, mutate } = useSWR<CajaResponse>("/api/caja", fetcher, {
    refreshInterval: 3500,
    revalidateOnFocus: true,
    keepPreviousData: true,
  })
  const [openAmount, setOpenAmount] = useState("")
  const [movementOpen, setMovementOpen] = useState(false)
  const [movementType, setMovementType] = useState<"INGRESO" | "RETIRO" | "GASTO">("GASTO")
  const [movementConcept, setMovementConcept] = useState("")
  const [movementAmount, setMovementAmount] = useState("")
  const [closeOpen, setCloseOpen] = useState(false)
  const [countedAmount, setCountedAmount] = useState("")
  const [closeNote, setCloseNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!("BroadcastChannel" in window)) return
    const channel = new BroadcastChannel("farmapos-caja")
    channel.addEventListener("message", () => mutate())
    return () => channel.close()
  }, [mutate])

  const ownOpenSession = data?.sesiones.find((session) => session.estado === "ABIERTA" && session.idUsuario === user?.id)
  const visibleSession = ownOpenSession || data?.sesiones[0]
  const expected = Number(ownOpenSession?.resumen.montoEsperadoActual || 0)
  const counted = Number(countedAmount || 0)
  const projectedDifference = Math.round((counted - expected) * 100) / 100

  const cashMovements = useMemo(() => {
    if (!ownOpenSession) return []
    const sales = ownOpenSession.ventas.map((sale) => ({
      id: `sale-${sale.id}`,
      date: sale.fecha,
      type: "VENTA" as const,
      description: `Venta #V-${String(sale.id).padStart(4, "0")}`,
      method: sale.metodoPago,
      amount: Number(sale.total),
      user: sale.usuario?.nombreCompleto || ownOpenSession.usuario.nombreCompleto,
    }))
    const movements = ownOpenSession.movimientos.map((movement) => ({
      id: `movement-${movement.id}`,
      date: movement.createdAt,
      type: movement.tipo,
      description: movement.concepto,
      method: null,
      amount: Number(movement.monto),
      user: movement.usuario?.nombreCompleto || ownOpenSession.usuario.nombreCompleto,
    }))
    return [...sales, ...movements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [ownOpenSession])

  const submit = async (method: "POST" | "PATCH", body: Record<string, unknown>, successMessage: string) => {
    setSubmitting(true)
    try {
      const response = await fetch("/api/caja", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "No se pudo completar la operación")
      toast.success(successMessage)
      await mutate()
      return true
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : "No se pudo completar la operación")
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const openRegister = async () => {
    const amount = Number(openAmount)
    if (!Number.isFinite(amount) || amount < 0) return toast.error("Ingresa un monto inicial válido")
    if (await submit("POST", { montoInicial: amount }, "Caja abierta. El seguimiento en vivo ya está activo.")) setOpenAmount("")
  }

  const addMovement = async () => {
    if (!ownOpenSession) return
    const amount = Number(movementAmount)
    if (!movementConcept.trim() || !Number.isFinite(amount) || amount <= 0) return toast.error("Completa el concepto y un monto válido")
    const ok = await submit(
      "PATCH",
      { accion: "MOVIMIENTO", id: ownOpenSession.id, tipo: movementType, concepto: movementConcept.trim(), monto: amount },
      "Movimiento registrado",
    )
    if (ok) {
      setMovementOpen(false)
      setMovementAmount("")
      setMovementConcept("")
    }
  }

  const closeRegister = async () => {
    if (!ownOpenSession) return
    if (!countedAmount || !Number.isFinite(counted) || counted < 0) return toast.error("Ingresa el efectivo contado")
    const ok = await submit(
      "PATCH",
      { accion: "CERRAR", id: ownOpenSession.id, montoFinalContado: counted, observacion: closeNote.trim() || null },
      "Caja cerrada. El reporte del día quedó guardado.",
    )
    if (ok) {
      setCloseOpen(false)
      setCountedAmount("")
      setCloseNote("")
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">Caja</h1>
                {ownOpenSession && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-300">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    En vivo
                  </span>
                )}
              </div>
              <p className="mt-1 text-muted-foreground">Apertura, movimientos y cierre con diferencia auditada.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 no-print">
              <div className="mr-1 hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
                <CalendarDays className="size-4" />
                <span className="capitalize">{dateLabel(new Date())}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isLoading} aria-label="Actualizar caja">
                <RefreshCw className={isLoading ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Actualizar</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!visibleSession}>
                <Printer />
                <span className="hidden sm:inline">Imprimir resumen</span>
              </Button>
            </div>
          </header>

          {error && (
            <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/25 dark:text-red-300">
              <span>{error.message}</span>
              <Button variant="outline" size="sm" onClick={() => mutate()}>Reintentar</Button>
            </div>
          )}

          {!ownOpenSession ? (
            <section id="apertura" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <Card className="glass-card gap-0 overflow-hidden p-0">
                <div className="border-b border-border px-5 py-5 sm:px-7">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/9 text-primary">
                    <LockKeyhole className="size-5" />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold tracking-[-0.02em]">Abrir caja para comenzar</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    Registra el efectivo inicial. Desde ese momento, cada venta se sumará automáticamente al resumen del día.
                  </p>
                </div>
                <div className="px-5 py-5 sm:px-7">
                  <label htmlFor="opening-amount" className="text-sm font-semibold text-foreground">Efectivo inicial</label>
                  <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">C$</span>
                      <Input
                        id="opening-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={openAmount}
                        onChange={(event) => setOpenAmount(event.target.value)}
                        placeholder="0.00"
                        className="pl-10 text-base font-semibold"
                      />
                    </div>
                    <Button onClick={openRegister} disabled={submitting} className="sm:min-w-36">
                      <Banknote />
                      {submitting ? "Abriendo…" : "Abrir caja"}
                    </Button>
                  </div>
                </div>
              </Card>

              <div className="glass-card rounded-xl border border-border p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Al abrir la caja</p>
                <div className="mt-4 space-y-4 text-sm">
                  {[
                    "Las ventas aparecerán en tiempo real.",
                    "Verás el total por efectivo, tarjeta y transferencia.",
                    "El cierre calculará automáticamente cualquier diferencia.",
                  ].map((text) => (
                    <div key={text} className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="leading-5 text-muted-foreground">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <section id="resumen" className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-w-0">
                <div className="border-b border-border pb-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="size-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950" />
                        <h2 className="text-xl font-semibold tracking-[-0.02em]">Caja abierta</h2>
                      </div>
                      <p className="ml-6 mt-1.5 text-sm text-muted-foreground">
                        Abierta a las {timeLabel(ownOpenSession.abiertaEn)} por {ownOpenSession.usuario.nombreCompleto}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setMovementOpen(true)}>
                      <Plus /> Registrar movimiento
                    </Button>
                  </div>

                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <div className="sm:border-r sm:border-border sm:pr-6">
                      <p className="text-sm font-semibold text-muted-foreground">Efectivo esperado en caja</p>
                      <p className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-primary sm:text-4xl">{money(expected)}</p>
                      <p className="mt-1.5 text-sm text-muted-foreground">Se recalcula con cada venta y movimiento.</p>
                    </div>
                    <div className="sm:pl-2">
                      <p className="text-sm font-semibold text-muted-foreground">Total vendido hoy</p>
                      <p className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">{money(ownOpenSession.resumen.totalVendido)}</p>
                      <p className="mt-1.5 text-sm text-muted-foreground">{ownOpenSession.resumen.ventasCount} ventas completadas</p>
                    </div>
                  </div>
                </div>

                <div className="my-6 grid gap-4 rounded-[14px] border border-emerald-200/70 bg-emerald-50/55 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20 sm:grid-cols-[1.2fr_1fr_1fr] sm:items-center">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-white text-primary shadow-sm dark:bg-card">
                      <Activity className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Venta en vivo</p>
                      <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70">Actualización automática cada pocos segundos</p>
                    </div>
                  </div>
                  <div className="border-border sm:border-l sm:pl-5">
                    <p className="text-xs text-muted-foreground">Última venta</p>
                    <p className="mt-0.5 text-base font-semibold">{money(ownOpenSession.ventas[0]?.total || 0)}</p>
                  </div>
                  <div className="border-border sm:border-l sm:pl-5">
                    <p className="text-xs text-muted-foreground">Promedio por venta</p>
                    <p className="mt-0.5 text-base font-semibold">
                      {money(ownOpenSession.resumen.ventasCount ? ownOpenSession.resumen.totalVendido / ownOpenSession.resumen.ventasCount : 0)}
                    </p>
                  </div>
                </div>

                <div id="movimientos" className="scroll-mt-20">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold tracking-[-0.015em]">Movimientos de hoy</h2>
                      <p className="mt-0.5 text-sm text-muted-foreground">Ventas y ajustes registrados en esta caja.</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{cashMovements.length} movimientos</span>
                  </div>
                  <div className="overflow-hidden rounded-[14px] border border-border bg-card">
                    <div className="hidden grid-cols-[90px_60px_minmax(180px,1fr)_150px_120px_150px] gap-3 border-b border-border bg-muted/35 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground lg:grid">
                      <span>Hora</span><span>Tipo</span><span>Descripción</span><span>Método</span><span className="text-right">Monto</span><span>Usuario</span>
                    </div>
                    {cashMovements.length === 0 ? (
                      <div className="flex min-h-44 flex-col items-center justify-center px-5 py-10 text-center">
                        <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground"><ReceiptText className="size-5" /></span>
                        <p className="mt-3 text-sm font-semibold">Todavía no hay movimientos</p>
                        <p className="mt-1 text-xs text-muted-foreground">La primera venta del día aparecerá aquí.</p>
                      </div>
                    ) : (
                      cashMovements.slice(0, 12).map((movement) => {
                        const sale = movement.type === "VENTA"
                        const meta = movement.method ? methodMeta[movement.method] : null
                        const MethodIcon = meta?.icon
                        const negative = movement.type === "GASTO" || movement.type === "RETIRO"
                        return (
                          <div key={movement.id} className="grid gap-2 border-b border-border px-4 py-3 last:border-0 lg:grid-cols-[90px_60px_minmax(180px,1fr)_150px_120px_150px] lg:items-center lg:gap-3">
                            <span className="text-xs font-medium text-muted-foreground lg:text-sm">{timeLabel(movement.date)}</span>
                            <span className="hidden lg:block">
                              {sale ? <ShoppingCart className="size-[18px] text-emerald-600" /> : negative ? <ArrowUpFromLine className="size-[18px] text-amber-600" /> : <ArrowDownToLine className="size-[18px] text-violet-600" />}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{movement.description}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground lg:hidden">{movement.user}</p>
                            </div>
                            <div>
                              {meta && MethodIcon ? (
                                <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${meta.surface} ${meta.color}`}>
                                  <MethodIcon className="size-3.5" /> {meta.label}
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-muted-foreground">{movement.type.toLowerCase()}</span>
                              )}
                            </div>
                            <span className={`text-sm font-semibold lg:text-right ${negative ? "text-red-600" : "text-foreground"}`}>
                              {negative ? "−" : movement.type === "INGRESO" ? "+" : ""}{money(movement.amount)}
                            </span>
                            <span className="hidden truncate text-sm text-muted-foreground lg:block">{movement.user}</span>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              <aside className="min-w-0 2xl:border-l 2xl:border-border 2xl:pl-6">
                <div className="glass-card sticky top-6 rounded-xl border border-border p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Desglose por forma de pago</p>
                      <h2 className="mt-1 text-lg font-semibold">Resumen del día</h2>
                    </div>
                    <WalletCards className="size-5 text-muted-foreground" />
                  </div>

                  <div className="mt-4 divide-y divide-border">
                    {(Object.keys(methodMeta) as MetodoPago[]).map((method) => {
                      const meta = methodMeta[method]
                      const Icon = meta.icon
                      const value = ownOpenSession.resumen.pagos[method] || 0
                      const pct = ownOpenSession.resumen.totalVendido > 0 ? (value / ownOpenSession.resumen.totalVendido) * 100 : 0
                      return (
                        <div key={method} className="flex items-center gap-3 py-3.5 first:pt-1">
                          <span className={`flex size-9 items-center justify-center rounded-xl ${meta.surface} ${meta.color}`}><Icon className="size-[18px]" /></span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{meta.label}</p>
                            <p className="text-xs text-muted-foreground">{pct.toFixed(1)}% de las ventas</p>
                          </div>
                          <span className="text-sm font-semibold tabular-nums">{money(value)}</span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-1 border-y border-border py-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">Total vendido</p>
                        <p className="text-xs text-muted-foreground">{ownOpenSession.resumen.ventasCount} ventas</p>
                      </div>
                      <p className="text-lg font-semibold tabular-nums">{money(ownOpenSession.resumen.totalVendido)}</p>
                    </div>
                  </div>

                  <div className="space-y-3 py-4 text-sm">
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Efectivo de apertura</span><strong>{money(ownOpenSession.montoInicial)}</strong></div>
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Ventas en efectivo</span><strong className="text-emerald-700 dark:text-emerald-300">+{money(ownOpenSession.resumen.pagos.EFECTIVO)}</strong></div>
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Ingresos / salidas</span><strong>{money(expected - Number(ownOpenSession.montoInicial) - ownOpenSession.resumen.pagos.EFECTIVO)}</strong></div>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/25">
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">Efectivo esperado en caja</p>
                    <p className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-emerald-800 dark:text-emerald-200">{money(expected)}</p>
                  </div>

                  <Button className="mt-4 w-full" size="lg" onClick={() => setCloseOpen(true)}>
                    <LockKeyhole /> Hacer corte de caja
                  </Button>
                  <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">Revisa los montos, cuenta el efectivo y cierra la caja del día.</p>
                </div>
              </aside>
            </section>
          )}

          <section id="diferencias-caja" className="mt-10 scroll-mt-20 border-t border-border pt-7">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Historial</p>
                <h2 className="mt-1 text-lg font-semibold">Cierres anteriores</h2>
              </div>
              <span className="text-sm text-muted-foreground">{data?.total || 0} sesiones</span>
            </div>
            <div className="overflow-hidden rounded-[14px] border border-border bg-card">
              {!data?.sesiones?.length ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">No hay sesiones de caja registradas.</div>
              ) : (
                data.sesiones.slice(0, 8).map((session) => (
                  <div key={session.id} className="grid gap-3 border-b border-border px-4 py-4 last:border-0 md:grid-cols-[minmax(180px,1.2fr)_repeat(4,minmax(110px,0.8fr))_auto] md:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileClock className="size-4 text-muted-foreground" />
                        <p className="text-sm font-semibold">Caja #{session.id} · {session.usuario.nombreCompleto}</p>
                      </div>
                      <p className="mt-1 text-xs capitalize text-muted-foreground">{dateLabel(session.abiertaEn)} · {session.estado.toLowerCase().replaceAll("_", " ")}</p>
                    </div>
                    <div><p className="text-xs text-muted-foreground">Efectivo</p><p className="mt-0.5 text-sm font-semibold">{money(session.resumen.pagos.EFECTIVO)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Tarjeta</p><p className="mt-0.5 text-sm font-semibold">{money(session.resumen.pagos.TARJETA)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Transferencia</p><p className="mt-0.5 text-sm font-semibold">{money(session.resumen.pagos.TRANSFERENCIA)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Esperado</p><p className="mt-0.5 text-sm font-semibold">{money(session.resumen.montoEsperadoActual)}</p></div>
                    <div className="flex items-center justify-between gap-2 md:justify-end">
                      {session.estado !== "ABIERTA" && (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${Number(session.diferencia || 0) === 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"}`}>
                          Dif. {money(session.diferencia || 0)}
                        </span>
                      )}
                      {user?.rolNombre === "ADMIN" && session.estado === "CERRADA" && Number(session.diferencia) !== 0 && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Resolver diferencia"
                          onClick={async () => {
                            const resolution = window.prompt("Describe cómo se resolvió la diferencia")
                            if (resolution) await submit("PATCH", { accion: "RESOLVER", id: session.id, resolucion: resolution }, "Diferencia resuelta")
                          }}
                        >
                          <MoreVertical />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar movimiento</DialogTitle>
            <DialogDescription>Agrega un ingreso, retiro o gasto manual a la caja abierta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label htmlFor="movement-type" className="text-sm font-semibold">Tipo</label>
              <select id="movement-type" value={movementType} onChange={(event) => setMovementType(event.target.value as typeof movementType)} className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/20">
                <option value="INGRESO">Ingreso de efectivo</option>
                <option value="RETIRO">Retiro de efectivo</option>
                <option value="GASTO">Gasto</option>
              </select>
            </div>
            <div>
              <label htmlFor="movement-concept" className="text-sm font-semibold">Concepto</label>
              <Input id="movement-concept" className="mt-2" value={movementConcept} onChange={(event) => setMovementConcept(event.target.value)} placeholder="Ej. pago de mensajería" />
            </div>
            <div>
              <label htmlFor="movement-amount" className="text-sm font-semibold">Monto</label>
              <Input id="movement-amount" className="mt-2" type="number" min="0.01" step="0.01" value={movementAmount} onChange={(event) => setMovementAmount(event.target.value)} placeholder="C$ 0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementOpen(false)}>Cancelar</Button>
            <Button onClick={addMovement} disabled={submitting}>{submitting ? "Guardando…" : "Registrar movimiento"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Corte y cierre de caja</DialogTitle>
            <DialogDescription>Cuenta solamente el efectivo físico. Tarjetas y transferencias ya están conciliadas por separado.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 rounded-xl border border-border bg-muted/35 p-4 sm:grid-cols-3">
            <div><p className="text-xs text-muted-foreground">Efectivo esperado</p><p className="mt-1 text-base font-semibold">{money(expected)}</p></div>
            <div><p className="text-xs text-muted-foreground">Tarjeta</p><p className="mt-1 text-base font-semibold">{money(ownOpenSession?.resumen.pagos.TARJETA || 0)}</p></div>
            <div><p className="text-xs text-muted-foreground">Transferencia</p><p className="mt-1 text-base font-semibold">{money(ownOpenSession?.resumen.pagos.TRANSFERENCIA || 0)}</p></div>
          </div>
          <div className="space-y-4 py-1">
            <div>
              <label htmlFor="counted-amount" className="text-sm font-semibold">Efectivo contado</label>
              <Input id="counted-amount" className="mt-2 text-base font-semibold" type="number" min="0" step="0.01" value={countedAmount} onChange={(event) => setCountedAmount(event.target.value)} placeholder="C$ 0.00" />
            </div>
            <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${!countedAmount ? "bg-muted" : projectedDifference === 0 ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200" : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"}`}>
              <span className="text-sm font-semibold">Diferencia</span>
              <strong>{money(projectedDifference)}</strong>
            </div>
            <div>
              <label htmlFor="close-note" className="text-sm font-semibold">Observación (opcional)</label>
              <textarea id="close-note" value={closeNote} onChange={(event) => setCloseNote(event.target.value)} placeholder="Agrega una nota para el cierre" className="mt-2 min-h-20 w-full resize-y rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/20" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>Seguir revisando</Button>
            <Button onClick={closeRegister} disabled={submitting}><CircleDollarSign />{submitting ? "Cerrando…" : "Confirmar cierre"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
