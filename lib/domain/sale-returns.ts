export interface AsignacionVentaLote {
  idLote: number
  cantidad: number
}

export interface ReintegroLote {
  idLote: number
  cantidad: number
}

export function factorUnidadVenta(tipoUnidad: string, unidadesPorBlister?: number | null, unidadesPorCaja?: number | null) {
  if (tipoUnidad === "BLISTER") return unidadesPorBlister || 1
  if (tipoUnidad === "CAJA") return unidadesPorCaja || 1
  return 1
}

export function validarCantidadDevolucion(cantidadVendida: number, cantidadDevuelta: number, cantidadNueva: number) {
  if (!Number.isInteger(cantidadNueva) || cantidadNueva <= 0) throw new Error("La cantidad a devolver debe ser un entero mayor a cero")
  if (cantidadDevuelta + cantidadNueva > cantidadVendida) throw new Error("La devolución supera la cantidad disponible de la venta")
}

export function asignarReintegroALotes(
  asignaciones: AsignacionVentaLote[],
  cantidadBaseDevueltaAntes: number,
  cantidadBaseNueva: number,
): ReintegroLote[] {
  if (cantidadBaseNueva <= 0) return []
  let saltar = Math.max(0, cantidadBaseDevueltaAntes)
  let pendiente = cantidadBaseNueva
  const resultado: ReintegroLote[] = []

  for (const asignacion of asignaciones) {
    if (pendiente <= 0) break
    if (saltar >= asignacion.cantidad) {
      saltar -= asignacion.cantidad
      continue
    }
    const disponible = asignacion.cantidad - saltar
    saltar = 0
    const cantidad = Math.min(disponible, pendiente)
    if (cantidad > 0) resultado.push({ idLote: asignacion.idLote, cantidad })
    pendiente -= cantidad
  }

  if (pendiente > 0) throw new Error("No se pudo reconstruir la asignación original de lotes")
  return resultado
}
