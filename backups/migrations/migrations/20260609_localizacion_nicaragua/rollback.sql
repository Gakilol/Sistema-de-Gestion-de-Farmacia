BEGIN;

-- 1. Eliminar columnas agregadas a Venta
ALTER TABLE "Venta" DROP COLUMN IF EXISTS "tipoComprobante";
ALTER TABLE "Venta" DROP COLUMN IF EXISTS "estado";
ALTER TABLE "Venta" DROP COLUMN IF EXISTS "montoRecibido";
ALTER TABLE "Venta" DROP COLUMN IF EXISTS "cambio";
ALTER TABLE "Venta" DROP COLUMN IF EXISTS "rucCliente";

-- 2. Eliminar columna RUC e índice de Cliente
DROP INDEX IF EXISTS "Cliente_ruc_key";
ALTER TABLE "Cliente" DROP COLUMN IF EXISTS "ruc";

COMMIT;
