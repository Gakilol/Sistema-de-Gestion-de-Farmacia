export type MovimientoCajaCalculo = { tipo: "INGRESO" | "RETIRO" | "GASTO"; monto: number }

export function calcularCierreCaja(
  montoInicial: number,
  ventasEfectivo: number,
  movimientos: MovimientoCajaCalculo[],
  montoFinalContado: number,
) {
  const otrosIngresos = movimientos.filter((m) => m.tipo === "INGRESO").reduce((s, m) => s + m.monto, 0)
  const salidas = movimientos.filter((m) => m.tipo === "RETIRO" || m.tipo === "GASTO").reduce((s, m) => s + m.monto, 0)
  const montoEsperado = montoInicial + ventasEfectivo + otrosIngresos - salidas
  return {
    montoEsperado: Math.round(montoEsperado * 100) / 100,
    diferencia: Math.round((montoFinalContado - montoEsperado) * 100) / 100,
  }
}
