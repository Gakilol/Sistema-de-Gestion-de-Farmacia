BEGIN;

-- 1. Agregar columna RUC a Cliente
ALTER TABLE "Cliente" ADD COLUMN "ruc" VARCHAR(20);
CREATE UNIQUE INDEX "Cliente_ruc_key" ON "Cliente"("ruc");

-- 2. Agregar columnas de facturación local e historial fiscal a Venta
ALTER TABLE "Venta" ADD COLUMN "tipoComprobante" VARCHAR(20) DEFAULT 'RECIBO';
ALTER TABLE "Venta" ADD COLUMN "estado" VARCHAR(20) DEFAULT 'COMPLETADA';
ALTER TABLE "Venta" ADD COLUMN "montoRecibido" DECIMAL(10, 2);
ALTER TABLE "Venta" ADD COLUMN "cambio" DECIMAL(10, 2);
ALTER TABLE "Venta" ADD COLUMN "rucCliente" VARCHAR(20);

COMMIT;
