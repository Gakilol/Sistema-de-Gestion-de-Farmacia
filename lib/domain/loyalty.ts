export type NivelFidelidad = "BRONCE" | "PLATA" | "ORO"

export function nivelPorPuntos(puntos: number): NivelFidelidad {
  if (puntos >= 1500) return "ORO"
  if (puntos >= 500) return "PLATA"
  return "BRONCE"
}

export function tasaDescuentoNivel(nivel: string) {
  if (nivel === "ORO") return 0.05
  if (nivel === "PLATA") return 0.03
  return 0
}

export function calcularBeneficiosVenta(input: { subtotalTrasPromocion: number; nivel: string; saldoDisponible: number; aplicarSaldo: boolean }) {
  const descuentoFidelizacion = Math.round(input.subtotalTrasPromocion * tasaDescuentoNivel(input.nivel) * 100) / 100
  const trasDescuento = Math.max(0, input.subtotalTrasPromocion - descuentoFidelizacion)
  const saldoAplicado = input.aplicarSaldo ? Math.round(Math.min(Math.max(0, input.saldoDisponible), trasDescuento) * 100) / 100 : 0
  const total = Math.max(0, Math.round((trasDescuento - saldoAplicado) * 100) / 100)
  const puntosGanados = Math.floor(total / 10)
  return { descuentoFidelizacion, saldoAplicado, puntosGanados, total }
}
