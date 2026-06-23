/**
 * lib/ia/schemas.ts
 * Esquemas Zod para validar parámetros de herramientas enviados por Gemini.
 * Garantiza que el modelo no pueda inyectar valores fuera de rango ni de tipo incorrecto.
 */

import { z } from "zod"

// ---------------------------------------------------------------------------
// Utilidades de sanitización
// ---------------------------------------------------------------------------

/**
 * Elimina caracteres peligrosos para evitar inyección de prompts o SQL.
 * No usamos la entrada para SQL directamente (Prisma la parametriza),
 * pero sanitizamos igual para reducir superficie de ataque y guardar logs limpios.
 */
const sanitizedString = (maxLen: number) =>
  z.string()
    .max(maxLen, `El texto no puede superar ${maxLen} caracteres.`)
    .transform((val) =>
      val
        .replace(/[<>'"`;\\]/g, "")   // caracteres de inyección comunes
        .trim()
    )

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato YYYY-MM-DD.")

const limitResultados = (max: number) =>
  z.number().int().min(1).max(max).optional().default(20)

// ---------------------------------------------------------------------------
// Esquemas de herramientas de Fase 1 (solo lectura)
// ---------------------------------------------------------------------------

export const GetDashboardSummarySchema = z.object({}).optional()

export const GetLowStockProductsSchema = z.object({
  limit: limitResultados(50),
  offset: z.number().int().min(0).optional().default(0),
})

export const GetExpiredProductsSchema = z.object({
  limit: limitResultados(50),
  offset: z.number().int().min(0).optional().default(0),
})

export const GetProductsNearExpirationSchema = z.object({
  dias: z.number().int().min(1).max(180).optional().default(90),
  limit: limitResultados(50),
  offset: z.number().int().min(0).optional().default(0),
})

export const SearchProductsSchema = z.object({
  query: z.string()
    .min(1, "El término de búsqueda no puede estar vacío.")
    .max(100, "El texto no puede superar 100 caracteres.")
    .transform((val) => val.replace(/[<>'"`;\\]/g, "").trim()),
  limit: limitResultados(30),
  offset: z.number().int().min(0).optional().default(0),
})

export const GetProductDetailsSchema = z.object({
  productoId: z.number().int().positive("El ID del producto debe ser un número positivo."),
})

export const GetProductLotsSchema = z.object({
  productoId: z.number().int().positive("El ID del producto debe ser un número positivo."),
  soloActivos: z.boolean().optional().default(true),
})

export const GetTopSellingProductsSchema = z.object({
  dias: z.number().int().min(1).max(365).optional().default(30),
  limit: limitResultados(20),
})

export const GetSalesSummarySchema = z.object({
  fechaInicio: fechaISO.optional(),
  fechaFin: fechaISO.optional(),
  agruparPor: z.enum(["dia", "semana", "mes"]).optional().default("dia"),
}).refine(
  (data) => {
    if (data.fechaInicio && data.fechaFin) {
      return new Date(data.fechaInicio) <= new Date(data.fechaFin)
    }
    return true
  },
  { message: "La fecha de inicio no puede ser posterior a la fecha de fin." }
)

export const GetInventoryMovementsSchema = z.object({
  productoId: z.number().int().positive(),
  limit: limitResultados(50),
  offset: z.number().int().min(0).optional().default(0),
})

export const GetAuditAlertsSchema = z.object({
  dias: z.number().int().min(1).max(90).optional().default(7),
  limit: limitResultados(30),
})

// ---------------------------------------------------------------------------
// Esquemas de herramientas de Fase 3 (borradores de escritura)
// ---------------------------------------------------------------------------

export const GetSuggestedPurchaseOrderSchema = z.object({
  diasAnalisis: z.number().int().min(7).max(365).optional().default(30),
})

export const CreatePurchaseDraftSchema = z.object({
  items: z.array(z.object({
    productoId: z.number().int().positive(),
    cantidadSugerida: z.number().int().positive().max(10000),
    motivo: sanitizedString(200),
  })).min(1).max(50),
  notasIA: sanitizedString(500).optional(),
})

export const CreateInventoryAdjustmentDraftSchema = z.object({
  items: z.array(z.object({
    productoId: z.number().int().positive(),
    stockFisicoReportado: z.number().int().min(0),
    motivo: sanitizedString(200),
  })).min(1).max(30),
  notasIA: sanitizedString(500).optional(),
})

// ---------------------------------------------------------------------------
// Esquema Zod para extracción OCR de facturas de proveedores (Fase 4)
// ---------------------------------------------------------------------------

export const InvoiceOcrSchema = z.object({
  supplierName: z.string().min(1).max(200),
  invoiceNumber: z.string().max(50).nullable(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  items: z.array(z.object({
    productName: z.string().min(1).max(200),
    quantity: z.number().int().positive().max(100000),
    unitCost: z.number().positive().max(1000000),
    batch: z.string().max(50).nullable(),
    expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  })).min(1).max(200),
  total: z.number().positive().max(99999999),
})

// ---------------------------------------------------------------------------
// Helper para parsear de forma segura los argumentos de Gemini
// ---------------------------------------------------------------------------

export function safeParseToolArgs<T>(
  schema: z.ZodSchema<T>,
  args: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(args)
  if (result.success) {
    return { success: true, data: result.data }
  }
  // Zod v4 usa .issues en lugar de .errors
  const issues = (result.error as any).issues ?? (result.error as any).errors ?? []
  const messages = issues.map((e: any) => `${(e.path ?? []).join(".")}: ${e.message}`).join("; ")
  return { success: false, error: `Parámetros inválidos: ${messages || result.error.message}` }
}
