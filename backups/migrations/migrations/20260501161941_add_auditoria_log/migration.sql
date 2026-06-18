-- AlterTable
ALTER TABLE "DetalleVenta" ADD COLUMN     "tipoUnidad" TEXT NOT NULL DEFAULT 'UNIDAD';

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "unidadesPorBlister" INTEGER,
ADD COLUMN     "unidadesPorCaja" INTEGER;

-- CreateTable
CREATE TABLE "AuditoriaLog" (
    "id" SERIAL NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" INTEGER,
    "detalles" TEXT,
    "idUsuario" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditoriaLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AuditoriaLog" ADD CONSTRAINT "AuditoriaLog_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
