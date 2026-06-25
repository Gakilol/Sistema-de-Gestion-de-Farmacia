/**
 * lib/ia/permissions.ts
 * Matriz de permisos de herramientas de IA por rol.
 * La validación SIEMPRE ocurre en el backend antes de ejecutar cualquier herramienta.
 * No se confía únicamente en instrucciones del prompt del sistema.
 */

import type { IAToolName, UserRole } from "./types"

// ---------------------------------------------------------------------------
// Mapa de permisos: qué herramientas puede invocar cada rol
// ---------------------------------------------------------------------------

const PERMISOS_POR_ROL: Record<UserRole, Set<IAToolName>> = {
  ADMIN: new Set<IAToolName>([
    "getDashboardSummary",
    "getLowStockProducts",
    "getExpiredProducts",
    "getProductsNearExpiration",
    "searchProducts",
    "getProductDetails",
    "getProductLots",
    "getTopSellingProducts",
    "getSalesSummary",
    "getInventoryMovements",
    "getAuditAlerts",
    "createPurchaseDraft",
    "createInventoryAdjustmentDraft",
    "getSuggestedPurchaseOrder",
    // Clínicas
    "searchPatients",
    "getPatientClinicalHistory",
    "getMostCommonClinicalConditions",
  ]),
  DOCTOR: new Set<IAToolName>([
    "getDashboardSummary",
    "getLowStockProducts",
    "getExpiredProducts",
    "getProductsNearExpiration",
    "searchProducts",
    "getProductDetails",
    "getProductLots",
    "getTopSellingProducts",
    // Clínicas (acceso completo para DOCTOR)
    "searchPatients",
    "getPatientClinicalHistory",
    "getMostCommonClinicalConditions",
    // Nota: getSalesSummary, getInventoryMovements, getAuditAlerts, createPurchaseDraft DENEGADOS para DOCTOR
  ]),
  EMPLEADO: new Set<IAToolName>([
    "getDashboardSummary",
    "getLowStockProducts",
    "getExpiredProducts",
    "getProductsNearExpiration",
    "searchProducts",
    "getProductDetails",
    "getProductLots",
    // getTopSellingProducts: solo en modo sin datos financieros (manejado en tools.ts)
    "getTopSellingProducts",
    // getSalesSummary, getInventoryMovements, getAuditAlerts: DENEGADOS para EMPLEADO
    // createPurchaseDraft, createInventoryAdjustmentDraft, getSuggestedPurchaseOrder: DENEGADOS
    // Herramientas clínicas: DENEGADAS para EMPLEADO
  ]),
  UNKNOWN: new Set<IAToolName>([]),
}

// ---------------------------------------------------------------------------
// Herramientas que exponen datos financieros y deben ser filtradas por rol
// ---------------------------------------------------------------------------

export const HERRAMIENTAS_SOLO_ADMIN: Set<IAToolName> = new Set([
  "getSalesSummary",
  "getInventoryMovements",
  "getAuditAlerts",
  "createPurchaseDraft",
  "createInventoryAdjustmentDraft",
  "getSuggestedPurchaseOrder",
])

/**
 * Campos financieros que deben ocultarse para el rol EMPLEADO
 * (manejado dentro de cada función en tools.ts)
 */
export const CAMPOS_FINANCIEROS_OCULTOS_PARA_EMPLEADO = [
  "precioCompra",
  "costoCompra",
  "ingresosMes",
  "ventasHoy",
  "totalFacturado",
  "totalMonto",
] as const

// ---------------------------------------------------------------------------
// Función de verificación de permisos
// ---------------------------------------------------------------------------

/**
 * Verifica si un rol tiene permiso para invocar una herramienta específica.
 * Retorna `true` si está permitido, `false` si debe denegarse.
 */
export function checkToolPermission(toolName: IAToolName, rol: UserRole): boolean {
  const permisos = PERMISOS_POR_ROL[rol]
  return permisos.has(toolName)
}

/**
 * Determina si el rol actual debe recibir datos financieros.
 * Un EMPLEADO nunca debe recibir costos de compra, ganancias ni totales de facturación.
 */
export function canViewFinancialData(rol: UserRole): boolean {
  return rol === "ADMIN"
}

/**
 * Resuelve el UserRole desde el idRol de la base de datos.
 * Según el seed.ts, rol 1 = ADMIN, rol 2 = EMPLEADO.
 * Se agrega mapeo defensivo para IDs desconocidos.
 */
export function resolveRoleFromId(idRol: number): UserRole {
  const ROLE_MAP: Record<number, UserRole> = {
    1: "ADMIN",
    2: "EMPLEADO",
    3: "DOCTOR",
  }
  return ROLE_MAP[idRol] ?? "UNKNOWN"
}
