ALTER TABLE "Venta" ADD COLUMN "estadoEntrega" TEXT NOT NULL DEFAULT 'ENTREGADA';

CREATE TABLE "VentaPausada" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PAUSADA',
    "idCliente" INTEGER,
    "idUsuario" INTEGER NOT NULL,
    "recuperadaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VentaPausada_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DevolucionVenta" (
    "id" SERIAL NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "idVenta" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'DEVOLUCION',
    "motivo" TEXT NOT NULL,
    "observacion" TEXT,
    "reintegrarStock" BOOLEAN NOT NULL DEFAULT false,
    "total" DECIMAL(10,2) NOT NULL,
    "creditoGenerado" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'COMPLETADA',
    "idUsuario" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DevolucionVenta_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DetalleDevolucionVenta" (
    "id" SERIAL NOT NULL,
    "idDevolucionVenta" INTEGER NOT NULL,
    "idDetalleVenta" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "cantidadBase" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "lotes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DetalleDevolucionVenta_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VentaPausada_estado_updatedAt_idx" ON "VentaPausada"("estado", "updatedAt");
CREATE INDEX "VentaPausada_idUsuario_estado_idx" ON "VentaPausada"("idUsuario", "estado");
CREATE UNIQUE INDEX "DevolucionVenta_idempotencyKey_key" ON "DevolucionVenta"("idempotencyKey");
CREATE INDEX "DevolucionVenta_idVenta_createdAt_idx" ON "DevolucionVenta"("idVenta", "createdAt");
CREATE INDEX "DevolucionVenta_tipo_estado_idx" ON "DevolucionVenta"("tipo", "estado");
CREATE INDEX "DetalleDevolucionVenta_idDetalleVenta_idx" ON "DetalleDevolucionVenta"("idDetalleVenta");

ALTER TABLE "VentaPausada" ADD CONSTRAINT "VentaPausada_idCliente_fkey" FOREIGN KEY ("idCliente") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VentaPausada" ADD CONSTRAINT "VentaPausada_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DevolucionVenta" ADD CONSTRAINT "DevolucionVenta_idVenta_fkey" FOREIGN KEY ("idVenta") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DevolucionVenta" ADD CONSTRAINT "DevolucionVenta_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DetalleDevolucionVenta" ADD CONSTRAINT "DetalleDevolucionVenta_idDevolucionVenta_fkey" FOREIGN KEY ("idDevolucionVenta") REFERENCES "DevolucionVenta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DetalleDevolucionVenta" ADD CONSTRAINT "DetalleDevolucionVenta_idDetalleVenta_fkey" FOREIGN KEY ("idDetalleVenta") REFERENCES "DetalleVenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
