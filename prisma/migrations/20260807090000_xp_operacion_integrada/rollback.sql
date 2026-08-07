DROP INDEX IF EXISTS "CajaSesion_usuario_abierta_key";
DROP TABLE IF EXISTS "AccesoPaciente";
DROP TABLE IF EXISTS "CajaMovimiento";
ALTER TABLE "Venta" DROP CONSTRAINT IF EXISTS "Venta_idCaja_fkey";
DROP TABLE IF EXISTS "CajaSesion";
ALTER TABLE "Venta" DROP CONSTRAINT IF EXISTS "Venta_idReceta_fkey";
ALTER TABLE "Venta" DROP COLUMN IF EXISTS "idCaja";
ALTER TABLE "Venta" DROP COLUMN IF EXISTS "idReceta";
ALTER TABLE "ExamenPaciente" DROP COLUMN IF EXISTS "autorizadoPortal";
