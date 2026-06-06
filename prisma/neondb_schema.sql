-- =========================================================================
--  SCRIPT DE BASE DE DATOS MAESTRO PARA NEONDB (POSTGRESQL)
--  SISTEMA DE GESTIÓN DE FARMACIA - PODOCARE SYSTEM
--  Incluye: Tablas, Relaciones, Triggers, Procedimientos Almacenados
--           y Semilla de Datos Coherentes para Nicaragua.
-- =========================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. LIMPIEZA DE TABLAS Y OBJETOS EXISTENTES (PARA REINSTALACIÓN LIMPIA)
-- ─────────────────────────────────────────────────────────────────────────
DROP EVENT TRIGGER IF EXISTS evt_audit_create;
DROP EVENT TRIGGER IF EXISTS evt_audit_alter;
DROP EVENT TRIGGER IF EXISTS evt_proteger_drop;

DROP TRIGGER IF EXISTS tr_rastrear_compras_cliente ON "DetalleVenta";
DROP TRIGGER IF EXISTS tr_actualizar_stats_producto ON "DetalleVenta";
DROP TRIGGER IF EXISTS tr_alerta_stock_bajo ON "Producto";
DROP TRIGGER IF EXISTS tr_historial_precios ON "Producto";

DROP TABLE IF EXISTS "AuditoriaLog" CASCADE;
DROP TABLE IF EXISTS "DetalleVenta" CASCADE;
DROP TABLE IF EXISTS "Venta" CASCADE;
DROP TABLE IF EXISTS "MovimientoInventario" CASCADE;
DROP TABLE IF EXISTS "Lote" CASCADE;
DROP TABLE IF EXISTS "DetalleCompra" CASCADE;
DROP TABLE IF EXISTS "Compra" CASCADE;
DROP TABLE IF EXISTS "ProveedorProducto" CASCADE;
DROP TABLE IF EXISTS "Proveedor" CASCADE;
DROP TABLE IF EXISTS "Producto" CASCADE;
DROP TABLE IF EXISTS "CategoriaProducto" CASCADE;
DROP TABLE IF EXISTS "Cliente" CASCADE;
DROP TABLE IF EXISTS "Usuario" CASCADE;
DROP TABLE IF EXISTS "Rol" CASCADE;

DROP TABLE IF EXISTS "ClienteProductoStats" CASCADE;
DROP TABLE IF EXISTS "ProductoVentaStats" CASCADE;
DROP TABLE IF EXISTS "AlertaStockBajo" CASCADE;
DROP TABLE IF EXISTS "HistorialPrecios" CASCADE;
DROP TABLE IF EXISTS "AuditoriaDDL" CASCADE;
DROP TABLE IF EXISTS "LogProcedimientos" CASCADE;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. CREACIÓN DE ESTRUCTURA DE TABLAS (CORE SCHEMA)
-- ─────────────────────────────────────────────────────────────────────────

-- ===== ROLES =====
CREATE TABLE "Rol" (
    "id" SERIAL PRIMARY KEY,
    "nombre" TEXT UNIQUE NOT NULL
);

-- ===== USUARIOS =====
CREATE TABLE "Usuario" (
    "id" SERIAL PRIMARY KEY,
    "nombreCompleto" TEXT NOT NULL,
    "correo" TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "idRol" INTEGER NOT NULL REFERENCES "Rol"("id") ON UPDATE CASCADE,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===== CLIENTES =====
CREATE TABLE "Cliente" (
    "id" SERIAL PRIMARY KEY,
    "nombreCompleto" TEXT NOT NULL,
    "telefono" TEXT UNIQUE,
    "correo" TEXT UNIQUE,
    "cedula" TEXT UNIQUE,
    "direccion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===== CATEGORÍAS =====
CREATE TABLE "CategoriaProducto" (
    "id" SERIAL PRIMARY KEY,
    "nombre" TEXT UNIQUE NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===== PRODUCTOS =====
CREATE TABLE "Producto" (
    "id" SERIAL PRIMARY KEY,
    "nombre" TEXT UNIQUE NOT NULL,
    "codigoBarras" TEXT UNIQUE,
    "descripcion" TEXT,
    "fechaVencimiento" TIMESTAMP(3),
    "idCategoria" INTEGER NOT NULL REFERENCES "CategoriaProducto"("id") ON UPDATE CASCADE,
    "precioCompra" DECIMAL(10,2) NOT NULL,
    "precioVenta" DECIMAL(10,2) NOT NULL,
    "precioBlister" DECIMAL(10,2),
    "precioCaja" DECIMAL(10,2),
    "unidadesPorBlister" INTEGER,
    "unidadesPorCaja" INTEGER,
    "stockActual" INTEGER NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===== PROVEEDORES =====
CREATE TABLE "Proveedor" (
    "id" SERIAL PRIMARY KEY,
    "nombre" TEXT UNIQUE NOT NULL,
    "telefono" TEXT,
    "correo" TEXT,
    "direccion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===== CATÁLOGO PROVEEDOR-PRODUCTO =====
CREATE TABLE "ProveedorProducto" (
    "id" SERIAL PRIMARY KEY,
    "idProveedor" INTEGER NOT NULL REFERENCES "Proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "idProducto" INTEGER NOT NULL REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "precioCompra" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("idProveedor", "idProducto")
);

-- ===== COMPRAS A PROVEEDORES =====
CREATE TABLE "Compra" (
    "id" SERIAL PRIMARY KEY,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCompra" TIMESTAMP(3),
    "numeroFactura" TEXT,
    "idProveedor" INTEGER NOT NULL REFERENCES "Proveedor"("id") ON UPDATE CASCADE,
    "total" DECIMAL(10,2) NOT NULL,
    "idUsuario" INTEGER NOT NULL REFERENCES "Usuario"("id") ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===== DETALLE COMPRA =====
CREATE TABLE "DetalleCompra" (
    "id" SERIAL PRIMARY KEY,
    "idCompra" INTEGER NOT NULL REFERENCES "Compra"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "idProducto" INTEGER NOT NULL REFERENCES "Producto"("id") ON UPDATE CASCADE,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "lote" TEXT,
    "fechaVencimiento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===== LOTES (BATCH TRACKING) =====
CREATE TABLE "Lote" (
    "id" SERIAL PRIMARY KEY,
    "idProducto" INTEGER NOT NULL REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "codigoLote" TEXT NOT NULL,
    "fechaVencimiento" TIMESTAMP(3),
    "stockInicial" INTEGER NOT NULL DEFAULT 0,
    "stockActual" INTEGER NOT NULL DEFAULT 0,
    "costoCompra" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "idDetalleCompra" INTEGER REFERENCES "DetalleCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Lote_idProducto_idx" ON "Lote"("idProducto");

-- ===== MOVIMIENTOS DE INVENTARIO (KARDEX) =====
CREATE TABLE "MovimientoInventario" (
    "id" SERIAL PRIMARY KEY,
    "idProducto" INTEGER NOT NULL REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "idLote" INTEGER REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "tipo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "stockResultante" INTEGER NOT NULL DEFAULT 0,
    "costoUnitario" DECIMAL(10,2),
    "referencia" TEXT,
    "idUsuario" INTEGER REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "MovimientoInventario_idProducto_idx" ON "MovimientoInventario"("idProducto");
CREATE INDEX "MovimientoInventario_createdAt_idx" ON "MovimientoInventario"("createdAt");

-- ===== VENTAS =====
CREATE TABLE "Venta" (
    "id" SERIAL PRIMARY KEY,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idCliente" INTEGER REFERENCES "Cliente"("id") ON UPDATE CASCADE,
    "total" DECIMAL(10,2) NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "nombrePodologo" TEXT,
    "numeroReceta" TEXT,
    "idUsuario" INTEGER NOT NULL REFERENCES "Usuario"("id") ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===== DETALLE VENTA =====
CREATE TABLE "DetalleVenta" (
    "id" SERIAL PRIMARY KEY,
    "idVenta" INTEGER NOT NULL REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "idProducto" INTEGER NOT NULL REFERENCES "Producto"("id") ON UPDATE CASCADE,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tipoUnidad" TEXT NOT NULL DEFAULT 'UNIDAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===== LOG DE AUDITORÍA =====
CREATE TABLE "AuditoriaLog" (
    "id" SERIAL PRIMARY KEY,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" INTEGER,
    "detalles" TEXT,
    "idUsuario" INTEGER REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. CREACIÓN DE TABLAS AUXILIARES PARA ESTADÍSTICAS Y AUDITORÍA DE TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE "ClienteProductoStats" (
    id SERIAL PRIMARY KEY,
    "idCliente" INT NOT NULL REFERENCES "Cliente"(id) ON DELETE CASCADE,
    "idProducto" INT NOT NULL REFERENCES "Producto"(id) ON DELETE CASCADE,
    "totalComprado" INT NOT NULL DEFAULT 0,
    "vecesComprado" INT NOT NULL DEFAULT 0,
    "ultimaCompra" TIMESTAMP DEFAULT NOW(),
    UNIQUE("idCliente", "idProducto")
);

CREATE TABLE "ProductoVentaStats" (
    id SERIAL PRIMARY KEY,
    "idProducto" INT NOT NULL UNIQUE REFERENCES "Producto"(id) ON DELETE CASCADE,
    "totalUnidadesVendidas" INT NOT NULL DEFAULT 0,
    "totalVecesVendido" INT NOT NULL DEFAULT 0,
    "ingresoTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ultimaVenta" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "AlertaStockBajo" (
    id SERIAL PRIMARY KEY,
    "idProducto" INT NOT NULL REFERENCES "Producto"(id) ON DELETE CASCADE,
    "nombreProducto" VARCHAR(255) NOT NULL,
    "stockActual" INT NOT NULL,
    "stockMinimo" INT NOT NULL,
    "fechaAlerta" TIMESTAMP DEFAULT NOW(),
    "resuelta" BOOLEAN DEFAULT FALSE
);

CREATE TABLE "HistorialPrecios" (
    id SERIAL PRIMARY KEY,
    "idProducto" INT NOT NULL REFERENCES "Producto"(id) ON DELETE CASCADE,
    "nombreProducto" VARCHAR(255) NOT NULL,
    "precioVentaAnterior" DECIMAL(10,2),
    "precioVentaNuevo" DECIMAL(10,2),
    "precioCompraAnterior" DECIMAL(10,2),
    "precioCompraNuevo" DECIMAL(10,2),
    "fechaCambio" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "AuditoriaDDL" (
    id SERIAL PRIMARY KEY,
    evento TEXT NOT NULL,
    nombre_objeto TEXT,
    tipo_objeto TEXT,
    esquema TEXT DEFAULT 'public',
    usuario TEXT NOT NULL,
    ip_cliente TEXT,
    consulta_sql TEXT,
    fecha TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "LogProcedimientos" (
    id SERIAL PRIMARY KEY,
    procedimiento TEXT NOT NULL,
    descripcion TEXT,
    datos JSONB,
    usuario TEXT DEFAULT current_user,
    fecha TIMESTAMP DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────
-- 4. CREACIÓN DE FUNCIONES Y TRIGGERS REACTIVOS
-- ─────────────────────────────────────────────────────────────────────────

-- TRIGGER 1: RASTREO DE COMPRAS POR CLIENTE
CREATE OR REPLACE FUNCTION fn_rastrear_compras_cliente()
RETURNS TRIGGER AS $$
DECLARE
    v_id_cliente INT;
BEGIN
    SELECT "idCliente" INTO v_id_cliente FROM "Venta" WHERE id = NEW."idVenta";
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
FOR EACH ROW EXECUTE FUNCTION fn_rastrear_compras_cliente();

-- TRIGGER 2: ESTADÍSTICAS GLOBALES DE VENTA
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
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_stats_producto();

-- TRIGGER 3: ALERTA DE STOCK BAJO
CREATE OR REPLACE FUNCTION fn_alerta_stock_bajo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."stockMinimo" IS NOT NULL AND NEW."stockActual" <= NEW."stockMinimo" THEN
        IF NOT EXISTS (
            SELECT 1 FROM "AlertaStockBajo" WHERE "idProducto" = NEW.id AND "resuelta" = FALSE
        ) THEN
            INSERT INTO "AlertaStockBajo" ("idProducto", "nombreProducto", "stockActual", "stockMinimo")
            VALUES (NEW.id, NEW.nombre, NEW."stockActual", NEW."stockMinimo");
        END IF;
    END IF;
    
    IF NEW."stockMinimo" IS NOT NULL AND NEW."stockActual" > NEW."stockMinimo" THEN
        UPDATE "AlertaStockBajo" SET "resuelta" = TRUE WHERE "idProducto" = NEW.id AND "resuelta" = FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_alerta_stock_bajo
AFTER UPDATE OF "stockActual" ON "Producto"
FOR EACH ROW EXECUTE FUNCTION fn_alerta_stock_bajo();

-- TRIGGER 4: AUDITORÍA DE PRECIOS
CREATE OR REPLACE FUNCTION fn_historial_precios()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD."precioVenta" IS DISTINCT FROM NEW."precioVenta" OR OLD."precioCompra" IS DISTINCT FROM NEW."precioCompra" THEN
        INSERT INTO "HistorialPrecios" (
            "idProducto", "nombreProducto", "precioVentaAnterior", "precioVentaNuevo", "precioCompraAnterior", "precioCompraNuevo"
        ) VALUES (
            NEW.id, NEW.nombre, OLD."precioVenta", NEW."precioVenta", OLD."precioCompra", NEW."precioCompra"
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_historial_precios
AFTER UPDATE ON "Producto"
FOR EACH ROW EXECUTE FUNCTION fn_historial_precios();


-- ─────────────────────────────────────────────────────────────────────────
-- 5. CREACIÓN DE PROCEDIMIENTOS ALMACENADOS
-- ─────────────────────────────────────────────────────────────────────────

-- REPORTE DE VENTAS POR RANGO
CREATE OR REPLACE PROCEDURE sp_reporte_ventas_por_fecha(p_fecha_inicio DATE, p_fecha_fin DATE)
LANGUAGE plpgsql AS $$
DECLARE
    r RECORD;
    v_total_general NUMERIC(10,2) := 0;
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════';
    RAISE NOTICE '  REPORTE DE VENTAS: % → %', p_fecha_inicio, p_fecha_fin;
    RAISE NOTICE '══════════════════════════════════════════════';
    FOR r IN
        SELECT v.id AS venta_id, v.fecha, v."metodoPago" AS metodo_pago, v.total,
               c."nombreCompleto" AS cliente, u."nombreCompleto" AS vendedor
        FROM "Venta" v
        LEFT JOIN "Cliente" c ON c.id = v."idCliente"
        JOIN "Usuario" u      ON u.id = v."idUsuario"
        WHERE v.fecha::date BETWEEN p_fecha_inicio AND p_fecha_fin
        ORDER BY v.fecha
    LOOP
        RAISE NOTICE 'Venta #% | % | Cliente: % | Vendedor: % | Método: % | Total: C$ %',
            r.venta_id, r.fecha::date, COALESCE(r.cliente, 'Público'), r.vendedor, r.metodo_pago, r.total;
        v_total_general := v_total_general + r.total;
    END LOOP;
    RAISE NOTICE '----------------------------------------------';
    RAISE NOTICE '  TOTAL GENERAL: C$ %', v_total_general;
    RAISE NOTICE '══════════════════════════════════════════════';
END;
$$;

-- PRODUCTOS CON STOCK BAJO
CREATE OR REPLACE PROCEDURE sp_productos_stock_bajo()
LANGUAGE plpgsql AS $$
DECLARE
    r RECORD;
    v_contador INT := 0;
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════';
    RAISE NOTICE '  ALERTA: PRODUCTOS CON STOCK BAJO';
    RAISE NOTICE '══════════════════════════════════════════════';
    FOR r IN
        SELECT p.id, p.nombre, cp.nombre AS categoria, p."stockActual" AS stock_actual, p."stockMinimo" AS stock_minimo,
               (p."stockMinimo" - p."stockActual") AS unidades_faltantes
        FROM "Producto" p
        JOIN "CategoriaProducto" cp ON cp.id = p."idCategoria"
        WHERE p.activo = true AND p."stockMinimo" IS NOT NULL AND p."stockActual" < p."stockMinimo"
        ORDER BY unidades_faltantes DESC
    LOOP
        RAISE NOTICE '⚠️  [%] % | Stock: % / Mínimo: % | Faltan: % uds.',
            r.categoria, r.nombre, r.stock_actual, r.stock_minimo, r.unidades_faltantes;
        v_contador := v_contador + 1;
    END LOOP;
    IF v_contador = 0 THEN
        RAISE NOTICE '✅ Todos los productos tienen stock suficiente.';
    ELSE
        RAISE NOTICE '----------------------------------------------';
        RAISE NOTICE '  Total de productos con stock bajo: %', v_contador;
    END IF;
    RAISE NOTICE '══════════════════════════════════════════════';
END;
$$;

-- RESUMEN VENTAS MÉTODO DE PAGO
CREATE OR REPLACE PROCEDURE sp_resumen_ventas_por_metodo_pago(p_fecha_inicio DATE, p_fecha_fin DATE)
LANGUAGE plpgsql AS $$
DECLARE
    r RECORD;
    v_total_general NUMERIC(10,2) := 0;
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════';
    RAISE NOTICE '  RESUMEN POR MÉTODO DE PAGO: % → %', p_fecha_inicio, p_fecha_fin;
    RAISE NOTICE '══════════════════════════════════════════════';
    FOR r IN
        SELECT v."metodoPago" AS metodo, COUNT(*) AS cantidad_ventas, SUM(v.total) AS total_metodo
        FROM "Venta" v
        WHERE v.fecha::date BETWEEN p_fecha_inicio AND p_fecha_fin
        GROUP BY v."metodoPago" ORDER BY total_metodo DESC
    LOOP
        RAISE NOTICE '💰 % → % ventas | Total: C$ %', r.metodo, r.cantidad_ventas, r.total_metodo;
        v_total_general := v_total_general + r.total_metodo;
    END LOOP;
    IF v_total_general = 0 THEN
        RAISE NOTICE '  (Sin ventas en este período)';
    ELSE
        RAISE NOTICE '----------------------------------------------';
        RAISE NOTICE '  TOTAL TODAS LAS FORMAS DE PAGO: C$ %', v_total_general;
    END IF;
    RAISE NOTICE '══════════════════════════════════════════════';
END;
$$;

-- REGISTRAR VENTA COMPLETA
CREATE OR REPLACE PROCEDURE sp_registrar_venta(
    p_id_cliente INT,
    p_id_usuario INT,
    p_metodo_pago TEXT,
    p_detalles JSONB
)
LANGUAGE plpgsql AS $$
DECLARE
    v_id_venta INT;
    v_total DECIMAL(10,2) := 0;
    v_detalle JSONB;
    v_id_prod INT;
    v_cantidad INT;
    v_precio DECIMAL(10,2);
    v_subtotal DECIMAL(10,2);
    v_stock INT;
    v_nombre TEXT;
BEGIN
    FOR v_detalle IN SELECT * FROM jsonb_array_elements(p_detalles)
    LOOP
        v_id_prod  := (v_detalle->>'idProducto')::INT;
        v_cantidad := (v_detalle->>'cantidad')::INT;
        v_precio   := (v_detalle->>'precioUnitario')::DECIMAL;
        
        SELECT "stockActual", nombre INTO v_stock, v_nombre FROM "Producto" WHERE id = v_id_prod;
        IF v_stock IS NULL THEN
            RAISE EXCEPTION 'Producto ID % no existe', v_id_prod;
        END IF;
        IF v_stock < v_cantidad THEN
            RAISE EXCEPTION 'Stock insuficiente para "%": tiene % unidades, se piden %', v_nombre, v_stock, v_cantidad;
        END IF;
        v_total := v_total + (v_precio * v_cantidad);
    END LOOP;

    INSERT INTO "Venta" (fecha, "idCliente", total, "metodoPago", "idUsuario", "createdAt", "updatedAt")
    VALUES (NOW(), p_id_cliente, v_total, p_metodo_pago, p_id_usuario, NOW(), NOW())
    RETURNING id INTO v_id_venta;

    FOR v_detalle IN SELECT * FROM jsonb_array_elements(p_detalles)
    LOOP
        v_id_prod  := (v_detalle->>'idProducto')::INT;
        v_cantidad := (v_detalle->>'cantidad')::INT;
        v_precio   := (v_detalle->>'precioUnitario')::DECIMAL;
        v_subtotal := v_precio * v_cantidad;

        INSERT INTO "DetalleVenta" ("idVenta", "idProducto", cantidad, "precioUnitario", subtotal, "tipoUnidad", "createdAt", "updatedAt")
        VALUES (v_id_venta, v_id_prod, v_cantidad, v_precio, v_subtotal, 'UNIDAD', NOW(), NOW());

        UPDATE "Producto" SET "stockActual" = "stockActual" - v_cantidad, "updatedAt" = NOW() WHERE id = v_id_prod;
    END LOOP;

    INSERT INTO "LogProcedimientos" (procedimiento, descripcion, datos)
    VALUES ('sp_registrar_venta', 'Venta registrada exitosamente',
        jsonb_build_object('idVenta', v_id_venta, 'total', v_total, 'items', jsonb_array_length(p_detalles)));
    RAISE NOTICE '✅ Venta #% registrada. Total: C$%', v_id_venta, v_total;
END;
$$;

-- REPORTE GENERAL DE VENTAS
CREATE OR REPLACE PROCEDURE sp_reporte_ventas(p_fecha_inicio DATE, p_fecha_fin DATE)
LANGUAGE plpgsql AS $$
DECLARE
    v_total_ventas INT;
    v_ingreso_total DECIMAL(12,2);
    v_ticket_promedio DECIMAL(10,2);
    v_producto_top TEXT;
    v_cliente_top TEXT;
BEGIN
    SELECT COUNT(*), COALESCE(SUM(total), 0) INTO v_total_ventas, v_ingreso_total
    FROM "Venta" WHERE fecha >= p_fecha_inicio AND fecha < p_fecha_fin + INTERVAL '1 day';
    
    v_ticket_promedio := CASE WHEN v_total_ventas > 0 THEN v_ingreso_total / v_total_ventas ELSE 0 END;

    SELECT p.nombre INTO v_producto_top FROM "DetalleVenta" dv
    JOIN "Venta" v ON v.id = dv."idVenta" JOIN "Producto" p ON p.id = dv."idProducto"
    WHERE v.fecha >= p_fecha_inicio AND v.fecha < p_fecha_fin + INTERVAL '1 day'
    GROUP BY p.nombre ORDER BY SUM(dv.cantidad) DESC LIMIT 1;

    SELECT c."nombreCompleto" INTO v_cliente_top FROM "Venta" v
    JOIN "Cliente" c ON c.id = v."idCliente"
    WHERE v.fecha >= p_fecha_inicio AND v.fecha < p_fecha_fin + INTERVAL '1 day'
    GROUP BY c."nombreCompleto" ORDER BY SUM(v.total) DESC LIMIT 1;

    RAISE NOTICE '══════════════════════════════════════';
    RAISE NOTICE '  REPORTE GLOBAL DE VENTAS';
    RAISE NOTICE '  Periodo: % al %', p_fecha_inicio, p_fecha_fin;
    RAISE NOTICE '══════════════════════════════════════';
    RAISE NOTICE '  Total ventas:      %', v_total_ventas;
    RAISE NOTICE '  Ingreso total:     C$ %', v_ingreso_total;
    RAISE NOTICE '  Ticket promedio:   C$ %', v_ticket_promedio;
    RAISE NOTICE '  Producto top:      %', COALESCE(v_producto_top, 'N/A');
    RAISE NOTICE '  Cliente top:       %', COALESCE(v_cliente_top, 'N/A');
    RAISE NOTICE '══════════════════════════════════════';

    INSERT INTO "LogProcedimientos" (procedimiento, descripcion, datos)
    VALUES ('sp_reporte_ventas', 'Reporte generado',
        jsonb_build_object('inicio', p_fecha_inicio, 'fin', p_fecha_fin, 'totalVentas', v_total_ventas, 'ingresoTotal', v_ingreso_total));
END;
$$;

-- AJUSTE DE INVENTARIO (KARDEX)
CREATE OR REPLACE PROCEDURE sp_ajuste_inventario(p_id_producto INT, p_nuevo_stock INT, p_motivo TEXT)
LANGUAGE plpgsql AS $$
DECLARE
    v_stock_anterior INT;
    v_nombre TEXT;
    v_diferencia INT;
BEGIN
    SELECT "stockActual", nombre INTO v_stock_anterior, v_nombre FROM "Producto" WHERE id = p_id_producto;
    IF v_nombre IS NULL THEN
        RAISE EXCEPTION 'Producto ID % no encontrado', p_id_producto;
    END IF;
    v_diferencia := p_nuevo_stock - v_stock_anterior;
    UPDATE "Producto" SET "stockActual" = p_nuevo_stock, "updatedAt" = NOW() WHERE id = p_id_producto;
    
    INSERT INTO "LogProcedimientos" (procedimiento, descripcion, datos)
    VALUES ('sp_ajuste_inventario', p_motivo,
        jsonb_build_object('producto', v_nombre, 'stockAnterior', v_stock_anterior, 'stockNuevo', p_nuevo_stock, 'diferencia', v_diferencia));
    RAISE NOTICE '✅ Stock de "%" ajustado: % → % (diferencia: %)', v_nombre, v_stock_anterior, p_nuevo_stock, v_diferencia;
END;
$$;

-- CIERRE DE CAJA DIARIO
CREATE OR REPLACE PROCEDURE sp_cierre_caja(p_fecha DATE DEFAULT CURRENT_DATE)
LANGUAGE plpgsql AS $$
DECLARE
    v_efectivo      DECIMAL(10,2);
    v_tarjeta       DECIMAL(10,2);
    v_transferencia DECIMAL(10,2);
    v_total         DECIMAL(10,2);
    v_num_ventas    INT;
BEGIN
    SELECT
        COALESCE(SUM(CASE WHEN "metodoPago" = 'EFECTIVO' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN "metodoPago" = 'TARJETA' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN "metodoPago" = 'TRANSFERENCIA' THEN total ELSE 0 END), 0),
        COALESCE(SUM(total), 0),
        COUNT(*)
    INTO v_efectivo, v_tarjeta, v_transferencia, v_total, v_num_ventas
    FROM "Venta" WHERE fecha::date = p_fecha;

    RAISE NOTICE '══════════════════════════════════════';
    RAISE NOTICE '  CIERRE DE CAJA - %', p_fecha;
    RAISE NOTICE '══════════════════════════════════════';
    RAISE NOTICE '  Ventas realizadas:  %', v_num_ventas;
    RAISE NOTICE '  Efectivo:           C$ %', v_efectivo;
    RAISE NOTICE '  Tarjeta:            C$ %', v_tarjeta;
    RAISE NOTICE '  Transferencia:      C$ %', v_transferencia;
    RAISE NOTICE '  ─────────────────────────────';
    RAISE NOTICE '  TOTAL DEL DÍA:      C$ %', v_total;
    RAISE NOTICE '══════════════════════════════════════';

    INSERT INTO "LogProcedimientos" (procedimiento, descripcion, datos)
    VALUES ('sp_cierre_caja', 'Cierre de caja del día ' || p_fecha,
        jsonb_build_object('fecha', p_fecha, 'numVentas', v_num_ventas, 'efectivo', v_efectivo, 'total', v_total));
END;
$$;

-- DESACTIVAR PRODUCTOS INACTIVOS
CREATE OR REPLACE PROCEDURE sp_desactivar_sin_movimiento(p_dias INT DEFAULT 90)
LANGUAGE plpgsql AS $$
DECLARE
    v_count INT := 0;
    v_producto RECORD;
BEGIN
    FOR v_producto IN
        SELECT p.id, p.nombre FROM "Producto" p
        WHERE p.activo = TRUE
        AND p.id NOT IN (
            SELECT DISTINCT dv."idProducto" FROM "DetalleVenta" dv
            JOIN "Venta" v ON v.id = dv."idVenta"
            WHERE v.fecha >= NOW() - (p_dias || ' days')::INTERVAL
        )
    LOOP
        UPDATE "Producto" SET activo = FALSE, "updatedAt" = NOW() WHERE id = v_producto.id;
        v_count := v_count + 1;
        RAISE NOTICE '  ⚠️ Desactivado por inactividad: %', v_producto.nombre;
    END LOOP;

    INSERT INTO "LogProcedimientos" (procedimiento, descripcion, datos)
    VALUES ('sp_desactivar_sin_movimiento', v_count || ' productos desactivados por inactividad',
        jsonb_build_object('diasSinVenta', p_dias, 'productosDesactivados', v_count));
    RAISE NOTICE '✅ % productos desactivados (sin ventas en % días)', v_count, p_dias;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────
-- 6. SEMILLA DE DATOS COHERENTES DE NICARAGUA
-- ─────────────────────────────────────────────────────────────────────────

-- ===== SEMILLA DE ROLES =====
INSERT INTO "Rol" ("id", "nombre") VALUES
(1, 'ADMIN'),
(2, 'EMPLEADO');

-- ===== SEMILLA DE USUARIOS DEMO (PASSWORD HASH BCRYPT) =====
-- admin@farmacia.com => 'password123'
-- demo@farmacia.com  => 'demo1234'
INSERT INTO "Usuario" ("id", "nombreCompleto", "correo", "passwordHash", "idRol", "activo") VALUES
(1, 'Administrador Farmacia', 'admin@farmacia.com', '$2b$10$9ApPHYQw14.fbKGCDK.SMOvxJi8T3h6zX4lEztylCFetHglmJ.IBW', 1, true),
(2, 'Usuario Demo Podocare', 'demo@farmacia.com', '$2b$10$mtFMWgesgHtMme0jEtNKI.cqkBQ/Wzu/TXne8pE.hegDcXEbvC87i', 2, true);

-- ===== SEMILLA DE CATEGORÍAS =====
INSERT INTO "CategoriaProducto" ("id", "nombre", "descripcion") VALUES
(1, 'Medicamentos', 'Medicamentos generales recetados y de venta libre'),
(2, 'Cremas y Ungüentos', 'Cremas tópicas, antimicóticos y antiinflamatorios de piel'),
(3, 'Cuidado del Pie / Podología', 'Productos ortopédicos y cremas podológicas especializadas'),
(4, 'Suplementos y Vitaminas', 'Vitaminas, minerales y complejos nutricionales'),
(5, 'Material de Curación', 'Apósitos, gasas, vendas, alcoholes y artículos de higiene');

-- ===== SEMILLA DE PROVEEDORES Y PREVENDEDORES DE NICARAGUA =====
INSERT INTO "Proveedor" ("id", "nombre", "telefono", "correo", "direccion") VALUES
(1, 'Droguería CEFA Nicaragua (Prevendedor: Juan Carlos Pérez)', '+505 8888-1234', 'cefa.prevendedor.juan@distribuidor.com.ni', 'Km 8.5 Carretera Norte, Managua'),
(2, 'Droguería Crowley (Prevendedor: María Alejandra Espinoza)', '+505 8777-5678', 'crowley.prevendedor.maria@distribuidor.com.ni', 'Pista Juan Pablo II, Managua'),
(3, 'Diprofa Nicaragua (Prevendedor: Ronaldo Blandón)', '+505 8666-9012', 'diprofa.prevendedor.ronaldo@distribuidor.com.ni', 'Altamira, Sector Distribuidoras, Managua'),
(4, 'Distribuidora DISNTEG (Prevendedor: Ligia Mercedes Blandón)', '+505 7777-3456', 'disnteg.prevendedor.ligia@distribuidor.com.ni', 'Bello Horizonte, Multicentro 2c al sur, Managua'),
(5, 'DICASA Carazo (Prevendedor: Guillermo Antonio Brenes)', '+505 8555-7890', 'dicasa.prevendedor.guillermo@distribuidor.com.ni', 'Km 12 Carretera Sur, Managua');

-- ===== SEMILLA DE PRODUCTOS POPULARES EN NICARAGUA =====
-- Los precios están denominados en Córdobas Nicaragüenses (C$) de forma realista
INSERT INTO "Producto" ("id", "nombre", "codigoBarras", "descripcion", "idCategoria", "precioCompra", "precioVenta", "stockActual", "stockMinimo", "activo") VALUES
(1, 'Panadol Ultra 500mg (Caja 24)', '7401004123456', 'Panadol Ultra con cafeína para alivio rápido de dolores de cabeza fuertes.', 1, 40.00, 60.00, 150, 20, true),
(2, 'Tafirol 500mg Paracetamol (Caja 100)', '7501004123457', 'Paracetamol de 500mg para control de fiebre y dolor general.', 1, 120.00, 180.00, 80, 15, true),
(3, 'Apronax 550mg Naproxeno (Caja 10)', '7801004123458', 'Naproxeno Sódico de 550mg potente antiinflamatorio y analgésico.', 1, 85.00, 125.00, 120, 25, true),
(4, 'Neurobión Inyectable Triple Dosis (3ml)', '7901004123459', 'Complejo B inyectable para neuritis y dolores musculares severos.', 1, 150.00, 220.00, 60, 10, true),
(5, 'Alka-Seltzer Efervescente (Caja 12)', '7401004123460', 'Antiácido y analgésico efervescente para indigestión.', 5, 30.00, 45.00, 200, 30, true),
(6, 'Crema Quadriderm Dérmica (20g)', '7401004123461', 'Crema tópica antiinflamatoria, bactericida y antimicótica de amplio espectro.', 2, 180.00, 250.00, 45, 10, true),
(7, 'Suero Electrolit Coco (625ml)', '7401004123462', 'Bebida hidratante para recuperar electrolitos sabor coco.', 5, 28.00, 42.00, 90, 15, true),
(8, 'Clotrimazol Crema Antimicótica 1% (20g)', '7401004123463', 'Tratamiento fungicida de pie de atleta e infecciones dérmicas.', 2, 45.00, 75.00, 70, 12, true),
(9, 'Amoxicilina 500mg Antibiótico (Caja 30)', '7401004123464', 'Antibiótico bactericida de amplio espectro para infecciones.', 1, 90.00, 140.00, 55, 10, true),
(10, 'Loratadina 10mg Antialérgico (Caja 10)', '7401004123465', 'Antihistamínico de segunda generación para alivio de alergias sin sueño.', 1, 20.00, 35.00, 110, 20, true),
(11, 'Crema Podológica PodoCare 100ml', '7401004123466', 'Crema altamente hidratante para talones agrietados y pie seco.', 3, 250.00, 380.00, 5, 8, true),
(12, 'Venda Elástica Autoadherente Coban 3M', '7401004123467', 'Venda elástica cohesiva de 3 pulgadas de ancho para soporte articular.', 5, 65.00, 95.00, 40, 15, true);

-- ===== RELACIÓN PROVEEDOR-PRODUCTO EN CATÁLOGO =====
INSERT INTO "ProveedorProducto" ("idProveedor", "idProducto", "precioCompra") VALUES
(1, 1, 40.00),  -- CEFA provee Panadol
(1, 5, 30.00),  -- CEFA provee Alka-Seltzer
(1, 7, 28.00),  -- CEFA provee Electrolit
(2, 2, 120.00), -- Crowley provee Tafirol
(2, 3, 85.00),  -- Crowley provee Apronax
(2, 10, 20.00), -- Crowley provee Loratadina
(3, 4, 150.00), -- Diprofa provee Neurobión
(3, 6, 180.00), -- Diprofa provee Quadriderm
(3, 9, 90.00),  -- Diprofa provee Amoxicilina
(4, 8, 45.00),  -- DISNTEG provee Clotrimazol
(4, 12, 65.00), -- DISNTEG provee Venda Coban
(5, 11, 250.00);-- DICASA provee PodoCare

-- ===== REGISTRO DE LOTES VIGENTES =====
INSERT INTO "Lote" ("id", "idProducto", "codigoLote", "fechaVencimiento", "stockInicial", "stockActual", "costoCompra", "activo") VALUES
(1, 1, 'LT-PAN-0526', '2028-05-30 00:00:00', 150, 150, 40.00, true),
(2, 2, 'LT-TAF-0326', '2028-03-15 00:00:00', 80, 80, 120.00, true),
(3, 3, 'LT-APR-1125', '2027-11-20 00:00:00', 120, 120, 85.00, true),
(4, 4, 'LT-NEU-0726', '2028-07-10 00:00:00', 60, 60, 150.00, true),
(5, 5, 'LT-ALK-0826', '2028-08-05 00:00:00', 200, 200, 30.00, true),
(6, 6, 'LT-QUA-0126', '2028-01-20 00:00:00', 45, 45, 180.00, true),
(7, 7, 'LT-ELE-1225', '2027-12-01 00:00:00', 90, 90, 28.00, true),
(8, 8, 'LT-CLO-0426', '2028-04-18 00:00:00', 70, 70, 45.00, true),
(9, 9, 'LT-AMO-0926', '2028-09-25 00:00:00', 55, 55, 90.00, true),
(10, 10, 'LT-LOR-0226', '2028-02-14 00:00:00', 110, 110, 20.00, true),
(11, 11, 'LT-POD-0626', '2027-06-30 00:00:00', 5, 5, 250.00, true),
(12, 12, 'LT-COB-1025', '2027-10-15 00:00:00', 40, 40, 65.00, true);

-- ===== REGISTRO DE MOVIMIENTOS KARDEX INICIALES DE COMPRA =====
INSERT INTO "MovimientoInventario" ("idProducto", "idLote", "tipo", "cantidad", "stockResultante", "costoUnitario", "referencia", "idUsuario") VALUES
(1, 1, 'ENTRADA_COMPRA', 150, 150, 40.00, 'Inventario Inicial CEFA', 1),
(2, 2, 'ENTRADA_COMPRA', 80, 80, 120.00, 'Inventario Inicial Crowley', 1),
(3, 3, 'ENTRADA_COMPRA', 120, 120, 85.00, 'Inventario Inicial Crowley', 1),
(4, 4, 'ENTRADA_COMPRA', 60, 60, 150.00, 'Inventario Inicial Diprofa', 1),
(5, 5, 'ENTRADA_COMPRA', 200, 200, 30.00, 'Inventario Inicial CEFA', 1),
(6, 6, 'ENTRADA_COMPRA', 45, 45, 180.00, 'Inventario Inicial Diprofa', 1),
(7, 7, 'ENTRADA_COMPRA', 90, 90, 28.00, 'Inventario Inicial CEFA', 1),
(8, 8, 'ENTRADA_COMPRA', 70, 70, 45.00, 'Inventario Inicial DISNTEG', 1),
(9, 9, 'ENTRADA_COMPRA', 55, 55, 90.00, 'Inventario Inicial Diprofa', 1),
(10, 10, 'ENTRADA_COMPRA', 110, 110, 20.00, 'Inventario Inicial Crowley', 1),
(11, 11, 'ENTRADA_COMPRA', 5, 5, 250.00, 'Inventario Inicial DICASA', 1),
(12, 12, 'ENTRADA_COMPRA', 40, 40, 65.00, 'Inventario Inicial DISNTEG', 1);

-- ===== SEMILLA DE CLIENTES REALES DE NICARAGUA =====
INSERT INTO "Cliente" ("id", "nombreCompleto", "telefono", "correo", "cedula", "direccion") VALUES
(1, 'Bayardo José Espinoza Zelaya', '+505 8999-1122', 'bayardo.espinoza@correo.ni', '001-120590-0010M', 'Bello Horizonte, Iglesia Pío X 2c al norte, Managua'),
(2, 'Ligia Mercedes Gutiérrez Brenes', '+505 8444-5566', 'ligia.gutierrez@correo.ni', '401-240893-0002A', 'Barrio San Jerónimo, Masaya'),
(3, 'Reynaldo Antonio Cerda Martínez', '+505 7666-8899', 'reynaldo.cerda@correo.ni', '201-150285-0003B', 'Calle Real Xalteva, del Calvario 1c al oeste, Granada'),
(4, 'Fabiola Patricia Toruño Blandón', '+505 8111-2233', 'fabiola.toruno@correo.ni', '081-301195-0004L', 'Reparto San Juan, costado norte de la Iglesia, León');

-- ===== SEMILLA DE COMPRAS COMPLETA =====
INSERT INTO "Compra" ("id", "fecha", "fechaCompra", "numeroFactura", "idProveedor", "total", "idUsuario") VALUES
(1, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', 'FAC-CEFA-4920', 1, 6000.00, 1);

INSERT INTO "DetalleCompra" ("idCompra", "idProducto", "cantidad", "precioUnitario", "subtotal", "lote", "fechaVencimiento") VALUES
(1, 1, 150, 40.00, 6000.00, 'LT-PAN-0526', '2028-05-30 00:00:00');

-- ===== SEMILLA DE HISTORIAL DE VENTAS COHERENTES =====
-- Poblaremos las ventas simulando los últimos 5 días para tener estadísticas en el Dashboard de inmediato.

-- VENTA 1: Hace 5 días
INSERT INTO "Venta" ("id", "fecha", "idCliente", "total", "metodoPago", "idUsuario") VALUES
(1, CURRENT_DATE - INTERVAL '5 days' + TIME '10:30:00', 1, 180.00, 'EFECTIVO', 2);
INSERT INTO "DetalleVenta" ("idVenta", "idProducto", "cantidad", "precioUnitario", "subtotal") VALUES
(1, 2, 1, 180.00, 180.00);

-- VENTA 2: Hace 4 días
INSERT INTO "Venta" ("id", "fecha", "idCliente", "total", "metodoPago", "idUsuario") VALUES
(2, CURRENT_DATE - INTERVAL '4 days' + TIME '14:15:00', 2, 120.00, 'TARJETA', 2);
INSERT INTO "DetalleVenta" ("idVenta", "idProducto", "cantidad", "precioUnitario", "subtotal") VALUES
(2, 1, 2, 60.00, 120.00);

-- VENTA 3: Hace 3 días
INSERT INTO "Venta" ("id", "fecha", "idCliente", "total", "metodoPago", "idUsuario") VALUES
(3, CURRENT_DATE - INTERVAL '3 days' + TIME '11:00:00', 3, 440.00, 'EFECTIVO', 2);
INSERT INTO "DetalleVenta" ("idVenta", "idProducto", "cantidad", "precioUnitario", "subtotal") VALUES
(3, 4, 2, 220.00, 440.00);

-- VENTA 4: Hace 2 días
INSERT INTO "Venta" ("id", "fecha", "idCliente", "total", "metodoPago", "idUsuario") VALUES
(4, CURRENT_DATE - INTERVAL '2 days' + TIME '16:45:00', 4, 305.00, 'TRANSFERENCIA', 2);
INSERT INTO "DetalleVenta" ("idVenta", "idProducto", "cantidad", "precioUnitario", "subtotal") VALUES
(4, 3, 1, 125.00, 125.00),
(4, 8, 1, 75.00, 75.00),
(4, 10, 3, 35.00, 105.00);

-- VENTA 5: Hace 1 día
INSERT INTO "Venta" ("id", "fecha", "idCliente", "total", "metodoPago", "idUsuario") VALUES
(5, CURRENT_DATE - INTERVAL '1 days' + TIME '09:20:00', 1, 250.00, 'EFECTIVO', 2);
INSERT INTO "DetalleVenta" ("idVenta", "idProducto", "cantidad", "precioUnitario", "subtotal") VALUES
(5, 6, 1, 250.00, 250.00);

-- ===== FORZAR ACTUALIZACIÓN DE STOCK DE PRODUCTOS BASADO EN VENTAS SEMILLA =====
UPDATE "Producto" SET "stockActual" = 150 - 2 WHERE id = 1; -- 2 uds vendidas en Venta #2
UPDATE "Producto" SET "stockActual" = 80 - 1 WHERE id = 2;  -- 1 ud vendida en Venta #1
UPDATE "Producto" SET "stockActual" = 120 - 1 WHERE id = 3; -- 1 ud vendida en Venta #4
UPDATE "Producto" SET "stockActual" = 60 - 2 WHERE id = 4;  -- 2 uds vendidas en Venta #3
UPDATE "Producto" SET "stockActual" = 45 - 1 WHERE id = 6;  -- 1 ud vendida en Venta #5
UPDATE "Producto" SET "stockActual" = 70 - 1 WHERE id = 8;  -- 1 ud vendida en Venta #4
UPDATE "Producto" SET "stockActual" = 110 - 3 WHERE id = 10;-- 3 uds vendidas en Venta #4

-- Actualizar stock de lotes correspondientes
UPDATE "Lote" SET "stockActual" = 150 - 2 WHERE id = 1;
UPDATE "Lote" SET "stockActual" = 80 - 1 WHERE id = 2;
UPDATE "Lote" SET "stockActual" = 120 - 1 WHERE id = 3;
UPDATE "Lote" SET "stockActual" = 60 - 2 WHERE id = 4;
UPDATE "Lote" SET "stockActual" = 45 - 1 WHERE id = 6;
UPDATE "Lote" SET "stockActual" = 70 - 1 WHERE id = 8;
UPDATE "Lote" SET "stockActual" = 110 - 3 WHERE id = 10;

-- ===== INYECTAR MOVIMIENTOS KARDEX DE SALIDA DE VENTAS =====
INSERT INTO "MovimientoInventario" ("idProducto", "idLote", "tipo", "cantidad", "stockResultante", "costoUnitario", "referencia", "idUsuario") VALUES
(2, 2, 'SALIDA_VENTA', 1, 79, 120.00, 'Venta #1', 2),
(1, 1, 'SALIDA_VENTA', 2, 148, 40.00, 'Venta #2', 2),
(4, 4, 'SALIDA_VENTA', 2, 58, 150.00, 'Venta #3', 2),
(3, 3, 'SALIDA_VENTA', 1, 119, 85.00, 'Venta #4', 2),
(8, 8, 'SALIDA_VENTA', 1, 69, 45.00, 'Venta #4', 2),
(10, 10, 'SALIDA_VENTA', 3, 107, 20.00, 'Venta #4', 2),
(6, 6, 'SALIDA_VENTA', 1, 44, 180.00, 'Venta #5', 2);

-- ===== EJECUTAR ESTADÍSTICAS INICIALES PARA SINCRONIZAR LOS TRIGGERS =====
-- Sincronizar stats globales por producto
INSERT INTO "ProductoVentaStats" ("idProducto", "totalUnidadesVendidas", "totalVecesVendido", "ingresoTotal", "ultimaVenta") VALUES
(1, 2, 1, 120.00, CURRENT_DATE - INTERVAL '4 days' + TIME '14:15:00'),
(2, 1, 1, 180.00, CURRENT_DATE - INTERVAL '5 days' + TIME '10:30:00'),
(3, 1, 1, 125.00, CURRENT_DATE - INTERVAL '2 days' + TIME '16:45:00'),
(4, 2, 1, 440.00, CURRENT_DATE - INTERVAL '3 days' + TIME '11:00:00'),
(6, 1, 1, 250.00, CURRENT_DATE - INTERVAL '1 days' + TIME '09:20:00'),
(8, 1, 1, 75.00, CURRENT_DATE - INTERVAL '2 days' + TIME '16:45:00'),
(10, 3, 1, 105.00, CURRENT_DATE - INTERVAL '2 days' + TIME '16:45:00');

-- Sincronizar stats por cliente
INSERT INTO "ClienteProductoStats" ("idCliente", "idProducto", "totalComprado", "vecesComprado", "ultimaCompra") VALUES
(1, 2, 1, 1, CURRENT_DATE - INTERVAL '5 days' + TIME '10:30:00'),
(2, 1, 2, 1, CURRENT_DATE - INTERVAL '4 days' + TIME '14:15:00'),
(3, 4, 2, 1, CURRENT_DATE - INTERVAL '3 days' + TIME '11:00:00'),
(4, 3, 1, 1, CURRENT_DATE - INTERVAL '2 days' + TIME '16:45:00'),
(4, 8, 1, 1, CURRENT_DATE - INTERVAL '2 days' + TIME '16:45:00'),
(4, 10, 3, 1, CURRENT_DATE - INTERVAL '2 days' + TIME '16:45:00'),
(1, 6, 1, 1, CURRENT_DATE - INTERVAL '1 days' + TIME '09:20:00');

-- Generar alerta inicial de stock bajo para PodoCare Crema (stockActual: 5, stockMinimo: 8)
INSERT INTO "AlertaStockBajo" ("idProducto", "nombreProducto", "stockActual", "stockMinimo") VALUES
(11, 'Crema Podológica PodoCare 100ml', 5, 8);

-- ===== COMPLETADO =====
RAISE NOTICE '🎉 Base de datos del Sistema de Farmacia inicializada con éxito para NeonDB!';
RAISE NOTICE '👉 Administrador Demo: admin@farmacia.com | Clave: password123';
RAISE NOTICE '👉 Empleado Demo: demo@farmacia.com | Clave: demo1234';
