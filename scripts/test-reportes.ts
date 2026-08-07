import { calculateExecutiveMetrics, isValidReportRange } from "../lib/reportes/metrics"

let passed = 0
function test(name: string, assertion: () => void) {
  assertion()
  passed++
  console.log(`  ✅ ${name}`)
}

function equal(actual: number | boolean, expected: number | boolean) {
  if (actual !== expected) throw new Error(`Esperado ${expected}, recibido ${actual}`)
}

console.log("\n📊 Pruebas XP - Reportes ejecutivos")

test("Calcula utilidad y margen bruto desde COGS", () => {
  const result = calculateExecutiveMetrics({ totalVentas: 1000, totalVentasPrevias: 800, ventasCount: 5, totalCompras: 300, comprasCount: 2, cogs: 600, stockBajo: 3 })
  equal(result.gananciaNeta, 400)
  equal(result.margenPct, 40)
})

test("Calcula ticket promedio y transacciones", () => {
  const result = calculateExecutiveMetrics({ totalVentas: 900, totalVentasPrevias: 900, ventasCount: 3, totalCompras: 100, comprasCount: 2, cogs: 500, stockBajo: 0 })
  equal(result.ticketPromedio, 300)
  equal(result.transaccionesCount, 5)
})

test("Calcula variación contra el período anterior", () => {
  const result = calculateExecutiveMetrics({ totalVentas: 1200, totalVentasPrevias: 1000, ventasCount: 1, totalCompras: 0, comprasCount: 0, cogs: 0, stockBajo: 0 })
  equal(result.variacionVentasPct, 20)
})

test("Evita divisiones por cero", () => {
  const result = calculateExecutiveMetrics({ totalVentas: 0, totalVentasPrevias: 0, ventasCount: 0, totalCompras: 0, comprasCount: 0, cogs: 0, stockBajo: 0 })
  equal(result.ticketPromedio, 0)
  equal(result.margenPct, 0)
})

test("Acepta rango cronológico válido", () => equal(isValidReportRange("2026-07-01", "2026-07-31"), true))
test("Rechaza fecha inicial posterior", () => equal(isValidReportRange("2026-08-01", "2026-07-01"), false))
test("Rechaza rangos superiores a un año", () => equal(isValidReportRange("2025-01-01", "2026-08-01"), false))
test("Rechaza formatos ambiguos", () => equal(isValidReportRange("01/07/2026", "31/07/2026"), false))

console.log(`\n✅ ${passed} pruebas de reportes pasaron.`)
