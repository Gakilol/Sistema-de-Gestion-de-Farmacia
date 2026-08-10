import "server-only"

import { prisma } from "@/lib/prisma"

export type ImportProductRow = {
  filaExcel: number
  nombre?: string
  codigoBarras?: string
  descripcion?: string
  categoria?: string | number
  laboratorio?: string | number
  concentracion?: string
  formaPresentacion?: string
  formaFarmaceutica?: string | number
  unidadMedida?: string
  precioCompra?: number
  precioVenta?: number
  precioBlister?: number
  precioCaja?: number
  unidadesPorBlister?: number
  unidadesPorCaja?: number
  blisteresPorCaja?: number
  margenUtilidad?: number
  stockMinimo?: number
  stockInicial?: number
  loteInicial?: string
  fechaVencimientoInicial?: string
  esServicio?: boolean
  activo?: boolean
}

export type ResolvedImportProductRow = ImportProductRow & {
  idCategoria?: number
  idLaboratorio?: number | null
  idFormaFarmaceutica?: number | null
  faltantes: string[]
}

export type ImportAnalysis = {
  filas: ResolvedImportProductRow[]
  listas: {
    categorias: string[]
    formasFarmaceuticas: string[]
    laboratorios: string[]
  }
  total: number
  listasCorrectas: number
  filasConProblemas: number
  listo: boolean
}

type ImportField = Exclude<keyof ImportProductRow, "filaExcel">

const normalize = (value: unknown) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim()

const HEADER_ALIASES: Record<string, ImportField> = {
  nombre: "nombre",
  producto: "nombre",
  "nombre producto": "nombre",
  "codigo barras": "codigoBarras",
  codigo: "codigoBarras",
  barcode: "codigoBarras",
  descripcion: "descripcion",
  categoria: "categoria",
  "id categoria": "categoria",
  laboratorio: "laboratorio",
  "id laboratorio": "laboratorio",
  concentracion: "concentracion",
  presentacion: "formaPresentacion",
  "forma presentacion": "formaPresentacion",
  "forma farmaceutica": "formaFarmaceutica",
  "id forma farmaceutica": "formaFarmaceutica",
  "unidad medida": "unidadMedida",
  unidad: "unidadMedida",
  "precio compra": "precioCompra",
  costo: "precioCompra",
  "precio venta": "precioVenta",
  "precio unitario": "precioVenta",
  "precio blister": "precioBlister",
  "precio caja": "precioCaja",
  "unidades por blister": "unidadesPorBlister",
  "unidades blister": "unidadesPorBlister",
  "unidades por caja": "unidadesPorCaja",
  "blisteres por caja": "blisteresPorCaja",
  "margen utilidad": "margenUtilidad",
  "stock minimo": "stockMinimo",
  "stock inicial": "stockInicial",
  lote: "loteInicial",
  "lote inicial": "loteInicial",
  vencimiento: "fechaVencimientoInicial",
  "fecha vencimiento": "fechaVencimientoInicial",
  "fecha vencimiento inicial": "fechaVencimientoInicial",
  servicio: "esServicio",
  "es servicio": "esServicio",
  activo: "activo",
}

const NUMERIC_FIELDS = new Set<ImportField>([
  "precioCompra", "precioVenta", "precioBlister", "precioCaja", "unidadesPorBlister",
  "unidadesPorCaja", "blisteresPorCaja", "margenUtilidad", "stockMinimo", "stockInicial",
])
const BOOLEAN_FIELDS = new Set<ImportField>(["esServicio", "activo"])

function asText(value: unknown) {
  const text = String(value ?? "").trim()
  return text || undefined
}

function asNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
  const normalized = String(value ?? "").trim().replace(/C\$|\s/g, "").replace(/,/g, "")
  if (!normalized) return undefined
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

function asBoolean(value: unknown) {
  if (typeof value === "boolean") return value
  const text = normalize(value)
  if (["si", "true", "1", "activo", "servicio"].includes(text)) return true
  if (["no", "false", "0", "inactivo", "producto"].includes(text)) return false
  return undefined
}

function asDate(value: unknown) {
  if (typeof value === "number" && value > 20000 && value < 100000) {
    const excelEpoch = Date.UTC(1899, 11, 30)
    return new Date(excelEpoch + value * 86400000).toISOString().slice(0, 10)
  }
  const text = String(value ?? "").trim()
  if (!text) return undefined
  const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`
  const latin = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (latin) return `${latin[3]}-${latin[2].padStart(2, "0")}-${latin[1].padStart(2, "0")}`
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10)
}

function convertField(field: ImportField, value: unknown) {
  if (field === "fechaVencimientoInicial") return asDate(value)
  if (NUMERIC_FIELDS.has(field)) return asNumber(value)
  if (BOOLEAN_FIELDS.has(field)) return asBoolean(value)
  if (field === "categoria" || field === "laboratorio" || field === "formaFarmaceutica") {
    return typeof value === "number" ? value : asText(value)
  }
  return asText(value)
}

export function normalizeSpreadsheetRows(rows: Record<string, unknown>[]) {
  return rows
    .filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""))
    .map((raw, index) => {
      const row: ImportProductRow = { filaExcel: index + 2, activo: true, esServicio: false }
      Object.entries(raw).forEach(([header, value]) => {
        const field = HEADER_ALIASES[normalize(header)]
        if (!field) return
        const converted = convertField(field, value)
        if (converted !== undefined) Object.assign(row, { [field]: converted })
      })
      return row
    })
}

function resolveCatalog(value: string | number | undefined, items: Array<{ id: number; nombre: string }>) {
  if (typeof value === "number") return items.find((item) => item.id === value)
  const key = normalize(value)
  return key ? items.find((item) => normalize(item.nombre) === key) : undefined
}

export async function analyzeImportRows(rows: ImportProductRow[]): Promise<ImportAnalysis> {
  const [categorias, formasFarmaceuticas, laboratorios, productosExistentes] = await Promise.all([
    prisma.categoriaProducto.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.formaFarmaceutica.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] }),
    prisma.laboratorio.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.producto.findMany({ select: { nombre: true, codigoBarras: true } }),
  ])

  const existingNames = new Set(productosExistentes.map((item) => normalize(item.nombre)))
  const existingBarcodes = new Set(productosExistentes.map((item) => normalize(item.codigoBarras)).filter(Boolean))
  const fileNames = new Map<string, number>()
  const fileBarcodes = new Map<string, number>()
  rows.forEach((row) => {
    const name = normalize(row.nombre)
    const barcode = normalize(row.codigoBarras)
    if (name) fileNames.set(name, (fileNames.get(name) ?? 0) + 1)
    if (barcode) fileBarcodes.set(barcode, (fileBarcodes.get(barcode) ?? 0) + 1)
  })

  const today = new Date().toISOString().slice(0, 10)
  const resolved = rows.map<ResolvedImportProductRow>((row) => {
    const faltantes: string[] = []
    const category = resolveCatalog(row.categoria, categorias)
    const form = resolveCatalog(row.formaFarmaceutica, formasFarmaceuticas)
    const lab = resolveCatalog(row.laboratorio, laboratorios)
    const service = row.esServicio === true
    const nameKey = normalize(row.nombre)
    const barcodeKey = normalize(row.codigoBarras)

    if (!row.nombre || row.nombre.trim().length < 2) faltantes.push("nombre")
    else if (existingNames.has(nameKey)) faltantes.push("nombre (ya existe en el catálogo)")
    else if ((fileNames.get(nameKey) ?? 0) > 1) faltantes.push("nombre (duplicado en el archivo)")

    if (barcodeKey && existingBarcodes.has(barcodeKey)) faltantes.push("código de barras (ya existe)")
    else if (barcodeKey && (fileBarcodes.get(barcodeKey) ?? 0) > 1) faltantes.push("código de barras (duplicado en el archivo)")

    if (!category) faltantes.push(row.categoria ? `categoría válida (no existe: ${row.categoria})` : "categoría")
    if (row.laboratorio && !lab) faltantes.push(`laboratorio válido (no existe: ${row.laboratorio})`)

    const hasSalePrice = (row.precioVenta ?? 0) > 0 || (row.precioBlister ?? 0) > 0 || (row.precioCaja ?? 0) > 0
    if (!hasSalePrice) faltantes.push("al menos un precio de venta mayor a 0")
    if ((row.precioBlister ?? 0) > 0 && !row.unidadesPorBlister) faltantes.push("unidades por blíster")
    if ((row.precioCaja ?? 0) > 0 && !row.unidadesPorCaja) faltantes.push("unidades por caja")
    if ((row.precioVenta ?? 0) > 0 && (row.precioBlister ?? 0) > 0 && row.precioBlister! < row.precioVenta!) faltantes.push("precio de blíster mayor o igual al unitario")
    if ((row.precioVenta ?? 0) > 0 && (row.precioCaja ?? 0) > 0 && row.precioCaja! < row.precioVenta!) faltantes.push("precio de caja mayor o igual al unitario")

    if (!service) {
      if (!row.concentracion) faltantes.push("concentración")
      if (!row.formaPresentacion) faltantes.push("presentación")
      if (!form) faltantes.push(row.formaFarmaceutica ? `forma farmacéutica válida (no existe: ${row.formaFarmaceutica})` : "forma farmacéutica")
    }

    if ((row.stockInicial ?? 0) > 0) {
      if (!row.loteInicial) faltantes.push("lote inicial")
      if (!row.fechaVencimientoInicial) faltantes.push("fecha de vencimiento inicial")
      else if (row.fechaVencimientoInicial < today) faltantes.push("fecha de vencimiento vigente")
    }

    return {
      ...row,
      idCategoria: category?.id,
      idLaboratorio: lab?.id ?? null,
      idFormaFarmaceutica: service ? null : form?.id,
      faltantes,
    }
  })

  const filasConProblemas = resolved.filter((row) => row.faltantes.length > 0).length
  return {
    filas: resolved,
    listas: {
      categorias: categorias.map((item) => item.nombre),
      formasFarmaceuticas: formasFarmaceuticas.map((item) => item.nombre),
      laboratorios: laboratorios.map((item) => item.nombre),
    },
    total: resolved.length,
    listasCorrectas: resolved.length - filasConProblemas,
    filasConProblemas,
    listo: resolved.length > 0 && filasConProblemas === 0,
  }
}

export function formatImportAnalysis(analysis: ImportAnalysis, archivo: string) {
  if (analysis.listo) {
    return `### Excel listo para importar\n\nRevisé **${analysis.total} producto${analysis.total === 1 ? "" : "s"}** de \`${archivo}\`. Todos cumplen los datos obligatorios.\n\nEscribe **IMPORTAR** para crear los productos o **CANCELAR IMPORTACIÓN** para descartar el borrador.`
  }

  const issues = analysis.filas
    .filter((row) => row.faltantes.length > 0)
    .slice(0, 10)
    .map((row) => `- **Fila ${row.filaExcel}${row.nombre ? ` · ${row.nombre}` : ""}:** ${row.faltantes.join(", ")}`)
    .join("\n")
  const more = analysis.filasConProblemas > 10 ? `\n- …y ${analysis.filasConProblemas - 10} fila(s) adicionales.` : ""
  const categories = analysis.listas.categorias.slice(0, 12).join(", ") || "No hay categorías activas"
  const forms = analysis.listas.formasFarmaceuticas.slice(0, 12).join(", ") || "No hay formas activas"

  return `### Necesito completar algunos datos\n\nLeí **${analysis.total} fila${analysis.total === 1 ? "" : "s"}** de \`${archivo}\`; ${analysis.filasConProblemas} requieren información antes de importar.\n\n${issues}${more}\n\nPuedes responder así:\n- \`Todos: categoría=Medicamentos; forma farmacéutica=Tableta; presentación=Caja; concentración=500 mg; precio venta=15\`\n- \`Fila 3: categoría=Analgésicos; concentración=650 mg\`\n\n**Categorías disponibles:** ${categories}\n\n**Formas farmacéuticas disponibles:** ${forms}`
}

export function applyImportAnswer(rows: ImportProductRow[], answer: string) {
  let scope: "all" | number = "all"
  let recognized = 0
  const updated = rows.map((row) => ({ ...row }))
  const parts = answer.split(/[;\n]+/).map((part) => part.trim()).filter(Boolean)

  parts.forEach((part) => {
    const scopeMatch = part.match(/^(todos?|todas?|fila\s+(\d+))\s*:\s*(.*)$/i)
    let assignment = part
    if (scopeMatch) {
      scope = scopeMatch[2] ? Number(scopeMatch[2]) : "all"
      assignment = scopeMatch[3].trim()
    }
    if (!assignment) return

    const match = assignment.match(/^(.+?)\s*(?:=|:\s+|\s+es\s+)\s*(.+)$/i)
    if (!match) return
    const field = HEADER_ALIASES[normalize(match[1])]
    if (!field) return
    const value = convertField(field, match[2])
    if (value === undefined) return

    updated.forEach((row) => {
      if (scope === "all" || row.filaExcel === scope) Object.assign(row, { [field]: value })
    })
    recognized += 1
  })

  return { rows: updated, recognized }
}

export function isImportConfirmation(answer: string) {
  return /^(si\s*,?\s*)?(confirmo|confirmar(?:\s+importacion)?|importar|importar productos)$/i.test(normalize(answer))
}

export function isImportCancellation(answer: string) {
  return /^(cancelar|cancelar importacion|descartar|descartar importacion)$/i.test(normalize(answer))
}
