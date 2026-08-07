import assert from "node:assert/strict"
import { asignarLotesFEFO } from "../lib/domain/fefo"
import { calcularCierreCaja } from "../lib/domain/cash"
import { estadoDespuesDeSurtir, puedeTransicionarReceta } from "../lib/domain/prescriptions"
import { calcularRecomendacionCompra } from "../lib/domain/purchase-recommendations"

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
assert.equal(recomendacion.cantidadSugerida, 27)
assert.equal(recomendacion.variables.stockUtil, 3)

console.log("OK: 10 reglas XP de dominio verificadas (FEFO, caja, receta y compras).")
