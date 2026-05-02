import { z } from "zod"

export const productoSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  descripcion: z.string().optional().nullable(),
  idCategoria: z.number({ required_error: "La categoría es obligatoria" }).int().positive(),
  precioCompra: z.preprocess((a) => parseFloat(z.string().parse(a)), z.number().min(0, "El precio de compra no puede ser negativo")).optional().nullable(),
  precioVenta: z.preprocess((a) => parseFloat(z.string().parse(a)), z.number().min(0, "El precio de venta no puede ser negativo")),
  precioBlister: z.preprocess((a) => (a ? parseFloat(z.string().parse(a)) : null), z.number().min(0).nullable().optional()),
  precioCaja: z.preprocess((a) => (a ? parseFloat(z.string().parse(a)) : null), z.number().min(0).nullable().optional()),
  unidadesPorBlister: z.preprocess((a) => (a ? parseInt(z.string().parse(a), 10) : null), z.number().int().min(1).nullable().optional()),
  unidadesPorCaja: z.preprocess((a) => (a ? parseInt(z.string().parse(a), 10) : null), z.number().int().min(1).nullable().optional()),
  stockActual: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().int().min(0, "El stock no puede ser negativo")),
  stockMinimo: z.preprocess((a) => (a ? parseInt(z.string().parse(a), 10) : null), z.number().int().min(0).nullable().optional()),
  activo: z.boolean().default(true),
})

export const ventaSchema = z.object({
  idCliente: z.number().int().positive().optional().nullable(),
  metodoPago: z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA"]),
  nombrePodologo: z.string().optional().nullable(),
  numeroReceta: z.string().optional().nullable(),
  detalles: z.array(z.object({
    idProducto: z.number().int().positive(),
    cantidad: z.number().int().positive(),
    precioUnitario: z.number().min(0),
    tipoUnidad: z.enum(["UNIDAD", "BLISTER", "CAJA"]).default("UNIDAD")
  })).min(1, "La venta debe tener al menos un producto")
})
