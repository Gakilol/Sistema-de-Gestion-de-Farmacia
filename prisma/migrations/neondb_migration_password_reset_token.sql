-- ============================================================
-- MIGRACIÓN: add_password_reset_token
-- Fecha: 2026-06-05
-- Descripción: Agrega tabla para recuperación segura de contraseñas
--              mediante tokens SHA-256 con expiración de 30 minutos.
-- ============================================================
-- INSTRUCCIONES NEONDB:
-- 1. Ve a tu proyecto en https://console.neon.tech
-- 2. Abre el SQL Editor
-- 3. Pega y ejecuta este script completo
-- ============================================================

-- CreateTable
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" SERIAL NOT NULL,
    "correo" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiracion" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (token debe ser único para evitar colisiones)
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex (índice por correo para búsquedas rápidas y rate-limiting)
CREATE INDEX IF NOT EXISTS "PasswordResetToken_correo_idx" ON "PasswordResetToken"("correo");

-- CreateIndex (índice por hash para verificación rápida)
CREATE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_idx" ON "PasswordResetToken"("tokenHash");

-- ============================================================
-- VERIFICACIÓN: confirma que la tabla fue creada correctamente
-- ============================================================
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'PasswordResetToken'
ORDER BY ordinal_position;
