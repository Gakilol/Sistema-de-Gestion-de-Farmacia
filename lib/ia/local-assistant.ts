import type { IAToolName, ToolResult, UserRole } from "@/lib/ia/types"

export interface LocalIntent {
  matched: boolean
  toolName?: IAToolName
  args?: Record<string, unknown>
  title: string
  medicalDisclaimer?: boolean
}
function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

function extractDays(text: string, fallback: number, max: number) {
  const match = normalize(text).match(/(\d{1,3})\s*dias?/)
  if (!match) return fallback
  return Math.max(1, Math.min(Number(match[1]), max))
}

function extractDates(text: string) {
  const dates = text.match(/\d{4}-\d{2}-\d{2}/g) ?? []
  return {
    ...(dates[0] ? { fechaInicio: dates[0] } : {}),
    ...(dates[1] ? { fechaFin: dates[1] } : {}),
  }
}

function extractSearchTerm(text: string) {
  return text
    .replace(/^(?:por favor\s+)?(?:busca|buscar|encuentra|consultar?|producto)\s+/i, "")
    .replace(/\s+en\s+(?:el\s+)?inventario[?.!]*$/i, "")
    .replace(/[<>;'"`\\]/g, "")
    .replace(/[?.!]+$/g, "")
    .trim()
}

export function detectLocalIntent(message: string): LocalIntent {
  const text = normalize(message)

  if (!text) return { matched: false, title: "Ayuda" }

  if (/\b(diagnostico|recetar|dosis|que debo tomar|tratamiento para)\b/.test(text)) {
    return {
      matched: true,
      title: "Orientación segura",
      medicalDisclaimer: true,
    }
  }

  if (/\b(ayuda|opciones|que puedes hacer|capacidades)\b/.test(text)) {
    return { matched: true, title: "Capacidades disponibles" }
  }

  if (/\b(resumen|dashboard|estado general|panorama)\b/.test(text)) {
    return { matched: true, toolName: "getDashboardSummary", args: {}, title: "Resumen operativo" }
  }

  if (/\b(stock bajo|bajo stock|reabastecer|sin existencias)\b/.test(text)) {
    return { matched: true, toolName: "getLowStockProducts", args: { limit: 15, offset: 0 }, title: "Productos con stock bajo" }
  }

  if (/\b(vencidos|caducados|ya vencieron)\b/.test(text)) {
    return { matched: true, toolName: "getExpiredProducts", args: { limit: 15, offset: 0 }, title: "Lotes vencidos" }
  }

  if (/\b(por vencer|proximos? a vencer|vencimiento|caducar)\b/.test(text)) {
    const dias = extractDays(message, 90, 180)
    return { matched: true, toolName: "getProductsNearExpiration", args: { dias, limit: 15, offset: 0 }, title: `Lotes por vencer en ${dias} días` }
  }

  if (/\b(mas vendidos|top de productos|productos top|mayor rotacion)\b/.test(text)) {
    const dias = extractDays(message, 30, 365)
    return { matched: true, toolName: "getTopSellingProducts", args: { dias, limit: 10 }, title: `Productos más vendidos en ${dias} días` }
  }

  if (/\b(resumen de ventas|ventas del|ventas entre|reporte de ventas)\b/.test(text)) {
    return { matched: true, toolName: "getSalesSummary", args: extractDates(message), title: "Resumen de ventas" }
  }

  if (/\b(auditoria|anomalias|anulaciones inusuales|inconsistencias)\b/.test(text)) {
    const dias = extractDays(message, 7, 90)
    return { matched: true, toolName: "getAuditAlerts", args: { dias, limit: 20 }, title: `Alertas de auditoría de ${dias} días` }
  }

  if (/\b(orden de compra|sugerencia de compra|comprar para reponer|propuesta de compra)\b/.test(text)) {
    const diasAnalisis = Math.max(7, extractDays(message, 30, 365))
    return { matched: true, toolName: "getSuggestedPurchaseOrder", args: { diasAnalisis }, title: "Propuesta explicable de compra" }
  }

  if (/\b(diagnosticos frecuentes|condiciones frecuentes|motivos de consulta)\b/.test(text)) {
    const dias = extractDays(message, 90, 365)
    return { matched: true, toolName: "getMostCommonClinicalConditions", args: { dias, limit: 10 }, title: "Condiciones clínicas frecuentes" }
  }

  if (/^(?:buscar?|encuentra|consultar?)\s+paciente\b/.test(text)) {
    const query = message.replace(/^(?:buscar?|encuentra|consultar?)\s+paciente\s*/i, "").trim()
    return { matched: true, toolName: "searchPatients", args: { query }, title: "Búsqueda de pacientes" }
  }

  if (/^(?:busca|buscar|encuentra|consultar?|producto)\b/.test(text)) {
    const query = extractSearchTerm(message)
    return { matched: true, toolName: "searchProducts", args: { query, limit: 15, offset: 0 }, title: `Búsqueda de producto: ${query || "sin término"}` }
  }

  return { matched: false, title: "Ayuda" }
}

export function getLocalCapabilities(role: UserRole) {
  const base = [
    "resumen operativo del sistema",
    "productos con stock bajo",
    "lotes vencidos o próximos a vencer",
    "búsqueda de productos por nombre o categoría",
    "productos más vendidos",
  ]
  if (role === "ADMIN") base.push("ventas, auditoría y propuestas de compra")
  if (role === "ADMIN" || role === "DOCTOR") base.push("búsqueda de pacientes y estadísticas clínicas")

  return `### Asistente operativo local

Puedo consultar datos reales sin depender de una API externa:

${base.map((item) => `- ${item}`).join("\n")}

Prueba: **“¿Qué productos tienen stock bajo?”** o **“Busca Paracetamol en el inventario”**.`
}

function money(value: unknown) {
  const amount = Number(value ?? 0)
  return `C$${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}`
}

function cell(value: unknown) {
  return String(value ?? "—").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim()
}

function table(headers: string[], rows: unknown[][]) {
  if (rows.length === 0) return "No se encontraron registros para esta consulta."
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ].join("\n")
}

export function formatLocalToolResult(
  intent: LocalIntent,
  result: ToolResult<unknown>,
  role: UserRole
) {
  if (!result.ok) return `### ${intent.title}\n\nNo pude completar la consulta: ${result.error}`

  const data: any = result.data
  let body = ""

  switch (intent.toolName) {
    case "getDashboardSummary":
      body = table(["Indicador", "Valor"], [
        ["Productos activos", data.totalProductos],
        ["Unidades en inventario", data.totalStockUnidades],
        ["Productos con stock bajo", data.productosStockBajo],
        ["Lotes por vencer", data.lotesPorVencer],
        ["Lotes vencidos", data.lotesVencidos],
        ...(role === "ADMIN" ? [["Ventas de hoy", data.ventasHoy ?? 0], ["Ingresos últimos 30 días", money(data.ingresosMes)]] : []),
      ])
      break
    case "getLowStockProducts":
      body = table(["Producto", "Stock", "Mínimo", "Acción"], (data ?? []).map((p: any) => [p.nombre, p.stockActual, p.stockMinimo ?? "—", p.stockActual === 0 ? "Urgente" : "Reabastecer"]))
      break
    case "getExpiredProducts":
      body = table(["Producto", "Lote", "Vencimiento", "Stock"], (data ?? []).map((p: any) => [p.nombre, p.loteVencido?.codigoLote, p.loteVencido?.fechaVencimiento, p.loteVencido?.stockActual]))
      break
    case "getProductsNearExpiration":
      body = table(["Producto", "Lote", "Vence", "Días", "Stock"], (data ?? []).map((p: any) => [p.nombre, p.lote?.codigoLote, p.lote?.fechaVencimiento, p.lote?.diasParaVencer, p.lote?.stockActual]))
      break
    case "searchProducts":
      body = table(["ID", "Producto", "Stock", "Precio"], (data ?? []).map((p: any) => [p.id, p.nombre, p.stockActual, money(p.precioVenta)]))
      break
    case "getTopSellingProducts":
      body = table(["#", "Producto", "Unidades", ...(role === "ADMIN" ? ["Facturado"] : [])], (data ?? []).map((p: any, index: number) => [index + 1, p.nombre, p.cantidadVendida, ...(role === "ADMIN" ? [money(p.totalFacturado)] : [])]))
      break
    case "getSalesSummary": {
      const totals = (data ?? []).reduce((acc: any, day: any) => ({ count: acc.count + Number(day.cantidadFacturas || 0), amount: acc.amount + Number(day.totalMonto || 0) }), { count: 0, amount: 0 })
      body = `**Ventas:** ${totals.count} · **Total:** ${money(totals.amount)}\n\n${table(["Fecha", "Facturas", "Total"], (data ?? []).slice(-15).map((day: any) => [day.fecha, day.cantidadFacturas, money(day.totalMonto)]))}`
      break
    }
    case "getAuditAlerts":
      body = (data ?? []).length === 0 ? "No se detectaron alertas con los criterios actuales." : (data ?? []).map((alert: any) => `- **${cell(alert.tipo)}:** ${cell(alert.descripcion)}`).join("\n")
      break
    case "getSuggestedPurchaseOrder":
      body = `${table(["Producto", "Cantidad", "Proveedor", "Motivo"], (data?.items ?? []).map((item: any) => [item.nombreProducto, item.cantidadSugerida, item.proveedorSugerido ?? "Por definir", item.motivo]))}\n\n> Esta es una propuesta. Requiere revisión y confirmación humana antes de registrar una compra.`
      break
    case "searchPatients":
      body = `${table(["ID", "Paciente", "Cédula", "Consultas", "Última consulta"], (data ?? []).map((p: any) => [p.id, p.nombreCompleto, p.cedula, p.totalConsultas, p.ultimaConsulta]))}\n\n> Información confidencial para uso del personal autorizado.`
      break
    case "getMostCommonClinicalConditions":
      body = `${table(["Condición", "Código", "Frecuencia"], (data ?? []).map((item: any) => [item.nombre, item.codigo, item.frecuencia]))}\n\n> Tendencia estadística; no constituye un diagnóstico médico.`
      break
    default:
      body = "Consulta completada correctamente."
  }

  const source = result.meta?.fuenteDatos ? `\n\n---\n_Datos consultados: ${result.meta.fuenteDatos}_` : ""
  return `### ${intent.title}\n\n${body}${source}`
}
