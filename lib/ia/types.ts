/**
 * lib/ia/types.ts
 * Tipos centralizados para la capa de IA de FarmaPos.
 * Ninguna de estas interfaces expone estructura interna de Prisma, SQL ni secretos.
 */

// ---------------------------------------------------------------------------
// Contexto del usuario autenticado (derivado del JWT, NO incluye passwordHash)
// ---------------------------------------------------------------------------
export interface IAUserContext {
  id: number
  correo: string
  idRol: number
  nombreCompleto: string
}

// Roles conocidos en la base de datos (ver seed.ts)
export type UserRole = "ADMIN" | "DOCTOR" | "EMPLEADO" | "UNKNOWN"

// ---------------------------------------------------------------------------
// Resultados de herramientas de solo lectura (Fase 1)
// ---------------------------------------------------------------------------

export interface DashboardSummaryResult {
  totalProductos: number
  totalStockUnidades: number
  productosStockBajo: number
  lotesPorVencer: number
  lotesVencidos: number
  ventasHoy?: number          // Solo ADMIN
  ingresosMes?: number        // Solo ADMIN
  fechaConsulta: string
}

export interface ProductoResumen {
  id: number
  nombre: string
  stockActual: number
  stockMinimo: number | null
  categoria: string
  laboratorio: string | null
  precioVenta: number
  precioCompra?: number       // Solo ADMIN
  activo: boolean
}

export interface LoteResumen {
  id: number
  codigoLote: string
  fechaVencimiento: string | null
  diasParaVencer: number | null
  stockActual: number
  stockInicial: number
  costoCompra?: number        // Solo ADMIN
  estado: "VENCIDO" | "POR_VENCER_CRITICO" | "POR_VENCER" | "VIGENTE"
}

export interface ProductoConLotes extends ProductoResumen {
  lotes: LoteResumen[]
}

export interface VentaResumen {
  fecha: string
  totalVentas: number
  cantidadFacturas: number
  totalMonto: number
  porMetodoPago: {
    EFECTIVO: number
    TARJETA: number
    TRANSFERENCIA: number
  }
}

export interface ProductoVendido {
  nombre: string
  cantidadVendida: number
  totalFacturado: number      // Solo ADMIN
}

export interface MovimientoKardex {
  id: number
  tipo: string
  cantidad: number
  stockResultante: number
  referencia: string | null
  observacion: string | null
  fecha: string
  usuario: string | null
}

export interface AlertaAuditoria {
  tipo: "ANULACIONES_INUSUALES" | "AJUSTE_MANUAL_FUERA_HORARIO" | "DESCUENTOS_EXCESIVOS" | "INCONSISTENCIA_KARDEX"
  descripcion: string
  usuario?: string
  cantidad?: number
  promedioHistorico?: number
  fecha: string
}

// ---------------------------------------------------------------------------
// Recomendaciones del Dashboard (Fase 2)
// ---------------------------------------------------------------------------

export interface RecomendacionIA {
  tipo: "STOCK_CRITICO" | "LOTE_VENCIDO" | "LOTE_POR_VENCER" | "REABASTECIMIENTO" | "INCONSISTENCIA"
  criticidad: "ALTA" | "MEDIA" | "BAJA"
  producto: string
  descripcion: string
  accionSugerida: string
  diasInventario?: number
}

// ---------------------------------------------------------------------------
// Borradores de acciones operativas (Fase 3)
// ---------------------------------------------------------------------------

export interface ItemBorradorCompra {
  productoId: number
  nombreProducto: string
  cantidadSugerida: number
  precioCompraUltimo?: number
  proveedorSugerido?: string
  motivo: string
}

export interface BorradorOrdenCompra {
  items: ItemBorradorCompra[]
  fechaGeneracion: string
  notasIA: string
  requiereConfirmacionHumana: true
}

export interface ItemBorradorAjuste {
  productoId: number
  nombreProducto: string
  stockActualSistema: number
  stockFisicoReportado: number
  diferencia: number
  motivo: string
}

export interface BorradorAjusteInventario {
  items: ItemBorradorAjuste[]
  fechaGeneracion: string
  notasIA: string
  requiereConfirmacionHumana: true
}

// ---------------------------------------------------------------------------
// OCR de facturas (Fase 4)
// ---------------------------------------------------------------------------

export interface ItemFacturaOCR {
  productName: string
  quantity: number
  unitCost: number
  batch: string | null
  expirationDate: string | null
}

export interface FacturaOCRResult {
  supplierName: string
  invoiceNumber: string | null
  invoiceDate: string | null
  items: ItemFacturaOCR[]
  total: number
  advertencias: string[]       // Campos no reconocidos o inconsistencias detectadas
}

// ---------------------------------------------------------------------------
// Respuesta estandarizada de herramientas
// ---------------------------------------------------------------------------

export interface ToolSuccess<T> {
  ok: true
  data: T
  meta?: {
    total?: number
    limit?: number
    offset?: number
    rangoFechas?: string
    fuenteDatos?: string
  }
}

export interface ToolError {
  ok: false
  error: string              // Mensaje amigable SIN stack trace ni info interna
  code: "ACCESS_DENIED" | "INVALID_PARAMS" | "NOT_FOUND" | "INTERNAL_ERROR" | "LIMIT_EXCEEDED"
}

export type ToolResult<T> = ToolSuccess<T> | ToolError

// ---------------------------------------------------------------------------
// Nombres canónicos de herramientas para auditoría
// ---------------------------------------------------------------------------

export type IAToolName =
  | "getDashboardSummary"
  | "getLowStockProducts"
  | "getExpiredProducts"
  | "getProductsNearExpiration"
  | "searchProducts"
  | "getProductDetails"
  | "getProductLots"
  | "getTopSellingProducts"
  | "getSalesSummary"
  | "getInventoryMovements"
  | "getAuditAlerts"
  | "createPurchaseDraft"
  | "createInventoryAdjustmentDraft"
  | "getSuggestedPurchaseOrder"
  // Herramientas clínicas (solo ADMIN y DOCTOR)
  | "searchPatients"
  | "getPatientClinicalHistory"
  | "getMostCommonClinicalConditions"

export type IAAuditAction =
  | "IA_CHAT_CONSULTA"
  | "IA_TOOL_GET_DASHBOARD_SUMMARY"
  | "IA_TOOL_GET_LOW_STOCK"
  | "IA_TOOL_GET_EXPIRED_PRODUCTS"
  | "IA_TOOL_GET_NEAR_EXPIRATION"
  | "IA_TOOL_SEARCH_PRODUCTS"
  | "IA_TOOL_GET_PRODUCT_DETAILS"
  | "IA_TOOL_GET_PRODUCT_LOTS"
  | "IA_TOOL_GET_TOP_SELLING"
  | "IA_TOOL_GET_SALES_SUMMARY"
  | "IA_TOOL_GET_INVENTORY_MOVEMENTS"
  | "IA_TOOL_GET_AUDIT_ALERTS"
  | "IA_TOOL_CREATE_PURCHASE_DRAFT"
  | "IA_TOOL_CREATE_ADJUSTMENT_DRAFT"
  | "IA_ACCESS_DENIED"
  | "IA_GEMINI_ERROR"
  | "IA_OCR_FACTURA"
  // Clínica
  | "IA_TOOL_SEARCH_PATIENTS"
  | "IA_TOOL_GET_CLINICAL_HISTORY"
  | "IA_TOOL_GET_COMMON_CONDITIONS"

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de resultados para herramientas clínicas
// ─────────────────────────────────────────────────────────────────────────────

export interface PacienteResumen {
  id: number
  nombreCompleto: string
  cedula: string | null
  telefono: string | null
  totalConsultas: number
  ultimaConsulta: string | null
}

export interface HistorialClinicopaciente {
  paciente: {
    id: number
    nombreCompleto: string
    cedula: string | null
    fechaNacimiento: string | null
    sexo: string | null
    tipoSangre: string | null
    alergias: string | null
    antecedentes: string | null
  }
  consultas: Array<{
    id: number
    fecha: string
    doctor: string
    subjetivo: string
    objetivo: string
    analisis: string
    plan: string
    diagnosticos: string[]
    tratamientos: string[]
    tieneReceta: boolean
  }>
  totalConsultas: number
  diagnosticosMasFrecuentes: string[]
}

export interface CondicionClinicaResumen {
  nombre: string
  codigo: string | null
  frecuencia: number
}
