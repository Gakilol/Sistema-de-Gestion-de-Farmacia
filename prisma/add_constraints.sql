-- ============================================================
-- RESTRICCIONES DE INTEGRIDAD PARA EVITAR STOCK NEGATIVO
-- ============================================================

-- Restricción en la tabla Producto
ALTER TABLE "Producto" 
ADD CONSTRAINT "chk_stock_no_negativo" CHECK ("stockActual" >= 0);

-- Restricción en la tabla Lote
ALTER TABLE "Lote" 
ADD CONSTRAINT "chk_stock_lote_no_negativo" CHECK ("stockActual" >= 0);
