-- ============================================================
-- SCRIPT DE ROLLBACK V2 - FARMAPOS
-- Fecha: 2026-06-18
-- Descripción: Revierte de forma segura las modificaciones de la V2.
-- ============================================================

-- 1. Eliminar índices nuevos
DROP INDEX IF EXISTS "PasswordResetRequest_ip_createdAt_idx";
DROP INDEX IF EXISTS "PasswordResetRequest_correo_createdAt_idx";
DROP INDEX IF EXISTS "Venta_fecha_idx";
DROP INDEX IF EXISTS "Lote_fechaVencimiento_idx";

-- 2. Eliminar constraints de unicidad nuevos
ALTER TABLE "Lote" DROP CONSTRAINT IF EXISTS "Lote_idProducto_codigoLote_key";

-- 3. Eliminar columnas agregadas
ALTER TABLE "MovimientoInventario" DROP COLUMN IF EXISTS "observacion";

ALTER TABLE "Producto" DROP COLUMN IF EXISTS "laboratorio";
ALTER TABLE "Producto" DROP COLUMN IF EXISTS "concentracion";
ALTER TABLE "Producto" DROP COLUMN IF EXISTS "unidadMedida";

ALTER TABLE "PasswordResetToken" DROP COLUMN IF EXISTS "ipOrigen";
ALTER TABLE "PasswordResetToken" DROP COLUMN IF EXISTS "intentosFallidos";

-- 4. Eliminar tablas creadas
DROP TABLE IF EXISTS "PasswordResetRequest" CASCADE;
