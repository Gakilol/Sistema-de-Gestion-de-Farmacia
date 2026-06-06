-- Rollback: Recreate dropped product columns (imagen, descripcionCorta, descripcionDetallada, observaciones)
-- NeonDB & Local PostgreSQL compatible

ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "descripcionCorta" TEXT;
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "descripcionDetallada" TEXT;
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "observaciones" TEXT;
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "imagen" TEXT;
