export interface LoteFEFO {
  id: number
  stockActual: number
  fechaVencimiento: Date | string | null
  createdAt: Date | string
}
export interface AsignacionLote {
  idLote: number
  cantidad: number
  esExcepcion: boolean
}

const timestamp = (value: Date | string) => new Date(value).getTime()

export function esLoteVigente(lote: LoteFEFO, ahora = new Date()): boolean {
  return lote.stockActual > 0 && (!lote.fechaVencimiento || timestamp(lote.fechaVencimiento) > ahora.getTime())
}

export function ordenarLotesFEFO<T extends LoteFEFO>(lotes: T[], ahora = new Date()): T[] {
  return lotes
    .filter((lote) => esLoteVigente(lote, ahora))
    .sort((a, b) => {
      if (a.fechaVencimiento && b.fechaVencimiento) {
        const diferencia = timestamp(a.fechaVencimiento) - timestamp(b.fechaVencimiento)
        if (diferencia !== 0) return diferencia
      } else if (a.fechaVencimiento) return -1
      else if (b.fechaVencimiento) return 1
      return timestamp(a.createdAt) - timestamp(b.createdAt)
    })
}

export function asignarLotesFEFO(
  lotes: LoteFEFO[],
  cantidad: number,
  ahora = new Date(),
  idLotePreferido?: number | null,
): AsignacionLote[] {
  if (!Number.isInteger(cantidad) || cantidad <= 0) throw new Error("La cantidad debe ser un entero positivo")

  const ordenados = ordenarLotesFEFO(lotes, ahora)
  if (idLotePreferido) {
    const preferido = ordenados.find((lote) => lote.id === idLotePreferido)
    if (!preferido) throw new Error("El lote seleccionado no está vigente o no tiene existencias")
    ordenados.splice(ordenados.indexOf(preferido), 1)
    ordenados.unshift(preferido)
  }

  let pendiente = cantidad
  const resultado: AsignacionLote[] = []
  for (const lote of ordenados) {
    if (pendiente === 0) break
    const asignada = Math.min(pendiente, lote.stockActual)
    resultado.push({ idLote: lote.id, cantidad: asignada, esExcepcion: Boolean(idLotePreferido && lote.id === idLotePreferido) })
    pendiente -= asignada
  }
  if (pendiente > 0) throw new Error("Stock vigente insuficiente en lotes")
  return resultado
}
