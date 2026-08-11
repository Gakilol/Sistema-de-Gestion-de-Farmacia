import assert from "node:assert/strict"
import { asignarLotesFEFO } from "../lib/domain/fefo"
import { calcularCierreCaja } from "../lib/domain/cash"
import { estadoDespuesDeSurtir, puedeTransicionarReceta } from "../lib/domain/prescriptions"
import { calcularRecomendacionCompra } from "../lib/domain/purchase-recommendations"
import { agruparSugerenciasPorProveedor, estadoTrasRecepcion, puedeAprobarOrden, puedeRecibirOrden } from "../lib/domain/purchase-orders"
import { asignarReintegroALotes, factorUnidadVenta, validarCantidadDevolucion } from "../lib/domain/sale-returns"
import { formatearCedulaMientrasEscribe, ocultarCedula, prepararCedulaBusqueda } from "../lib/domain/patient-access"
import { calcularBeneficiosVenta, nivelPorPuntos, tasaDescuentoNivel } from "../lib/domain/loyalty"

const ahora = new Date("2026-08-07T12:00:00Z")
const lotes = [
  { id: 1, stockActual: 10, fechaVencimiento: "2026-09-01", createdAt: "2026-01-01" },
  { id: 2, stockActual: 10, fechaVencimiento: "2026-08-20", createdAt: "2026-02-01" },
  { id: 3, stockActual: 50, fechaVencimiento: "2026-07-01", createdAt: "2026-01-01" },
]
assert.deepEqual(asignarLotesFEFO(lotes, 12, ahora).map((x) => [x.idLote, x.cantidad]), [[2, 10], [1, 2]])
assert.throws(() => asignarLotesFEFO(lotes, 1, ahora, 3), /no está vigente/)
assert.deepEqual(asignarLotesFEFO(lotes, 5, ahora, 1)[0], { idLote: 1, cantidad: 5, esExcepcion: true })

assert.deepEqual(calcularCierreCaja(100, 500, [{ tipo: "GASTO", monto: 25 }, { tipo: "INGRESO", monto: 10 }], 590), {
  montoEsperado: 585,
  diferencia: 5,
})
assert.equal(estadoDespuesDeSurtir([{ cantidad: 2, cantidadFacturada: 1 }]), "USADA_PARCIALMENTE")
assert.equal(estadoDespuesDeSurtir([{ cantidad: 2, cantidadFacturada: 2 }]), "USADA_COMPLETAMENTE")
assert.equal(puedeTransicionarReceta("EMITIDA", "EN_PREPARACION"), true)
assert.equal(puedeTransicionarReceta("ANULADA", "EMITIDA"), false)

const recomendacion = calcularRecomendacionCompra({ id: 1, stockActual: 8, stockMinimo: 10, ventas30Dias: 30, unidadesPorVencer: 5 })
assert.equal(recomendacion.cantidadSugerida, 18)
assert.equal(recomendacion.variables.stockUtil, 3)
assert.equal(recomendacion.variables.diasCobertura, 3)

assert.equal(nivelPorPuntos(1500), "ORO")
assert.equal(tasaDescuentoNivel("PLATA"), 0.03)
assert.deepEqual(calcularBeneficiosVenta({ subtotalTrasPromocion: 100, nivel: "ORO", saldoDisponible: 20, aplicarSaldo: true }), { descuentoFidelizacion: 5, saldoAplicado: 20, puntosGanados: 7, total: 75 })

const gruposOrden = agruparSugerenciasPorProveedor([
  { idProducto: 1, idProveedor: 9, cantidad: 5, costoUnitario: 10 },
  { idProducto: 2, idProveedor: 9, cantidad: 3, costoUnitario: 20 },
  { idProducto: 3, idProveedor: 7, cantidad: 2, costoUnitario: 15 },
])
assert.equal(gruposOrden.size, 2)
assert.equal(gruposOrden.get(9)?.length, 2)
assert.equal(estadoTrasRecepcion([{ cantidadSolicitada: 10, cantidadRecibida: 0, cantidadNueva: 4 }]), "PARCIAL")
assert.equal(estadoTrasRecepcion([{ cantidadSolicitada: 10, cantidadRecibida: 4, cantidadNueva: 6 }]), "RECIBIDA")
assert.throws(() => estadoTrasRecepcion([{ cantidadSolicitada: 10, cantidadRecibida: 8, cantidadNueva: 3 }]), /supera/)
assert.equal(puedeAprobarOrden("BORRADOR"), true)
assert.equal(puedeRecibirOrden("APROBADA"), true)

assert.equal(factorUnidadVenta("CAJA", 10, 24), 24)
validarCantidadDevolucion(5, 2, 3)
assert.throws(() => validarCantidadDevolucion(5, 4, 2), /supera/)
assert.deepEqual(
  asignarReintegroALotes([{ idLote: 1, cantidad: 3 }, { idLote: 2, cantidad: 5 }], 2, 4),
  [{ idLote: 1, cantidad: 1 }, { idLote: 2, cantidad: 3 }],
)

const cedula = prepararCedulaBusqueda("0010101900001a")
assert.equal(cedula?.formateada, "001-010190-0001A")
assert.deepEqual(cedula?.candidatas, ["001-010190-0001A", "0010101900001A"])
assert.equal(prepararCedulaBusqueda("1234"), null)
assert.equal(formatearCedulaMientrasEscribe("0010101900001a"), "001-010190-0001A")
assert.equal(ocultarCedula("001-010190-0001A"), "***-******-0001A")
assert.equal(prepararCedulaBusqueda("001-00001-0001A")?.formateada, "001-00001-0001A")
assert.equal(formatearCedulaMientrasEscribe("001000010001a"), "001-00001-0001A")

console.log("OK: reglas XP verificadas (FEFO, caja, receta, compras, devoluciones, fidelización y acceso clínico).")
