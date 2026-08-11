ALTER TABLE "Cliente"
  ADD COLUMN "canalPreferido" TEXT NOT NULL DEFAULT 'INTERNO',
  ADD COLUMN "consentimientoWhatsApp" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consentimientoEmail" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consentimientoSms" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consentimientoActualizadoEn" TIMESTAMP(3),
  ADD COLUMN "puntosFidelidad" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nivelFidelidad" TEXT NOT NULL DEFAULT 'BRONCE',
  ADD COLUMN "saldoFavor" DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE "ProveedorProducto"
  ADD COLUMN "tiempoEntregaDias" INTEGER NOT NULL DEFAULT 7;

ALTER TABLE "Venta"
  ADD COLUMN "descuentoFidelizacion" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "saldoAplicado" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "puntosGanados" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ComunicacionCliente" (
  "id" SERIAL NOT NULL,
  "idCliente" INTEGER NOT NULL,
  "tipo" TEXT NOT NULL,
  "canal" TEXT NOT NULL,
  "destino" TEXT NOT NULL,
  "asunto" TEXT,
  "mensaje" TEXT NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
  "proveedorId" TEXT,
  "resultado" TEXT,
  "idUsuario" INTEGER NOT NULL,
  "enviadoEn" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ComunicacionCliente_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MovimientoFidelizacion" (
  "id" SERIAL NOT NULL,
  "idCliente" INTEGER NOT NULL,
  "tipo" TEXT NOT NULL,
  "puntos" INTEGER NOT NULL DEFAULT 0,
  "monto" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "idVenta" INTEGER,
  "referencia" TEXT,
  "idUsuario" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MovimientoFidelizacion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ComunicacionCliente_idCliente_createdAt_idx" ON "ComunicacionCliente"("idCliente", "createdAt");
CREATE INDEX "ComunicacionCliente_estado_createdAt_idx" ON "ComunicacionCliente"("estado", "createdAt");
CREATE INDEX "MovimientoFidelizacion_idCliente_createdAt_idx" ON "MovimientoFidelizacion"("idCliente", "createdAt");
CREATE INDEX "MovimientoFidelizacion_idVenta_idx" ON "MovimientoFidelizacion"("idVenta");

ALTER TABLE "ComunicacionCliente" ADD CONSTRAINT "ComunicacionCliente_idCliente_fkey" FOREIGN KEY ("idCliente") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComunicacionCliente" ADD CONSTRAINT "ComunicacionCliente_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MovimientoFidelizacion" ADD CONSTRAINT "MovimientoFidelizacion_idCliente_fkey" FOREIGN KEY ("idCliente") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MovimientoFidelizacion" ADD CONSTRAINT "MovimientoFidelizacion_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
