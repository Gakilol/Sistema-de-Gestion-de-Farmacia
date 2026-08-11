export interface DatosCompraProducto {
  id: number
  stockActual: number
  stockMinimo: number | null
  ventas30Dias: number
  unidadesPorVencer: number
  ventas90Dias?: number
  tiempoEntregaDias?: number
  margenPorcentaje?: number
}
export function calcularRecomendacionCompra(producto: DatosCompraProducto) {
  const demandaReciente = producto.ventas30Dias / 30
  const ventasPrevias = Math.max(0, (producto.ventas90Dias ?? producto.ventas30Dias * 3) - producto.ventas30Dias)
  const demandaPrevia = ventasPrevias / 60
  const demandaDiaria = demandaReciente * 0.7 + demandaPrevia * 0.3
  const tiempoEntregaDias = Math.max(1, producto.tiempoEntregaDias ?? 7)
  const coberturaObjetivoDias = tiempoEntregaDias + 14
  const objetivoCobertura = Math.ceil(demandaDiaria * coberturaObjetivoDias)
  const baseMinima = producto.stockMinimo ?? 0
  const stockUtil = Math.max(0, producto.stockActual - producto.unidadesPorVencer)
  const cantidadSugerida = Math.max(0, Math.max(objetivoCobertura, baseMinima) - stockUtil)
  const diasCobertura = demandaDiaria > 0 ? Math.round((stockUtil / demandaDiaria) * 10) / 10 : null
  const riesgoVencimiento = producto.stockActual > 0 ? Math.round((producto.unidadesPorVencer / producto.stockActual) * 100) : 0
  return {
    cantidadSugerida,
    variables: {
      ventas30Dias: producto.ventas30Dias,
      demandaDiaria: Math.round(demandaDiaria * 100) / 100,
      stockActual: producto.stockActual,
      stockMinimo: baseMinima,
      unidadesPorVencer: producto.unidadesPorVencer,
      stockUtil,
      ventas90Dias: producto.ventas90Dias ?? producto.ventas30Dias * 3,
      diasCobertura,
      tiempoEntregaDias,
      coberturaObjetivoDias,
      margenPorcentaje: Math.round((producto.margenPorcentaje || 0) * 10) / 10,
      riesgoVencimiento,
    },
  }
}
