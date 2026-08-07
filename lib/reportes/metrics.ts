export interface ExecutiveMetricInput {
  totalVentas: number
  totalVentasPrevias: number
  ventasCount: number
  totalCompras: number
  comprasCount: number
  cogs: number
  stockBajo: number
}

export function calculateExecutiveMetrics(input: ExecutiveMetricInput) {
  const gananciaNeta = input.totalVentas - input.cogs
  const variacionVentasPct = input.totalVentasPrevias > 0
    ? ((input.totalVentas - input.totalVentasPrevias) / input.totalVentasPrevias) * 100
    : input.totalVentas > 0 ? 100 : 0

  return {
    ...input,
    gananciaNeta,
    margenPct: input.totalVentas > 0 ? (gananciaNeta / input.totalVentas) * 100 : 0,
    ticketPromedio: input.ventasCount > 0 ? input.totalVentas / input.ventasCount : 0,
    transaccionesCount: input.ventasCount + input.comprasCount,
    variacionVentasPct,
  }
}

export function isValidReportRange(startDate: string, endDate: string, maxDays = 366) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  if (!datePattern.test(startDate) || !datePattern.test(endDate)) return false
  const startMs = Date.parse(`${startDate}T00:00:00Z`)
  const endMs = Date.parse(`${endDate}T00:00:00Z`)
  return Number.isFinite(startMs) && Number.isFinite(endMs) && startMs <= endMs && endMs - startMs <= maxDays * 86_400_000
}
