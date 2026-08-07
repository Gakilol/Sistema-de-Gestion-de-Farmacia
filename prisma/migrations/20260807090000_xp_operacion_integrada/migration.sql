-- FarmaPOS - iteraciones XP: FEFO/recetas, caja y acceso temporal de paciente.
-- Migración aditiva: conserva columnas y relaciones heredadas.

ALTER TABLE "Venta" ADD COLUMN "idReceta" INTEGER;
ALTER TABLE "Venta" ADD COLUMN "idCaja" INTEGER;
ALTER TABLE "ExamenPaciente" ADD COLUMN "autorizadoPortal" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "CajaSesion" (
    "id" SERIAL NOT NULL,
    "idUsuario" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
    "abiertaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaEn" TIMESTAMP(3),
    "montoInicial" DECIMAL(10,2) NOT NULL,
    "montoFinalContado" DECIMAL(10,2),
    "montoEsperado" DECIMAL(10,2),
    "diferencia" DECIMAL(10,2),
    "observacionCierre" TEXT,
    "resueltaPor" INTEGER,
    "resueltaEn" TIMESTAMP(3),
    "resolucion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CajaSesion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CajaMovimiento" (
    "id" SERIAL NOT NULL,
    "idCaja" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "concepto" TEXT NOT NULL,
    "idUsuario" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CajaMovimiento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccesoPaciente" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "idCliente" INTEGER NOT NULL,
    "creadoPor" INTEGER NOT NULL,
    "expiracion" TIMESTAMP(3) NOT NULL,
    "revocado" BOOLEAN NOT NULL DEFAULT false,
    "incluirResultados" BOOLEAN NOT NULL DEFAULT false,
    "ultimoAcceso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccesoPaciente_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccesoPaciente_tokenHash_key" ON "AccesoPaciente"("tokenHash");
CREATE INDEX "Venta_idReceta_idx" ON "Venta"("idReceta");
CREATE INDEX "Venta_idCaja_idx" ON "Venta"("idCaja");
CREATE INDEX "Venta_fecha_estado_idx" ON "Venta"("fecha", "estado");
CREATE INDEX "Receta_estado_fechaVencimiento_idx" ON "Receta"("estado", "fechaVencimiento");
CREATE INDEX "Receta_idCliente_createdAt_idx" ON "Receta"("idCliente", "createdAt");
CREATE INDEX "CajaSesion_idUsuario_estado_idx" ON "CajaSesion"("idUsuario", "estado");
CREATE INDEX "CajaSesion_abiertaEn_idx" ON "CajaSesion"("abiertaEn");
CREATE INDEX "CajaMovimiento_idCaja_createdAt_idx" ON "CajaMovimiento"("idCaja", "createdAt");
CREATE INDEX "AccesoPaciente_idCliente_expiracion_idx" ON "AccesoPaciente"("idCliente", "expiracion");
CREATE INDEX "AccesoPaciente_expiracion_revocado_idx" ON "AccesoPaciente"("expiracion", "revocado");

ALTER TABLE "Venta" ADD CONSTRAINT "Venta_idReceta_fkey" FOREIGN KEY ("idReceta") REFERENCES "Receta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_idCaja_fkey" FOREIGN KEY ("idCaja") REFERENCES "CajaSesion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CajaSesion" ADD CONSTRAINT "CajaSesion_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CajaMovimiento" ADD CONSTRAINT "CajaMovimiento_idCaja_fkey" FOREIGN KEY ("idCaja") REFERENCES "CajaSesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CajaMovimiento" ADD CONSTRAINT "CajaMovimiento_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccesoPaciente" ADD CONSTRAINT "AccesoPaciente_idCliente_fkey" FOREIGN KEY ("idCliente") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccesoPaciente" ADD CONSTRAINT "AccesoPaciente_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PostgreSQL garantiza una sola caja abierta por usuario incluso con solicitudes concurrentes.
CREATE UNIQUE INDEX "CajaSesion_usuario_abierta_key"
ON "CajaSesion"("idUsuario") WHERE "estado" = 'ABIERTA';
