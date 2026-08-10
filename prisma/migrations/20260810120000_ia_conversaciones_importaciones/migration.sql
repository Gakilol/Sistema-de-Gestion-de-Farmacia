-- Historial persistente y borradores conversacionales del asistente IA.
CREATE TABLE "IAConversacion" (
    "id" TEXT NOT NULL,
    "idUsuario" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL DEFAULT 'Nueva conversación',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IAConversacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IAMensaje" (
    "id" TEXT NOT NULL,
    "idConversacion" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IAMensaje_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IAImportacionProducto" (
    "id" TEXT NOT NULL,
    "idUsuario" INTEGER NOT NULL,
    "idConversacion" TEXT,
    "archivo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "filas" JSONB NOT NULL,
    "resumen" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IAImportacionProducto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IAConversacion_idUsuario_updatedAt_idx" ON "IAConversacion"("idUsuario", "updatedAt");
CREATE INDEX "IAMensaje_idConversacion_createdAt_idx" ON "IAMensaje"("idConversacion", "createdAt");
CREATE INDEX "IAImportacionProducto_idUsuario_estado_updatedAt_idx" ON "IAImportacionProducto"("idUsuario", "estado", "updatedAt");
CREATE INDEX "IAImportacionProducto_idConversacion_idx" ON "IAImportacionProducto"("idConversacion");

ALTER TABLE "IAConversacion"
  ADD CONSTRAINT "IAConversacion_idUsuario_fkey"
  FOREIGN KEY ("idUsuario") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IAMensaje"
  ADD CONSTRAINT "IAMensaje_idConversacion_fkey"
  FOREIGN KEY ("idConversacion") REFERENCES "IAConversacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IAImportacionProducto"
  ADD CONSTRAINT "IAImportacionProducto_idUsuario_fkey"
  FOREIGN KEY ("idUsuario") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IAImportacionProducto"
  ADD CONSTRAINT "IAImportacionProducto_idConversacion_fkey"
  FOREIGN KEY ("idConversacion") REFERENCES "IAConversacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
