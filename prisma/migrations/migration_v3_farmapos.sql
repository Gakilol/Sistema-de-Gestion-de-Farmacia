-- =========================================================================
-- MIGRACIÓN V3: FORMAS FARMACÉUTICAS, DESCUENTOS EXPANDIDOS, AUDITORÍA AMPLIADA Y MEJORAS CLÍNICAS
-- SISTEMA DE GESTIÓN DE FARMACIA - FARMAPOS / PODOCARE
-- =========================================================================

-- 1. Alterar tabla Usuario para soportar eliminación lógica con fecha/hora
ALTER TABLE "Usuario" ADD COLUMN "eliminadoEn" TIMESTAMP(3);

-- 2. Alterar tabla ServicioPodologia para soportar campo observaciones
ALTER TABLE "ServicioPodologia" ADD COLUMN "observaciones" TEXT;

-- 3. Crear tabla FormaFarmaceutica
CREATE TABLE "FormaFarmaceutica" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormaFarmaceutica_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FormaFarmaceutica_nombre_key" ON "FormaFarmaceutica"("nombre");

-- 4. Alterar tabla Producto para enlazar con FormaFarmaceutica
ALTER TABLE "Producto" ADD COLUMN "idFormaFarmaceutica" INTEGER;
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_idFormaFarmaceutica_fkey" FOREIGN KEY ("idFormaFarmaceutica") REFERENCES "FormaFarmaceutica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Alterar tabla AuditoriaLog para soportar campos ampliados de auditoría
ALTER TABLE "AuditoriaLog" ADD COLUMN "datosAnteriores" JSONB;
ALTER TABLE "AuditoriaLog" ADD COLUMN "datosNuevos" JSONB;
ALTER TABLE "AuditoriaLog" ADD COLUMN "ip" TEXT;
ALTER TABLE "AuditoriaLog" ADD COLUMN "motivo" TEXT;

-- 6. Alterar tabla Descuento para expandir funcionalidad de descuentos
ALTER TABLE "Descuento" ADD COLUMN "nombre" TEXT NOT NULL DEFAULT 'Descuento';
ALTER TABLE "Descuento" ADD COLUMN "descripcion" TEXT;
ALTER TABLE "Descuento" ADD COLUMN "tipoAplicacion" TEXT NOT NULL DEFAULT 'VENTA_GENERAL';
ALTER TABLE "Descuento" ADD COLUMN "tipoValor" TEXT NOT NULL DEFAULT 'PORCENTAJE';
ALTER TABLE "Descuento" ADD COLUMN "montoMinimoCompra" DECIMAL(10,2);
ALTER TABLE "Descuento" ADD COLUMN "cantidadMinima" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Descuento" ADD COLUMN "limiteUso" INTEGER;
ALTER TABLE "Descuento" ADD COLUMN "usosActuales" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Descuento" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Descuento" ALTER COLUMN "tipo" DROP NOT NULL;

-- 7. Crear tablas relacionales de descuento para Producto, Categoría y Cliente
CREATE TABLE "DescuentoProducto" (
    "id" SERIAL NOT NULL,
    "idDescuento" INTEGER NOT NULL,
    "idProducto" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DescuentoProducto_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DescuentoProducto_idDescuento_idProducto_key" ON "DescuentoProducto"("idDescuento", "idProducto");
CREATE INDEX "DescuentoProducto_idDescuento_idx" ON "DescuentoProducto"("idDescuento");
CREATE INDEX "DescuentoProducto_idProducto_idx" ON "DescuentoProducto"("idProducto");
ALTER TABLE "DescuentoProducto" ADD CONSTRAINT "DescuentoProducto_idDescuento_fkey" FOREIGN KEY ("idDescuento") REFERENCES "Descuento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DescuentoProducto" ADD CONSTRAINT "DescuentoProducto_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DescuentoCategoria" (
    "id" SERIAL NOT NULL,
    "idDescuento" INTEGER NOT NULL,
    "idCategoria" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DescuentoCategoria_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DescuentoCategoria_idDescuento_idCategoria_key" ON "DescuentoCategoria"("idDescuento", "idCategoria");
CREATE INDEX "DescuentoCategoria_idDescuento_idx" ON "DescuentoCategoria"("idDescuento");
CREATE INDEX "DescuentoCategoria_idCategoria_idx" ON "DescuentoCategoria"("idCategoria");
ALTER TABLE "DescuentoCategoria" ADD CONSTRAINT "DescuentoCategoria_idDescuento_fkey" FOREIGN KEY ("idDescuento") REFERENCES "Descuento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DescuentoCategoria" ADD CONSTRAINT "DescuentoCategoria_idCategoria_fkey" FOREIGN KEY ("idCategoria") REFERENCES "CategoriaProducto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DescuentoCliente" (
    "id" SERIAL NOT NULL,
    "idDescuento" INTEGER NOT NULL,
    "idCliente" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DescuentoCliente_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DescuentoCliente_idDescuento_idCliente_key" ON "DescuentoCliente"("idDescuento", "idCliente");
CREATE INDEX "DescuentoCliente_idDescuento_idx" ON "DescuentoCliente"("idDescuento");
CREATE INDEX "DescuentoCliente_idCliente_idx" ON "DescuentoCliente"("idCliente");
ALTER TABLE "DescuentoCliente" ADD CONSTRAINT "DescuentoCliente_idDescuento_fkey" FOREIGN KEY ("idDescuento") REFERENCES "Descuento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DescuentoCliente" ADD CONSTRAINT "DescuentoCliente_idCliente_fkey" FOREIGN KEY ("idCliente") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
