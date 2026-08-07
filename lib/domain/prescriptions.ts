export const ESTADOS_RECETA = [
  "BORRADOR", "EMITIDA", "EN_PREPARACION", "LISTA", "USADA_PARCIALMENTE",
  "USADA_COMPLETAMENTE", "ANULADA", "VENCIDA",
] as const

export type EstadoReceta = typeof ESTADOS_RECETA[number]

const TRANSICIONES: Record<EstadoReceta, EstadoReceta[]> = {
  BORRADOR: ["EMITIDA", "ANULADA"],
  EMITIDA: ["EN_PREPARACION", "USADA_PARCIALMENTE", "USADA_COMPLETAMENTE", "ANULADA", "VENCIDA"],
  EN_PREPARACION: ["LISTA", "USADA_PARCIALMENTE", "ANULADA", "VENCIDA"],
  LISTA: ["USADA_PARCIALMENTE", "USADA_COMPLETAMENTE", "ANULADA", "VENCIDA"],
  USADA_PARCIALMENTE: ["EN_PREPARACION", "LISTA", "USADA_COMPLETAMENTE", "ANULADA", "VENCIDA"],
  USADA_COMPLETAMENTE: [],
  ANULADA: [],
  VENCIDA: [],
}
export function puedeTransicionarReceta(origen: string, destino: string): boolean {
  if (!ESTADOS_RECETA.includes(origen as EstadoReceta) || !ESTADOS_RECETA.includes(destino as EstadoReceta)) return false
  return TRANSICIONES[origen as EstadoReceta].includes(destino as EstadoReceta)
}

export function estadoDespuesDeSurtir(detalles: Array<{ cantidad: number; cantidadFacturada: number }>): EstadoReceta {
  return detalles.every((d) => d.cantidadFacturada >= d.cantidad) ? "USADA_COMPLETAMENTE" : "USADA_PARCIALMENTE"
}
