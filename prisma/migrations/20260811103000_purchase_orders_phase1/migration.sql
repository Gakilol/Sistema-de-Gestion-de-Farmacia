-- Ordenes de compra: separan la planificacion/aprobacion de la entrada real a inventario.
CREATE TABLE "OrdenCompra" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "idProveedor" INTEGER NOT NULL,
    "totalEstimado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "idCreadoPor" INTEGER NOT NULL,
    "idAprobadoPor" INTEGER,
    "aprobadaEn" TIMESTAMP(3),
    "recibidaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrdenCompra_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DetalleOrdenCompra" (
    "id" SERIAL NOT NULL,
    "idOrdenCompra" INTEGER NOT NULL,
    "idProducto" INTEGER NOT NULL,
    "cantidadSolicitada" INTEGER NOT NULL,
    "cantidadRecibida" INTEGER NOT NULL DEFAULT 0,
    "costoUnitario" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DetalleOrdenCompra_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Compra" ADD COLUMN "idOrdenCompra" INTEGER;

CREATE UNIQUE INDEX "OrdenCompra_codigo_key" ON "OrdenCompra"("codigo");
CREATE INDEX "OrdenCompra_estado_createdAt_idx" ON "OrdenCompra"("estado", "createdAt");
CREATE INDEX "OrdenCompra_idProveedor_idx" ON "OrdenCompra"("idProveedor");
CREATE UNIQUE INDEX "DetalleOrdenCompra_idOrdenCompra_idProducto_key" ON "DetalleOrdenCompra"("idOrdenCompra", "idProducto");
CREATE INDEX "DetalleOrdenCompra_idProducto_idx" ON "DetalleOrdenCompra"("idProducto");
CREATE INDEX "Compra_idOrdenCompra_idx" ON "Compra"("idOrdenCompra");

ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_idProveedor_fkey" FOREIGN KEY ("idProveedor") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_idCreadoPor_fkey" FOREIGN KEY ("idCreadoPor") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_idAprobadoPor_fkey" FOREIGN KEY ("idAprobadoPor") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DetalleOrdenCompra" ADD CONSTRAINT "DetalleOrdenCompra_idOrdenCompra_fkey" FOREIGN KEY ("idOrdenCompra") REFERENCES "OrdenCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DetalleOrdenCompra" ADD CONSTRAINT "DetalleOrdenCompra_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_idOrdenCompra_fkey" FOREIGN KEY ("idOrdenCompra") REFERENCES "OrdenCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
