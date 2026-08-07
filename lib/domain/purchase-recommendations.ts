export interface DatosCompraProducto {
  id: number
  stockActual: number
  stockMinimo: number | null
  ventas30Dias: number
  unidadesPorVencer: number
}
export function calcularRecomendacionCompra(producto: DatosCompraProducto) {
  const demandaDiaria = producto.ventas30Dias / 30
  const objetivo30Dias = Math.ceil(demandaDiaria * 30)
  const baseMinima = producto.stockMinimo ?? 0
  const stockUtil = Math.max(0, producto.stockActual - producto.unidadesPorVencer)
  const cantidadSugerida = Math.max(0, Math.max(objetivo30Dias, baseMinima) - stockUtil)
  return {
    cantidadSugerida,
    variables: {
      ventas30Dias: producto.ventas30Dias,
      demandaDiaria: Math.round(demandaDiaria * 100) / 100,
      stockActual: producto.stockActual,
      stockMinimo: baseMinima,
      unidadesPorVencer: producto.unidadesPorVencer,
      stockUtil,
      coberturaObjetivoDias: 30,
    },
  }
}
