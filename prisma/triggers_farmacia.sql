-- ============================================================
-- TRIGGERS PARA SISTEMA DE GESTIÓN DE FARMACIA
-- Copiar y pegar en pgAdmin4 > Query Tool
-- ============================================================

-- ************************************************************
-- PASO 1: CREAR LAS TABLAS AUXILIARES
-- Estas tablas almacenan los datos que los triggers van a llenar
-- ************************************************************

-- 1A. Tabla: Historial de compras por cliente
-- Registra qué productos compra cada cliente y cuántas veces
CREATE TABLE IF NOT EXISTS "ClienteProductoStats" (
    id              SERIAL PRIMARY KEY,
    "idCliente"     INT NOT NULL REFERENCES "Cliente"(id) ON DELETE CASCADE,
    "idProducto"    INT NOT NULL REFERENCES "Producto"(id) ON DELETE CASCADE,
    "totalComprado" INT NOT NULL DEFAULT 0,          -- cantidad total de unidades
    "vecesComprado" INT NOT NULL DEFAULT 0,          -- cuántas veces lo ha comprado
    "ultimaCompra"  TIMESTAMP DEFAULT NOW(),
    UNIQUE("idCliente", "idProducto")
);

-- 1B. Tabla: Estadísticas de productos más vendidos
-- Acumula las ventas totales de cada producto
CREATE TABLE IF NOT EXISTS "ProductoVentaStats" (
    id                  SERIAL PRIMARY KEY,
    "idProducto"        INT NOT NULL UNIQUE REFERENCES "Producto"(id) ON DELETE CASCADE,
    "totalUnidadesVendidas" INT NOT NULL DEFAULT 0,
    "totalVecesVendido"     INT NOT NULL DEFAULT 0,
    "ingresoTotal"          DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ultimaVenta"           TIMESTAMP DEFAULT NOW()
);

-- 1C. Tabla: Alertas de stock bajo
-- Guarda alertas automáticas cuando un producto baja del stock mínimo
CREATE TABLE IF NOT EXISTS "AlertaStockBajo" (
    id              SERIAL PRIMARY KEY,
    "idProducto"    INT NOT NULL REFERENCES "Producto"(id) ON DELETE CASCADE,
    "nombreProducto" VARCHAR(255) NOT NULL,
    "stockActual"   INT NOT NULL,
    "stockMinimo"   INT NOT NULL,
    "fechaAlerta"   TIMESTAMP DEFAULT NOW(),
    "resuelta"      BOOLEAN DEFAULT FALSE
);

-- 1D. Tabla: Historial de cambios de precio
-- Registra cada vez que se modifica el precio de un producto
CREATE TABLE IF NOT EXISTS "HistorialPrecios" (
    id                  SERIAL PRIMARY KEY,
    "idProducto"        INT NOT NULL REFERENCES "Producto"(id) ON DELETE CASCADE,
    "nombreProducto"    VARCHAR(255) NOT NULL,
    "precioVentaAnterior"   DECIMAL(10,2),
    "precioVentaNuevo"      DECIMAL(10,2),
    "precioCompraAnterior"  DECIMAL(10,2),
    "precioCompraNuevo"     DECIMAL(10,2),
    "fechaCambio"           TIMESTAMP DEFAULT NOW()
);


-- ************************************************************
-- PASO 2: CREAR LAS FUNCIONES DE LOS TRIGGERS
-- ************************************************************

-- ============================================================
-- TRIGGER 1: RASTREO DE COMPRAS POR CLIENTE
-- Se ejecuta cada vez que se inserta un DetalleVenta
-- Actualiza qué productos compra cada cliente y con qué frecuencia
-- ============================================================
CREATE OR REPLACE FUNCTION fn_rastrear_compras_cliente()
RETURNS TRIGGER AS $$
DECLARE
    v_id_cliente INT;
BEGIN
    -- Obtener el idCliente de la venta asociada
    SELECT "idCliente" INTO v_id_cliente
    FROM "Venta"
    WHERE id = NEW."idVenta";

    -- Solo procesar si la venta tiene un cliente asociado
    IF v_id_cliente IS NOT NULL THEN
        INSERT INTO "ClienteProductoStats" ("idCliente", "idProducto", "totalComprado", "vecesComprado", "ultimaCompra")
        VALUES (v_id_cliente, NEW."idProducto", NEW.cantidad, 1, NOW())
        ON CONFLICT ("idCliente", "idProducto")
        DO UPDATE SET
            "totalComprado" = "ClienteProductoStats"."totalComprado" + NEW.cantidad,
            "vecesComprado" = "ClienteProductoStats"."vecesComprado" + 1,
            "ultimaCompra"  = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_rastrear_compras_cliente
AFTER INSERT ON "DetalleVenta"
FOR EACH ROW
EXECUTE FUNCTION fn_rastrear_compras_cliente();


-- ============================================================
-- TRIGGER 2: PRODUCTOS MÁS VENDIDOS
-- Se ejecuta cada vez que se inserta un DetalleVenta
-- Acumula estadísticas globales de venta por producto
-- ============================================================
CREATE OR REPLACE FUNCTION fn_actualizar_stats_producto()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "ProductoVentaStats" ("idProducto", "totalUnidadesVendidas", "totalVecesVendido", "ingresoTotal", "ultimaVenta")
    VALUES (NEW."idProducto", NEW.cantidad, 1, NEW.subtotal, NOW())
    ON CONFLICT ("idProducto")
    DO UPDATE SET
        "totalUnidadesVendidas" = "ProductoVentaStats"."totalUnidadesVendidas" + NEW.cantidad,
        "totalVecesVendido"     = "ProductoVentaStats"."totalVecesVendido" + 1,
        "ingresoTotal"          = "ProductoVentaStats"."ingresoTotal" + NEW.subtotal,
        "ultimaVenta"           = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_actualizar_stats_producto
AFTER INSERT ON "DetalleVenta"
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_stats_producto();


-- ============================================================
-- TRIGGER 3: ALERTA DE STOCK BAJO
-- Se ejecuta cuando se actualiza el stockActual de un producto
-- Si el stock baja del mínimo definido, genera una alerta
-- ============================================================
CREATE OR REPLACE FUNCTION fn_alerta_stock_bajo()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar si el stock bajó del mínimo
    IF NEW."stockMinimo" IS NOT NULL AND NEW."stockActual" <= NEW."stockMinimo" THEN
        -- Solo crear alerta si no existe una alerta activa (no resuelta) para este producto
        IF NOT EXISTS (
            SELECT 1 FROM "AlertaStockBajo"
            WHERE "idProducto" = NEW.id AND "resuelta" = FALSE
        ) THEN
            INSERT INTO "AlertaStockBajo" ("idProducto", "nombreProducto", "stockActual", "stockMinimo")
            VALUES (NEW.id, NEW.nombre, NEW."stockActual", NEW."stockMinimo");
        END IF;
    END IF;

    -- Si el stock subió por encima del mínimo, resolver alertas anteriores
    IF NEW."stockMinimo" IS NOT NULL AND NEW."stockActual" > NEW."stockMinimo" THEN
        UPDATE "AlertaStockBajo"
        SET "resuelta" = TRUE
        WHERE "idProducto" = NEW.id AND "resuelta" = FALSE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_alerta_stock_bajo
AFTER UPDATE OF "stockActual" ON "Producto"
FOR EACH ROW
EXECUTE FUNCTION fn_alerta_stock_bajo();


-- ============================================================
-- TRIGGER 4: HISTORIAL DE CAMBIOS DE PRECIO
-- Se ejecuta cuando se modifica el precio de un producto
-- Guarda el precio anterior y el nuevo para auditoría
-- ============================================================
CREATE OR REPLACE FUNCTION fn_historial_precios()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo registrar si alguno de los precios realmente cambió
    IF OLD."precioVenta" IS DISTINCT FROM NEW."precioVenta"
       OR OLD."precioCompra" IS DISTINCT FROM NEW."precioCompra" THEN

        INSERT INTO "HistorialPrecios" (
            "idProducto",
            "nombreProducto",
            "precioVentaAnterior",
            "precioVentaNuevo",
            "precioCompraAnterior",
            "precioCompraNuevo"
        ) VALUES (
            NEW.id,
            NEW.nombre,
            OLD."precioVenta",
            NEW."precioVenta",
            OLD."precioCompra",
            NEW."precioCompra"
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_historial_precios
AFTER UPDATE ON "Producto"
FOR EACH ROW
EXECUTE FUNCTION fn_historial_precios();


-- ************************************************************
-- PASO 3: CONSULTAS ÚTILES PARA VER LOS DATO Estas las puedes usar cuando quieras ver los reportes
-- ************************************************************

-- 📊 Ver los 10 productos más vendidos
-- SELECT p.nombre, s."totalUnidadesVendidas", s."totalVecesVendido", s."ingresoTotal"
-- FROM "ProductoVentaStats" s
-- JOIN "Producto" p ON p.id = s."idProducto"
-- ORDER BY s."totalUnidadesVendidas" DESC
-- LIMIT 10;

-- 👤 Ver qué compra más un cliente específico (cambiar el ID)
-- SELECT c."nombreCompleto", p.nombre AS producto, cs."totalComprado", cs."vecesComprado", cs."ultimaCompra"
-- FROM "ClienteProductoStats" cs
-- JOIN "Cliente" c ON c.id = cs."idCliente"
-- JOIN "Producto" p ON p.id = cs."idProducto"
-- WHERE cs."idCliente" = 1
-- ORDER BY cs."totalComprado" DESC;

-- 👥 Ver los clientes que más compran (por cantidad total)
-- SELECT c."nombreCompleto", SUM(cs."totalComprado") AS total_productos, SUM(cs."vecesComprado") AS total_compras
-- FROM "ClienteProductoStats" cs
-- JOIN "Cliente" c ON c.id = cs."idCliente"
-- GROUP BY c.id, c."nombreCompleto"
-- ORDER BY total_productos DESC
-- LIMIT 10;

-- ⚠️ Ver alertas de stock bajo activas
-- SELECT "nombreProducto", "stockActual", "stockMinimo", "fechaAlerta"
-- FROM "AlertaStockBajo"
-- WHERE "resuelta" = FALSE
-- ORDER BY "fechaAlerta" DESC;

-- 💰 Ver historial de cambios de precio
-- SELECT "nombreProducto", "precioVentaAnterior", "precioVentaNuevo", "precioCompraAnterior", "precioCompraNuevo", "fechaCambio"
-- FROM "HistorialPrecios"
-- ORDER BY "fechaCambio" DESC;
