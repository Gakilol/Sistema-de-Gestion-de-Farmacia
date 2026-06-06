-- Migration: Drop unused product columns (imagen, descripcionCorta, descripcionDetallada, observaciones)
-- NeonDB & Local PostgreSQL compatible

ALTER TABLE "Producto" DROP COLUMN IF EXISTS "descripcionCorta";
ALTER TABLE "Producto" DROP COLUMN IF EXISTS "descripcionDetallada";
ALTER TABLE "Producto" DROP COLUMN IF EXISTS "observaciones";
ALTER TABLE "Producto" DROP COLUMN IF EXISTS "imagen";
