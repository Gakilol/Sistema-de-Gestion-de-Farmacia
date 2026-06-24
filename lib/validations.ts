import { z } from "zod"
import { getAllowedPrefixes } from "./phone-config"

export const nicaraguaCedulaRegex = /^\d{3}-\d{6}-\d{4}[A-Za-z]$/;
export const nicaraguaRucRegex = /^\d{3}-\d{6}-\d{4}[A-Za-z0-9]$/;
export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._\-#])[A-Za-z\d@$!%*?&._\-#]{8,}$/;

export const emptyToNull = (val: string | undefined | null) => val === "" ? null : val;

export function normalizeNicaraguaPhone(val: any): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val !== "string") return String(val);
  let cleaned = val.trim().replace(/[\s\-()]/g, ""); // Remove spaces, dashes, parentheses
  if (cleaned.startsWith("+505")) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith("505") && cleaned.length > 8) {
    cleaned = cleaned.substring(3);
  }
  return cleaned;
}

export function validateNicaraguaPhone(val: string | null): boolean {
  if (!val) return false;
  if (!/^\d{8}$/.test(val)) return false;
  const prefixes = getAllowedPrefixes();
  const firstDigit = val.charAt(0);
  return prefixes.includes(firstDigit);
}

export const clienteSchema = z.object({
  nombreCompleto: z.string().trim()
    .min(3, "El nombre completo es requerido y debe tener al menos 3 caracteres")
    .transform(val => val.replace(/\s+/g, " ")), // Colapsar espacios múltiples
  cedula: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return null;
      if (typeof val !== "string") return val;
      const trimmed = val.trim();
      if (trimmed === "") return null;
      const clean = trimmed.replace(/[\s-]/g, "").toUpperCase();
      if (clean.length === 14 && /^\d{13}[A-Z]$/.test(clean)) {
        return `${clean.substring(0, 3)}-${clean.substring(3, 9)}-${clean.substring(9, 13)}${clean.charAt(13)}`;
      }
      return trimmed;
    },
    z.string().trim().regex(nicaraguaCedulaRegex, "Formato de cédula de Nicaragua inválido (ej: 001-130605-1005A)")
  ),
  telefono: z.preprocess(
    normalizeNicaraguaPhone,
    z.string().trim().refine(validateNicaraguaPhone, {
      message: "Ingrese un número celular válido de Nicaragua de 8 dígitos con prefijo aceptado"
    })
  ),
  correo: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return null;
      if (typeof val !== "string") return val;
      const trimmed = val.trim();
      if (trimmed === "") return null;
      return trimmed;
    },
    z.string().trim().email("El correo electrónico debe ser válido").nullable().optional()
  ).nullable().optional(),
  ruc: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return null;
      if (typeof val !== "string") return val;
      const trimmed = val.trim();
      if (trimmed === "") return null;
      const clean = trimmed.replace(/[\s-]/g, "").toUpperCase();
      if (clean.length === 14 && /^\d{13}[A-Z0-9]$/.test(clean)) {
        return `${clean.substring(0, 3)}-${clean.substring(3, 9)}-${clean.substring(9, 13)}${clean.charAt(13)}`;
      }
      return trimmed;
    },
    z.string().trim().regex(nicaraguaRucRegex, "Formato de RUC de Nicaragua inválido (ej: 001-130605-1005A)").nullable().optional()
  ).nullable().optional(),
  direccion: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return null;
      if (typeof val !== "string") return val;
      const trimmed = val.trim();
      if (trimmed === "") return null;
      return trimmed;
    },
    z.string().trim().nullable().optional()
  ).nullable().optional(),
  tipoPerfil: z.enum(["FARMACIA", "CLINICA", "AMBOS"]).default("FARMACIA"),
  fechaNacimiento: z.string().optional().nullable(),
  sexo: z.string().optional().nullable(),
  activo: z.boolean().optional().default(true),
});

export const usuarioSchema = z.object({
  nombreCompleto: z.string().trim().min(3, "El nombre completo es requerido"),
  correo: z.string().trim().email("Correo electrónico inválido"),
  idRol: z.coerce.number().positive("Rol es requerido"),
  password: z.string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true; // Opcional para edición
        return val.length >= 8;
      },
      { message: "La contraseña debe tener al menos 8 caracteres" }
    )
    .refine(
      (val) => {
        if (!val) return true;
        return /[A-Z]/.test(val);
      },
      { message: "La contraseña debe incluir al menos una letra mayúscula" }
    )
    .refine(
      (val) => {
        if (!val) return true;
        return /[a-z]/.test(val);
      },
      { message: "La contraseña debe incluir al menos una letra minúscula" }
    )
    .refine(
      (val) => {
        if (!val) return true;
        return /\d/.test(val);
      },
      { message: "La contraseña debe incluir al menos un número" }
    )
    .refine(
      (val) => {
        if (!val) return true;
        return /[@$!%*?&._\-#]/.test(val);
      },
      { message: "La contraseña debe incluir al menos un carácter especial (@$!%*?&._-#)" }
    ),
});

export const proveedorSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre del proveedor es requerido"),
  telefono: z.preprocess(
    normalizeNicaraguaPhone,
    z.string().trim().refine(validateNicaraguaPhone, {
      message: "Ingrese un número celular válido de Nicaragua de 8 dígitos con prefijo aceptado"
    })
  ),
  correo: z.preprocess(
    (val) => val === "" ? null : val,
    z.string().trim().email("El correo electrónico debe ser válido").nullable().optional()
  ).nullable().optional(),
  direccion: z.string().trim().optional().nullable(),
  ruc: z.preprocess(
    (val) => {
      if (!val || typeof val !== "string") return null;
      const clean = val.trim().replace(/[\s-]/g, "").toUpperCase();
      if (clean.length === 14 && /^\d{13}[A-Z0-9]$/.test(clean)) {
        return `${clean.substring(0, 3)}-${clean.substring(3, 9)}-${clean.substring(9, 13)}${clean.charAt(13)}`;
      }
      return val.trim();
    },
    z.string().trim().regex(nicaraguaRucRegex, "Formato de RUC de Nicaragua inválido").nullable().optional()
  ).nullable().optional(),
  contacto: z.string().trim().optional().nullable(),
  activo: z.boolean().optional().default(true),
});

export const laboratorioSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre del laboratorio es requerido"),
  pais: z.string().trim().optional().nullable(),
  direccion: z.string().trim().optional().nullable(),
  telefono: z.preprocess(
    normalizeNicaraguaPhone,
    z.string().trim().refine(validateNicaraguaPhone, {
      message: "Ingrese un número celular válido de Nicaragua de 8 dígitos con prefijo aceptado"
    }).or(z.literal("")).nullable().optional()
  ).nullable().optional(),
  correo: z.preprocess(
    (val) => val === "" ? null : val,
    z.string().trim().email("El correo electrónico debe ser válido").nullable().optional()
  ).nullable().optional(),
  contacto: z.string().trim().optional().nullable(),
  observaciones: z.string().trim().optional().nullable(),
  activo: z.boolean().optional().default(true),
});

export const categoriaSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre de la categoría es requerido"),
  descripcion: z.string().trim().optional().nullable(),
  activo: z.boolean().optional().default(true),
});

export const servicioSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre del servicio es requerido"),
  descripcion: z.string().trim().optional().nullable(),
  precio: z.preprocess((a) => (a ? parseFloat(String(a)) : 0), z.number().min(0, "El precio no puede ser negativo")),
  duracion: z.preprocess((a) => (a ? parseInt(String(a), 10) : null), z.number().int().min(1).nullable().optional()),
  activo: z.boolean().optional().default(true),
});

export const descuentoSchema = z.object({
  tipo: z.enum(["PORCENTAJE", "MONTO"]),
  valor: z.preprocess((a) => (a ? parseFloat(String(a)) : 0), z.number().positive("El valor del descuento debe ser mayor a 0")),
  motivo: z.string().trim().min(1, "El motivo es requerido"),
  fechaInicio: z.string().optional().nullable(),
  fechaFin: z.string().optional().nullable(),
  montoMinimo: z.preprocess((a) => (a ? parseFloat(String(a)) : null), z.number().min(0).nullable().optional()),
  maxDescuento: z.preprocess((a) => (a ? parseFloat(String(a)) : null), z.number().min(0).nullable().optional()),
  esAcumulable: z.boolean().optional().default(false),
  estado: z.enum(["ACTIVO", "INACTIVO"]).default("ACTIVO"),
});

export const productoCreateSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  codigoBarras: z.string().optional().nullable(),
  descripcion: z.string().optional().nullable(),
  idCategoria: z.number({ message: "La categoría es obligatoria" }).int().positive("La categoría es obligatoria"),
  idLaboratorio: z.number().int().positive().optional().nullable(),
  laboratorio: z.string().optional().nullable(),
  concentracion: z.string().optional().nullable(),
  formaPresentacion: z.string().optional().nullable(),
  unidadMedida: z.string().optional().nullable(),
  precioCompra: z.preprocess((a) => (a ? parseFloat(String(a)) : null), z.number().min(0, "El precio de compra no puede ser negativo").nullable().optional()),
  precioVenta: z.preprocess((a) => (a !== null && a !== undefined && a !== "" ? parseFloat(String(a)) : 0), z.number().min(0, "El precio de venta no puede ser negativo").optional().default(0)),
  precioBlister: z.preprocess((a) => (a ? parseFloat(String(a)) : null), z.number().min(0.01, "El precio por blíster debe ser mayor a 0").nullable().optional()),
  precioCaja: z.preprocess((a) => (a ? parseFloat(String(a)) : null), z.number().min(0.01, "El precio por caja debe ser mayor a 0").nullable().optional()),
  unidadesPorBlister: z.preprocess((a) => (a ? parseInt(String(a), 10) : null), z.number().int().min(1).nullable().optional()),
  unidadesPorCaja: z.preprocess((a) => (a ? parseInt(String(a), 10) : null), z.number().int().min(1).nullable().optional()),
  blísteresPorCaja: z.preprocess((a) => (a ? parseInt(String(a), 10) : null), z.number().int().min(1).nullable().optional()),
  margenUtilidad: z.preprocess((a) => (a ? parseFloat(String(a)) : null), z.number().min(0).nullable().optional()),
  precioSugerido: z.preprocess((a) => (a ? parseFloat(String(a)) : null), z.number().min(0).nullable().optional()),
  stockMinimo: z.preprocess((a) => (a ? parseInt(String(a), 10) : null), z.number().int().min(0).nullable().optional()),
  stockInicial: z.preprocess((a) => (a !== null && a !== undefined && a !== "" ? parseInt(String(a), 10) : 0), z.number().int().min(0).optional().default(0)),
  loteInicial: z.string().optional().nullable(),
  fechaVencimientoInicial: z.string().optional().nullable(),
  esServicio: z.boolean().optional().default(false),
  esDatoPrueba: z.boolean().optional().default(false),
  activo: z.boolean().default(true),
}).refine(data => {
  const pv = data.precioVenta || 0;
  const pb = data.precioBlister || 0;
  const pc = data.precioCaja || 0;
  return pv > 0 || pb > 0 || pc > 0;
}, {
  message: "Debes definir al menos un precio de venta (unidad, blíster o caja) mayor a 0",
  path: ["precioVenta"]
}).refine(data => {
  if (data.precioBlister && data.precioBlister > 0 && (!data.unidadesPorBlister || data.unidadesPorBlister <= 0)) {
    return false;
  }
  return true;
}, {
  message: "Las unidades por blíster son obligatorias si defines un precio de blíster",
  path: ["unidadesPorBlister"]
}).refine(data => {
  if (data.precioCaja && data.precioCaja > 0 && (!data.unidadesPorCaja || data.unidadesPorCaja <= 0)) {
    return false;
  }
  return true;
}, {
  message: "Las unidades por caja son obligatorias si defines un precio de caja",
  path: ["unidadesPorCaja"]
}).refine(data => {
  if (data.precioBlister && data.precioBlister > 0 && data.precioVenta && data.precioVenta > 0) {
    return data.precioBlister >= data.precioVenta;
  }
  return true;
}, {
  message: "El precio por blíster debe ser mayor o igual al precio unitario",
  path: ["precioBlister"]
}).refine(data => {
  if (data.precioCaja && data.precioCaja > 0 && data.precioVenta && data.precioVenta > 0) {
    return data.precioCaja >= data.precioVenta;
  }
  return true;
}, {
  message: "El precio por caja debe ser mayor o igual al precio unitario",
  path: ["precioCaja"]
}).refine(data => {
  if (data.esServicio) return true;
  if (data.stockInicial && data.stockInicial > 0) {
    return !!data.loteInicial && data.loteInicial.trim() !== "";
  }
  return true;
}, {
  message: "El código de lote es obligatorio cuando el stock inicial es mayor a 0",
  path: ["loteInicial"]
}).refine(data => {
  if (data.esServicio) return true;
  if (data.stockInicial && data.stockInicial > 0) {
    return !!data.fechaVencimientoInicial && data.fechaVencimientoInicial.trim() !== "";
  }
  return true;
}, {
  message: "La fecha de vencimiento es obligatoria cuando el stock inicial es mayor a 0",
  path: ["fechaVencimientoInicial"]
}).refine(data => {
  if (data.esServicio) return true;
  if (data.fechaVencimientoInicial) {
    const dateVal = new Date(data.fechaVencimientoInicial + 'T00:00:00');
    if (isNaN(dateVal.getTime())) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateVal.setHours(0, 0, 0, 0);
    
    return dateVal >= today;
  }
  return true;
}, {
  message: "La fecha de vencimiento no puede ser anterior al día de hoy",
  path: ["fechaVencimientoInicial"]
});

export const productoUpdateSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  codigoBarras: z.string().optional().nullable(),
  descripcion: z.string().optional().nullable(),
  idCategoria: z.number({ message: "La categoría es obligatoria" }).int().positive("La categoría es obligatoria"),
  idLaboratorio: z.number().int().positive().optional().nullable(),
  laboratorio: z.string().optional().nullable(),
  concentracion: z.string().optional().nullable(),
  formaPresentacion: z.string().optional().nullable(),
  unidadMedida: z.string().optional().nullable(),
  precioCompra: z.preprocess((a) => (a ? parseFloat(String(a)) : null), z.number().min(0, "El precio de compra no puede ser negativo").nullable().optional()),
  precioVenta: z.preprocess((a) => (a !== null && a !== undefined && a !== "" ? parseFloat(String(a)) : 0), z.number().min(0, "El precio de venta no puede ser negativo").optional().default(0)),
  precioBlister: z.preprocess((a) => (a ? parseFloat(String(a)) : null), z.number().min(0.01, "El precio por blíster debe ser mayor a 0").nullable().optional()),
  precioCaja: z.preprocess((a) => (a ? parseFloat(String(a)) : null), z.number().min(0.01, "El precio por caja debe ser mayor a 0").nullable().optional()),
  unidadesPorBlister: z.preprocess((a) => (a ? parseInt(String(a), 10) : null), z.number().int().min(1).nullable().optional()),
  unidadesPorCaja: z.preprocess((a) => (a ? parseInt(String(a), 10) : null), z.number().int().min(1).nullable().optional()),
  blísteresPorCaja: z.preprocess((a) => (a ? parseInt(String(a), 10) : null), z.number().int().min(1).nullable().optional()),
  margenUtilidad: z.preprocess((a) => (a ? parseFloat(String(a)) : null), z.number().min(0).nullable().optional()),
  precioSugerido: z.preprocess((a) => (a ? parseFloat(String(a)) : null), z.number().min(0).nullable().optional()),
  stockMinimo: z.preprocess((a) => (a ? parseInt(String(a), 10) : null), z.number().int().min(0).nullable().optional()),
  esServicio: z.boolean().optional().default(false),
  esDatoPrueba: z.boolean().optional().default(false),
  activo: z.boolean().default(true),
}).refine(data => {
  const pv = data.precioVenta || 0;
  const pb = data.precioBlister || 0;
  const pc = data.precioCaja || 0;
  return pv > 0 || pb > 0 || pc > 0;
}, {
  message: "Debes definir al menos un precio de venta (unidad, blíster o caja) mayor a 0",
  path: ["precioVenta"]
}).refine(data => {
  if (data.precioBlister && data.precioBlister > 0 && (!data.unidadesPorBlister || data.unidadesPorBlister <= 0)) {
    return false;
  }
  return true;
}, {
  message: "Las unidades por blíster son obligatorias si defines un precio de blíster",
  path: ["unidadesPorBlister"]
}).refine(data => {
  if (data.precioCaja && data.precioCaja > 0 && (!data.unidadesPorCaja || data.unidadesPorCaja <= 0)) {
    return false;
  }
  return true;
}, {
  message: "Las unidades por caja son obligatorias si defines un precio de caja",
  path: ["unidadesPorCaja"]
}).refine(data => {
  if (data.precioBlister && data.precioBlister > 0 && data.precioVenta && data.precioVenta > 0) {
    return data.precioBlister >= data.precioVenta;
  }
  return true;
}, {
  message: "El precio por blíster debe ser mayor o igual al precio unitario",
  path: ["precioBlister"]
}).refine(data => {
  if (data.precioCaja && data.precioCaja > 0 && data.precioVenta && data.precioVenta > 0) {
    return data.precioCaja >= data.precioVenta;
  }
  return true;
}, {
  message: "El precio por caja debe ser mayor o igual al precio unitario",
  path: ["precioCaja"]
});

export const ventaSchema = z.object({
  idCliente: z.number().int().positive().optional().nullable(),
  metodoPago: z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA"]),
  nombrePodologo: z.string().optional().nullable(),
  numeroReceta: z.string().optional().nullable(),
  tipoComprobante: z.enum(["RECIBO", "FACTURA"]).default("RECIBO"),
  estado: z.enum(["COMPLETADA", "ANULADA", "PENDIENTE"]).default("COMPLETADA"),
  montoRecibido: z.number().min(0, "El monto recibido no puede ser negativo").optional().nullable(),
  cambio: z.number().min(0, "El cambio no puede ser negativo").optional().nullable(),
  rucCliente: z.string().trim().optional().nullable(),
  idDescuento: z.number().int().positive().optional().nullable(),
  descuentoTotal: z.number().min(0).optional().nullable(),
  detalles: z.array(z.object({
    idProducto: z.number().int().positive(),
    cantidad: z.number().int().positive("La cantidad debe ser mayor a 0"),
    precioUnitario: z.number().min(0.01, "El precio no puede ser cero ni negativo"),
    descuentoLinea: z.number().min(0).optional().nullable(),
    tipoUnidad: z.enum(["UNIDAD", "BLISTER", "CAJA"]).default("UNIDAD")
  }))
    .min(1, "La venta debe tener al menos un producto")
    .refine((detalles) => {
      // Prevenir stock bypass: no permitir el mismo producto repetido en una venta
      const ids = detalles.map(d => d.idProducto)
      return new Set(ids).size === ids.length
    }, { message: "No puedes agregar el mismo producto repetido en la misma venta" })
});

export const compraSchema = z.object({
  idProveedor: z.number().int().positive("El proveedor es requerido"),
  numeroFactura: z.string().optional().nullable(),
  fechaCompra: z.string().optional().nullable(),
  detalles: z.array(z.object({
    idProducto: z.number().int().positive("El producto es requerido"),
    cantidad: z.number().int().positive("La cantidad debe ser mayor a 0"),
    precioUnitario: z.number().min(0, "El precio unitario no puede ser negativo"),
    lote: z.string().trim().min(1, "El código de lote es obligatorio y no puede estar vacío"),
    fechaVencimiento: z.string().trim().min(1, "La fecha de vencimiento es obligatoria")
      .refine(val => {
        const dateVal = new Date(val + 'T00:00:00');
        if (isNaN(dateVal.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dateVal.setHours(0, 0, 0, 0);
        return dateVal >= today;
      }, { message: "La fecha de vencimiento no puede ser anterior al día de hoy" }),
  })).min(1, "La compra debe tener al menos un producto")
});

export const devolucionSchema = z.object({
  idempotencyKey: z.string().min(1, "Clave de idempotencia es requerida"),
  idProducto: z.number().int().positive("El producto es requerido"),
  idLote: z.number().int().positive("El lote es requerido"),
  idProveedor: z.number().int().positive().optional().nullable(),
  cantidad: z.number().int().positive("La cantidad debe ser mayor a 0"),
  motivo: z.enum(["VENCIDO", "PRÓXIMO_A_VENCER", "DAÑADO", "DEFECTUOSO", "RETIRO_DE_LABORATORIO", "ERROR_DE_COMPRA", "OTRO"]),
  observacion: z.string().optional().nullable(),
});

export const citaSchema = z.object({
  idCliente: z.number().int().positive("El cliente es requerido"),
  fecha: z.string().trim().min(1, "La fecha es requerida").refine(val => !isNaN(new Date(val).getTime()), "Fecha inválida"),
  motivo: z.string().optional().nullable(),
  estado: z.enum(["PENDIENTE", "COMPLETADA", "CANCELADA"]).default("PENDIENTE"),
});

export const atencionSchema = z.object({
  idCita: z.number().int().positive().optional().nullable(),
  idCliente: z.number().int().positive("El cliente es requerido"),
  idServicio: z.number().int().positive().optional().nullable(),
  subjetivo: z.string().trim().min(1, "El componente subjetivo es requerido"),
  objetivo: z.string().trim().min(1, "El componente objetivo es requerido"),
  analisis: z.string().trim().min(1, "El componente de análisis es requerido"),
  plan: z.string().trim().min(1, "El plan es requerido"),
});

export const recetaSchema = z.object({
  idAtencion: z.number().int().positive("La atención podológica es requerida"),
  idCliente: z.number().int().positive("El cliente es requerido"),
  fechaVencimiento: z.string().optional().nullable().refine(val => !val || !isNaN(new Date(val).getTime()), "Fecha de vencimiento inválida"),
  observaciones: z.string().optional().nullable(),
  detalles: z.array(z.object({
    idProducto: z.number().int().positive("El producto es requerido"),
    cantidad: z.number().int().positive("La cantidad debe ser mayor a 0"),
    indicaciones: z.string().optional().nullable(),
  })).min(1, "La receta debe contener al menos un producto/servicio"),
});

// Legacy backward-compatibility export
export const productoSchema = productoCreateSchema;
