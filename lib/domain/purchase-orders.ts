export type EstadoOrdenCompra = "BORRADOR" | "APROBADA" | "PARCIAL" | "RECIBIDA" | "CANCELADA"

export interface LineaOrdenSugerida {
  idProducto: number
  idProveedor: number
  cantidad: number
  costoUnitario: number
}

export interface AvanceRecepcion {
  cantidadSolicitada: number
  cantidadRecibida: number
  cantidadNueva: number
}

export function agruparSugerenciasPorProveedor(lineas: LineaOrdenSugerida[]) {
  const grupos = new Map<number, LineaOrdenSugerida[]>()
  for (const linea of lineas) {
    const actuales = grupos.get(linea.idProveedor) || []
    actuales.push(linea)
    grupos.set(linea.idProveedor, actuales)
  }
  return grupos
}

export function validarRecepcionOrden(avances: AvanceRecepcion[]) {
  if (avances.length === 0) throw new Error("La recepción debe incluir al menos un producto")

  for (const avance of avances) {
    if (!Number.isInteger(avance.cantidadNueva) || avance.cantidadNueva <= 0) {
      throw new Error("La cantidad recibida debe ser un entero mayor a cero")
    }
    if (avance.cantidadRecibida + avance.cantidadNueva > avance.cantidadSolicitada) {
      throw new Error("La recepción supera la cantidad pendiente de la orden")
    }
  }
}

export function estadoTrasRecepcion(avances: AvanceRecepcion[]): EstadoOrdenCompra {
  validarRecepcionOrden(avances)
  return avances.every(
    (avance) => avance.cantidadRecibida + avance.cantidadNueva === avance.cantidadSolicitada,
  )
    ? "RECIBIDA"
    : "PARCIAL"
}

export function puedeAprobarOrden(estado: EstadoOrdenCompra) {
  return estado === "BORRADOR"
}

export function puedeRecibirOrden(estado: EstadoOrdenCompra) {
  return estado === "APROBADA" || estado === "PARCIAL"
}
