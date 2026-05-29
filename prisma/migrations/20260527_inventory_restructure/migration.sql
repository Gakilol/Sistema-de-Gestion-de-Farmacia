-- ============================================================
-- MIGRATION: Inventory Restructure — Batches, Movements, Kardex
-- Sistema de Gestión de Farmacia
-- Date: 2026-05-27
-- SAFE: Non-destructive, ADD-only. Does NOT drop existing columns.
-- ============================================================

-- 1. Add new columns to Producto (barcode, image)
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "codigoBarras" TEXT;
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "imagen" TEXT;

-- Create unique index for barcode (partial — only non-null)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'Producto_codigoBarras_key'
  ) THEN
    CREATE UNIQUE INDEX "Producto_codigoBarras_key" ON "Producto"("codigoBarras") WHERE "codigoBarras" IS NOT NULL;
  END IF;
END $$;

-- 2. Add new columns to Compra (invoice number, purchase date)
ALTER TABLE "Compra" ADD COLUMN IF NOT EXISTS "numeroFactura" TEXT;
ALTER TABLE "Compra" ADD COLUMN IF NOT EXISTS "fechaCompra" TIMESTAMP(3);

-- 3. Add new columns to DetalleCompra (batch code, expiry date)
ALTER TABLE "DetalleCompra" ADD COLUMN IF NOT EXISTS "lote" TEXT;
ALTER TABLE "DetalleCompra" ADD COLUMN IF NOT EXISTS "fechaVencimiento" TIMESTAMP(3);

-- 4. Create Lote table
CREATE TABLE IF NOT EXISTS "Lote" (
    "id"                SERIAL NOT NULL,
    "idProducto"        INTEGER NOT NULL,
    "codigoLote"        TEXT NOT NULL,
    "fechaVencimiento"  TIMESTAMP(3),
    "stockInicial"      INTEGER NOT NULL DEFAULT 0,
    "stockActual"       INTEGER NOT NULL DEFAULT 0,
    "costoCompra"       DECIMAL(10,2) NOT NULL DEFAULT 0,
    "idDetalleCompra"   INTEGER,
    "activo"            BOOLEAN NOT NULL DEFAULT true,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- Foreign keys for Lote
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Lote_idProducto_fkey'
  ) THEN
    ALTER TABLE "Lote"
      ADD CONSTRAINT "Lote_idProducto_fkey"
      FOREIGN KEY ("idProducto") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Lote_idDetalleCompra_fkey'
  ) THEN
    ALTER TABLE "Lote"
      ADD CONSTRAINT "Lote_idDetalleCompra_fkey"
      FOREIGN KEY ("idDetalleCompra") REFERENCES "DetalleCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Index on Lote for product lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'Lote_idProducto_idx'
  ) THEN
    CREATE INDEX "Lote_idProducto_idx" ON "Lote"("idProducto");
  END IF;
END $$;

-- 5. Create MovimientoInventario table
CREATE TABLE IF NOT EXISTS "MovimientoInventario" (
    "id"            SERIAL NOT NULL,
    "idProducto"    INTEGER NOT NULL,
    "idLote"        INTEGER,
    "tipo"          TEXT NOT NULL,  -- 'ENTRADA_COMPRA', 'SALIDA_VENTA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'
    "cantidad"      INTEGER NOT NULL,
    "stockResultante" INTEGER NOT NULL DEFAULT 0,
    "costoUnitario" DECIMAL(10,2),
    "referencia"    TEXT,           -- e.g. 'Compra #12', 'Venta #45', 'Ajuste: Inventario Físico'
    "idUsuario"     INTEGER,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoInventario_pkey" PRIMARY KEY ("id")
);

-- Foreign keys for MovimientoInventario
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'MovimientoInventario_idProducto_fkey'
  ) THEN
    ALTER TABLE "MovimientoInventario"
      ADD CONSTRAINT "MovimientoInventario_idProducto_fkey"
      FOREIGN KEY ("idProducto") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'MovimientoInventario_idLote_fkey'
  ) THEN
    ALTER TABLE "MovimientoInventario"
      ADD CONSTRAINT "MovimientoInventario_idLote_fkey"
      FOREIGN KEY ("idLote") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'MovimientoInventario_idUsuario_fkey'
  ) THEN
    ALTER TABLE "MovimientoInventario"
      ADD CONSTRAINT "MovimientoInventario_idUsuario_fkey"
      FOREIGN KEY ("idUsuario") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Indexes for MovimientoInventario
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'MovimientoInventario_idProducto_idx'
  ) THEN
    CREATE INDEX "MovimientoInventario_idProducto_idx" ON "MovimientoInventario"("idProducto");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'MovimientoInventario_createdAt_idx'
  ) THEN
    CREATE INDEX "MovimientoInventario_createdAt_idx" ON "MovimientoInventario"("createdAt");
  END IF;
END $$;

-- 6. Update event trigger protection list to include new tables
CREATE OR REPLACE FUNCTION fn_evt_proteger_drop()
RETURNS event_trigger AS $$
DECLARE
    obj RECORD;
    tablas_protegidas TEXT[] := ARRAY[
        'Producto', 'Venta', 'DetalleVenta', 'Cliente',
        'Usuario', 'Rol', 'Compra', 'DetalleCompra',
        'Proveedor', 'CategoriaProducto', 'AuditoriaLog',
        'Lote', 'MovimientoInventario'
    ];
BEGIN
    FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
    LOOP
        INSERT INTO "AuditoriaDDL" (evento, nombre_objeto, tipo_objeto, esquema, usuario, consulta_sql)
        VALUES ('DROP (BLOQUEADO)', obj.object_identity, obj.object_type, obj.schema_name, current_user, current_query());

        IF obj.object_type = 'table' THEN
            DECLARE
                nombre_tabla TEXT;
            BEGIN
                nombre_tabla := split_part(obj.object_identity, '.', 2);
                IF nombre_tabla = ANY(tablas_protegidas) THEN
                    RAISE EXCEPTION '⛔ BLOQUEADO: No se puede eliminar la tabla "%" - es una tabla crítica del sistema.', nombre_tabla;
                END IF;
            END;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Done!
