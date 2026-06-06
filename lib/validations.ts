import { z } from "zod"

export const nicaraguaCedulaRegex = /^\d{3}-\d{6}-\d{4}[A-Za-z]$/;
export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._\-#])[A-Za-z\d@$!%*?&._\-#]{8,}$/;

export const emptyToNull = (val: string | undefined | null) => val === "" ? null : val;

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
    z.string().trim().regex(nicaraguaCedulaRegex, "Formato de cédula de Nicaragua inválido (ej: 001-130605-1005A)").nullable().optional()
  ),
  telefono: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return null;
      if (typeof val !== "string") return val;
      const trimmed = val.trim();
      if (trimmed === "") return null;
      return trimmed.replace(/[\s-]/g, "");
    },
    z.string().trim().regex(/^\d{8}$/, "El teléfono debe tener exactamente 8 dígitos numéricos").nullable().optional()
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
  ),
  direccion: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return null;
      if (typeof val !== "string") return val;
      const trimmed = val.trim();
      if (trimmed === "") return null;
      return trimmed;
    },
    z.string().trim().nullable().optional()
  ),
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

export const productoSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  codigoBarras: z.string().optional().nullable(),
  descripcion: z.string().optional().nullable(),
  idCategoria: z.number({ message: "La categoría es obligatoria" }).int().positive("La categoría es obligatoria"),
  precioCompra: z.preprocess((a) => (a ? parseFloat(String(a)) : null), z.number().min(0, "El precio de compra no puede ser negativo").nullable().optional()),
  precioVenta: z.preprocess((a) => (a !== null && a !== undefined && a !== "" ? parseFloat(String(a)) : 0), z.number().min(0, "El precio de venta no puede ser negativo").optional().default(0)),
  precioBlister: z.preprocess((a) => (a ? parseFloat(String(a)) : null), z.number().min(0.01, "El precio por blíster debe ser mayor a 0").nullable().optional()),
  precioCaja: z.preprocess((a) => (a ? parseFloat(String(a)) : null), z.number().min(0.01, "El precio por caja debe ser mayor a 0").nullable().optional()),
  unidadesPorBlister: z.preprocess((a) => (a ? parseInt(String(a), 10) : null), z.number().int().min(1).nullable().optional()),
  unidadesPorCaja: z.preprocess((a) => (a ? parseInt(String(a), 10) : null), z.number().int().min(1).nullable().optional()),
  stockMinimo: z.preprocess((a) => (a ? parseInt(String(a), 10) : null), z.number().int().min(0).nullable().optional()),
  activo: z.boolean().default(true),
}).refine(data => {
  const pv = data.precioVenta || 0;
  const pb = data.precioBlister || 0;
  const pc = data.precioCaja || 0;
  return pv > 0 || pb > 0 || pc > 0;
}, {
  message: "Debes definir al menos un precio de venta (unidad, blíster o caja) mayor a 0",
  path: ["precioVenta"]
});

export const ventaSchema = z.object({
  idCliente: z.number().int().positive().optional().nullable(),
  metodoPago: z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA"]),
  nombrePodologo: z.string().optional().nullable(),
  numeroReceta: z.string().optional().nullable(),
  detalles: z.array(z.object({
    idProducto: z.number().int().positive(),
    cantidad: z.number().int().positive("La cantidad debe ser mayor a 0"),
    precioUnitario: z.number().min(0.01, "El precio no puede ser cero ni negativo"),
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
    lote: z.string().optional().nullable(),
    fechaVencimiento: z.string().optional().nullable(),
  })).min(1, "La compra debe tener al menos un producto")
});

