-- ============================================================
-- MIGRACIÓN INCREMENTAL V2 - FARMAPOS
-- Fecha: 2026-06-18
-- Descripción: Migración incremental segura para producción (NeonDB).
--              Agrega tabla de solicitudes de reinicio de contraseña,
--              columnas de seguridad para rate-limiting, columnas
--              de metadatos de producto, trazabilidad en Kardex,
--              índices y restauración de triggers, vistas y procedimientos.
-- ============================================================

-- 1. NUEVAS TABLAS
CREATE TABLE IF NOT EXISTS "PasswordResetRequest" (
    "id" SERIAL NOT NULL,
    "correo" TEXT NOT NULL,
    "ip" TEXT,
    "exitoso" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY ("id")
);

-- 2. NUEVAS COLUMNAS EN TABLAS EXISTENTES
ALTER TABLE "PasswordResetToken" ADD COLUMN IF NOT EXISTS "intentosFallidos" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PasswordResetToken" ADD COLUMN IF NOT EXISTS "ipOrigen" TEXT;

ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "laboratorio" TEXT;
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "concentracion" TEXT;
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "unidadMedida" TEXT;

ALTER TABLE "MovimientoInventario" ADD COLUMN IF NOT EXISTS "observacion" TEXT;

-- 3. CONSOLIDACIÓN DE LOTES DUPLICADOS (Evita error SQLSTATE 23505 al crear el índice único)
-- 3.1. Re-asociar los movimientos de inventario de lotes duplicados al lote maestro (el de ID más bajo)
WITH lotes_duplicados AS (
    SELECT "idProducto", "codigoLote", MIN(id) AS master_id
    FROM "Lote"
    GROUP BY "idProducto", "codigoLote"
    HAVING COUNT(*) > 1
),
mapeo_lotes AS (
    SELECT l.id AS duplicate_id, d.master_id
    FROM "Lote" l
    JOIN lotes_duplicados d ON l."idProducto" = d."idProducto" AND l."codigoLote" = d."codigoLote"
    WHERE l.id <> d.master_id
)
UPDATE "MovimientoInventario" mi
SET "idLote" = m.master_id
FROM mapeo_lotes m
WHERE mi."idLote" = m.duplicate_id;

-- 3.2. Consolidar stocks en el lote maestro sumando el de sus duplicados
WITH lotes_duplicados AS (
    SELECT "idProducto", "codigoLote", MIN(id) AS master_id
    FROM "Lote"
    GROUP BY "idProducto", "codigoLote"
    HAVING COUNT(*) > 1
),
consolidado AS (
    SELECT 
        d.master_id,
        SUM(l."stockInicial") AS total_stock_inicial,
        SUM(l."stockActual") AS total_stock_actual
    FROM "Lote" l
    JOIN lotes_duplicados d ON l."idProducto" = d."idProducto" AND l."codigoLote" = d."codigoLote"
    GROUP BY d.master_id
)
UPDATE "Lote" l
SET 
    "stockInicial" = c.total_stock_inicial,
    "stockActual" = c.total_stock_actual,
    "updatedAt" = NOW()
FROM consolidado c
WHERE l.id = c.master_id;

-- 3.3. Eliminar los registros duplicados de la tabla Lote
WITH lotes_duplicados AS (
    SELECT "idProducto", "codigoLote", MIN(id) AS master_id
    FROM "Lote"
    GROUP BY "idProducto", "codigoLote"
    HAVING COUNT(*) > 1
)
DELETE FROM "Lote"
WHERE id IN (
    SELECT l.id 
    FROM "Lote" l
    JOIN lotes_duplicados d ON l."idProducto" = d."idProducto" AND l."codigoLote" = d."codigoLote"
    WHERE l.id <> d.master_id
);

-- 3.4. NUEVOS CONSTRAINTS
-- Evitar que existan lotes duplicados con el mismo código para el mismo producto
CREATE UNIQUE INDEX IF NOT EXISTS "Lote_idProducto_codigoLote_key" ON "Lote"("idProducto", "codigoLote");

-- 4. NUEVOS ÍNDICES
CREATE INDEX IF NOT EXISTS "Lote_fechaVencimiento_idx" ON "Lote"("fechaVencimiento");
CREATE INDEX IF NOT EXISTS "Venta_fecha_idx" ON "Venta"("fecha");
CREATE INDEX IF NOT EXISTS "PasswordResetRequest_correo_createdAt_idx" ON "PasswordResetRequest"("correo", "createdAt");
CREATE INDEX IF NOT EXISTS "PasswordResetRequest_ip_createdAt_idx" ON "PasswordResetRequest"("ip", "createdAt");

-- 5. TABLAS AUXILIARES PARA ESTADÍSTICAS Y AUDITORÍA DE TRIGGERS
CREATE TABLE IF NOT EXISTS "ClienteProductoStats" (
    id SERIAL PRIMARY KEY,
    "idCliente" INT NOT NULL REFERENCES "Cliente"(id) ON DELETE CASCADE,
    "idProducto" INT NOT NULL REFERENCES "Producto"(id) ON DELETE CASCADE,
    "totalComprado" INT NOT NULL DEFAULT 0,
    "vecesComprado" INT NOT NULL DEFAULT 0,
    "ultimaCompra" TIMESTAMP DEFAULT NOW(),
    UNIQUE("idCliente", "idProducto")
);

CREATE TABLE IF NOT EXISTS "ProductoVentaStats" (
    id SERIAL PRIMARY KEY,
    "idProducto" INT NOT NULL UNIQUE REFERENCES "Producto"(id) ON DELETE CASCADE,
    "totalUnidadesVendidas" INT NOT NULL DEFAULT 0,
    "totalVecesVendido" INT NOT NULL DEFAULT 0,
    "ingresoTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ultimaVenta" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "AlertaStockBajo" (
    id SERIAL PRIMARY KEY,
    "idProducto" INT NOT NULL REFERENCES "Producto"(id) ON DELETE CASCADE,
    "nombreProducto" VARCHAR(255) NOT NULL,
    "stockActual" INT NOT NULL,
    "stockMinimo" INT NOT NULL,
    "fechaAlerta" TIMESTAMP DEFAULT NOW(),
    "resuelta" BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS "HistorialPrecios" (
    id SERIAL PRIMARY KEY,
    "idProducto" INT NOT NULL REFERENCES "Producto"(id) ON DELETE CASCADE,
    "nombreProducto" VARCHAR(255) NOT NULL,
    "precioVentaAnterior" DECIMAL(10,2),
    "precioVentaNuevo" DECIMAL(10,2),
    "precioCompraAnterior" DECIMAL(10,2),
    "precioCompraNuevo" DECIMAL(10,2),
    "fechaCambio" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "AuditoriaDDL" (
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

CREATE TABLE IF NOT EXISTS "LogProcedimientos" (
    id SERIAL PRIMARY KEY,
    procedimiento TEXT NOT NULL,
    descripcion TEXT,
    datos JSONB,
    usuario TEXT DEFAULT current_user,
    fecha TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Auditoria" (
    "id" SERIAL PRIMARY KEY,
    "usuario" VARCHAR(255) NOT NULL,
    "fecha" DATE NOT NULL DEFAULT CURRENT_DATE,
    "hora" TIME NOT NULL DEFAULT CURRENT_TIME,
    "accion" VARCHAR(50) NOT NULL,
    "modulo" VARCHAR(100) NOT NULL,
    "ip" VARCHAR(50),
    "datos_anteriores" JSONB,
    "datos_nuevos" JSONB
);

-- 6. RECREAR FUNCIONES Y TRIGGERS REACTIVOS

CREATE OR REPLACE FUNCTION fn_registrar_auditoria_dml()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario TEXT;
    v_ip TEXT;
    v_datos_ant JSONB := NULL;
    v_datos_nue JSONB := NULL;
BEGIN
    v_usuario := COALESCE(
        NULLIF(current_setting('app.current_user_id', true), ''),
        session_user::text
    );
    v_ip := COALESCE(
        NULLIF(current_setting('app.client_ip', true), ''),
        '127.0.0.1'
    );

    IF (TG_OP = 'DELETE') THEN
        v_datos_ant := to_jsonb(OLD);
    ELSIF (TG_OP = 'INSERT') THEN
        v_datos_nue := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_datos_ant := to_jsonb(OLD);
        v_datos_nue := to_jsonb(NEW);
    END IF;

    BEGIN
        INSERT INTO "Auditoria" ("usuario", "accion", "modulo", "ip", "datos_anteriores", "datos_nuevos")
        VALUES (v_usuario, TG_OP, TG_TABLE_NAME, v_ip, v_datos_ant, v_datos_nue);
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[Auditoria] Error al registrar operación % en %: %', TG_OP, TG_TABLE_NAME, SQLERRM;
    END;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Asignar triggers de auditoría a las tablas principales
DROP TRIGGER IF EXISTS tr_audit_producto ON "Producto";
CREATE TRIGGER tr_audit_producto AFTER INSERT OR UPDATE OR DELETE ON "Producto" FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria_dml();

DROP TRIGGER IF EXISTS tr_audit_venta ON "Venta";
CREATE TRIGGER tr_audit_venta AFTER INSERT OR UPDATE OR DELETE ON "Venta" FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria_dml();

DROP TRIGGER IF EXISTS tr_audit_detalle_venta ON "DetalleVenta";
CREATE TRIGGER tr_audit_detalle_venta AFTER INSERT OR UPDATE OR DELETE ON "DetalleVenta" FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria_dml();

DROP TRIGGER IF EXISTS tr_audit_compra ON "Compra";
CREATE TRIGGER tr_audit_compra AFTER INSERT OR UPDATE OR DELETE ON "Compra" FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria_dml();

DROP TRIGGER IF EXISTS tr_audit_detalle_compra ON "DetalleCompra";
CREATE TRIGGER tr_audit_detalle_compra AFTER INSERT OR UPDATE OR DELETE ON "DetalleCompra" FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria_dml();

DROP TRIGGER IF EXISTS tr_audit_cliente ON "Cliente";
CREATE TRIGGER tr_audit_cliente AFTER INSERT OR UPDATE OR DELETE ON "Cliente" FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria_dml();

DROP TRIGGER IF EXISTS tr_audit_proveedor ON "Proveedor";
CREATE TRIGGER tr_audit_proveedor AFTER INSERT OR UPDATE OR DELETE ON "Proveedor" FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria_dml();

DROP TRIGGER IF EXISTS tr_audit_usuario ON "Usuario";
CREATE TRIGGER tr_audit_usuario AFTER INSERT OR UPDATE OR DELETE ON "Usuario" FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria_dml();

-- Triggers reactivos específicos
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

DROP TRIGGER IF EXISTS tr_rastrear_compras_cliente ON "DetalleVenta";
CREATE TRIGGER tr_rastrear_compras_cliente
AFTER INSERT ON "DetalleVenta"
FOR EACH ROW EXECUTE FUNCTION fn_rastrear_compras_cliente();

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

DROP TRIGGER IF EXISTS tr_actualizar_stats_producto ON "DetalleVenta";
CREATE TRIGGER tr_actualizar_stats_producto
AFTER INSERT ON "DetalleVenta"
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_stats_producto();

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

DROP TRIGGER IF EXISTS tr_alerta_stock_bajo ON "Producto";
CREATE TRIGGER tr_alerta_stock_bajo
AFTER UPDATE OF "stockActual" ON "Producto"
FOR EACH ROW EXECUTE FUNCTION fn_alerta_stock_bajo();

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

DROP TRIGGER IF EXISTS tr_historial_precios ON "Producto";
CREATE TRIGGER tr_historial_precios
AFTER UPDATE ON "Producto"
FOR EACH ROW EXECUTE FUNCTION fn_historial_precios();

-- 7. RECREAR VISTAS SQL
CREATE OR REPLACE VIEW vw_inventario_general AS
SELECT 
    p.id AS producto_id,
    p.nombre AS producto_nombre,
    p."codigoBarras" AS codigo_barras,
    c.nombre AS categoria_nombre,
    p."stockActual" AS stock_total,
    p."stockMinimo" AS stock_minimo,
    p."precioCompra" AS precio_compra,
    p."precioVenta" AS precio_venta,
    p.activo
FROM "Producto" p
JOIN "CategoriaProducto" c ON c.id = p."idCategoria";

CREATE OR REPLACE VIEW vw_ventas_diarias AS
SELECT 
    fecha::date AS fecha_venta,
    COUNT(id) AS cantidad_ventas,
    SUM(total) AS total_recaudado,
    AVG(total) AS ticket_promedio
FROM "Venta"
WHERE estado = 'COMPLETADA'
GROUP BY fecha::date;

CREATE OR REPLACE VIEW vw_ventas_mensuales AS
SELECT 
    EXTRACT(YEAR FROM fecha)::INT AS anio,
    EXTRACT(MONTH FROM fecha)::INT AS mes,
    COUNT(id) AS cantidad_ventas,
    SUM(total) AS total_recaudado
FROM "Venta"
WHERE estado = 'COMPLETADA'
GROUP BY EXTRACT(YEAR FROM fecha), EXTRACT(MONTH FROM fecha);

CREATE OR REPLACE VIEW vw_compras_mensuales AS
SELECT 
    EXTRACT(YEAR FROM fecha)::INT AS anio,
    EXTRACT(MONTH FROM fecha)::INT AS mes,
    COUNT(id) AS cantidad_compras,
    SUM(total) AS total_invertido
FROM "Compra"
GROUP BY EXTRACT(YEAR FROM fecha), EXTRACT(MONTH FROM fecha);

CREATE OR REPLACE VIEW vw_clientes_frecuentes AS
SELECT 
    c.id AS cliente_id,
    c."nombreCompleto" AS cliente_nombre,
    c.cedula,
    COUNT(v.id) AS total_compras,
    SUM(v.total) AS total_gastado,
    MAX(v.fecha) AS ultima_compra
FROM "Cliente" c
JOIN "Venta" v ON v."idCliente" = c.id
WHERE v.estado = 'COMPLETADA' AND c.activo = true
GROUP BY c.id, c."nombreCompleto", c.cedula;

CREATE OR REPLACE VIEW vw_productos_mas_vendidos AS
SELECT 
    p.id AS producto_id,
    p.nombre AS producto_nombre,
    SUM(dv.cantidad) AS cantidad_vendida,
    SUM(dv.subtotal) AS total_recaudado
FROM "Producto" p
JOIN "DetalleVenta" dv ON dv."idProducto" = p.id
JOIN "Venta" v ON v.id = dv."idVenta"
WHERE v.estado = 'COMPLETADA'
GROUP BY p.id, p.nombre;

CREATE OR REPLACE VIEW vw_auditoria_general AS
SELECT 
    a.id,
    a.usuario,
    a.fecha,
    a.hora,
    a.accion,
    a.modulo,
    a.ip,
    a.datos_anteriores,
    a.datos_nuevos
FROM "Auditoria" a;

CREATE OR REPLACE VIEW vw_kardex_producto AS
SELECT 
    m.id AS movimiento_id,
    m."idProducto" AS producto_id,
    p.nombre AS producto_nombre,
    m."createdAt" AS fecha,
    m.tipo AS tipo_movimiento,
    m.referencia,
    u."nombreCompleto" AS usuario_nombre,
    CASE 
        WHEN m.tipo IN ('ENTRADA_COMPRA', 'AJUSTE_POSITIVO') THEN m.cantidad 
        ELSE NULL 
    END AS entrada,
    CASE 
        WHEN m.tipo IN ('SALIDA_VENTA', 'AJUSTE_NEGATIVO') THEN m.cantidad 
        ELSE NULL 
    END AS salida,
    m."stockResultante" AS saldo
FROM "MovimientoInventario" m
JOIN "Producto" p ON p.id = m."idProducto"
LEFT JOIN "Usuario" u ON u.id = m."idUsuario";

CREATE OR REPLACE VIEW vw_productos_por_vencer AS
SELECT 
    l.id AS lote_id,
    l."codigoLote" AS codigo_lote,
    p.id AS producto_id,
    p.nombre AS producto_nombre,
    l."stockActual" AS stock_lote,
    l."fechaVencimiento" AS fecha_vencimiento,
    (l."fechaVencimiento"::date - CURRENT_DATE) AS dias_restantes,
    CASE 
        WHEN (l."fechaVencimiento"::date - CURRENT_DATE) <= 0 THEN 'VENCIDO'
        WHEN (l."fechaVencimiento"::date - CURRENT_DATE) <= 30 THEN 'MENOS_30_DIAS'
        WHEN (l."fechaVencimiento"::date - CURRENT_DATE) <= 60 THEN 'MENOS_60_DIAS'
        WHEN (l."fechaVencimiento"::date - CURRENT_DATE) <= 90 THEN 'MENOS_90_DIAS'
        ELSE 'SEGURO'
    END AS estado_vencimiento
FROM "Lote" l
JOIN "Producto" p ON p.id = l."idProducto"
WHERE l.activo = true AND l."stockActual" > 0 AND l."fechaVencimiento" IS NOT NULL;

CREATE OR REPLACE VIEW vw_productos_abc AS
WITH total_ventas AS (
    SELECT SUM(subtotal) AS total_global FROM "DetalleVenta" dv
    JOIN "Venta" v ON v.id = dv."idVenta"
    WHERE v.estado = 'COMPLETADA'
),
ventas_producto AS (
    SELECT 
        p.id AS producto_id,
        p.nombre AS producto_nombre,
        COALESCE(SUM(dv.subtotal), 0) AS ingresos_producto
    FROM "Producto" p
    LEFT JOIN "DetalleVenta" dv ON dv."idProducto" = p.id
    LEFT JOIN "Venta" v ON v.id = dv."idVenta" AND v.estado = 'COMPLETADA'
    GROUP BY p.id, p.nombre
),
acumulado AS (
    SELECT 
        vp.producto_id,
        vp.producto_nombre,
        vp.ingresos_producto,
        SUM(vp.ingresos_producto) OVER (ORDER BY vp.ingresos_producto DESC) AS ingreso_acumulado,
        COALESCE((SELECT total_global FROM total_ventas), 1.00) AS total_global
    FROM ventas_producto vp
),
porcentajes AS (
    SELECT 
        producto_id,
        producto_nombre,
        ingresos_producto,
        ingreso_acumulado,
        (ingreso_acumulado / total_global) * 100 AS porcentaje_acumulado
    FROM acumulado
)
SELECT 
    producto_id,
    producto_nombre,
    ingresos_producto,
    porcentaje_acumulado,
    CASE 
        WHEN porcentaje_acumulado <= 70.00 THEN 'A'
        WHEN porcentaje_acumulado <= 90.00 THEN 'B'
        ELSE 'C'
    END AS clasificacion_abc
FROM porcentajes;

-- 8. RECREAR PROCEDIMIENTOS ALMACENADOS

CREATE OR REPLACE PROCEDURE sp_reporte_ventas_por_fecha(p_fecha_inicio DATE, p_fecha_fin DATE)
LANGUAGE plpgsql AS $$
DECLARE
    r RECORD;
    v_total_general NUMERIC(10,2) := 0;
BEGIN
    FOR r IN
        SELECT v.id AS venta_id, v.fecha, v."metodoPago" AS metodo_pago, v.total,
               c."nombreCompleto" AS cliente, u."nombreCompleto" AS vendedor
        FROM "Venta" v
        LEFT JOIN "Cliente" c ON c.id = v."idCliente"
        JOIN "Usuario" u      ON u.id = v."idUsuario"
        WHERE v.fecha::date BETWEEN p_fecha_inicio AND p_fecha_fin
        ORDER BY v.fecha
    LOOP
        v_total_general := v_total_general + r.total;
    END LOOP;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_productos_stock_bajo()
LANGUAGE plpgsql AS $$
DECLARE
    r RECORD;
    v_contador INT := 0;
BEGIN
    FOR r IN
        SELECT p.id, p.nombre, cp.nombre AS categoria, p."stockActual" AS stock_actual, p."stockMinimo" AS stock_minimo,
               (p."stockMinimo" - p."stockActual") AS unidades_faltantes
        FROM "Producto" p
        JOIN "CategoriaProducto" cp ON cp.id = p."idCategoria"
        WHERE p.activo = true AND p."stockMinimo" IS NOT NULL AND p."stockActual" < p."stockMinimo"
        ORDER BY unidades_faltantes DESC
    LOOP
        v_contador := v_contador + 1;
    END LOOP;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_resumen_ventas_por_metodo_pago(p_fecha_inicio DATE, p_fecha_fin DATE)
LANGUAGE plpgsql AS $$
DECLARE
    r RECORD;
    v_total_general NUMERIC(10,2) := 0;
BEGIN
    FOR r IN
        SELECT v."metodoPago" AS metodo, COUNT(*) AS cantidad_ventas, SUM(v.total) AS total_metodo
        FROM "Venta" v
        WHERE v.fecha::date BETWEEN p_fecha_inicio AND p_fecha_fin
        GROUP BY v."metodoPago" ORDER BY total_metodo DESC
    LOOP
        v_total_general := v_total_general + r.total_metodo;
    END LOOP;
END;
$$;

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

    INSERT INTO "LogProcedimientos" (procedimiento, descripcion, datos)
    VALUES ('sp_reporte_ventas', 'Reporte generado',
        jsonb_build_object('inicio', p_fecha_inicio, 'fin', p_fecha_fin, 'totalVentas', v_total_ventas, 'ingresoTotal', v_ingreso_total));
END;
$$;

CREATE OR REPLACE PROCEDURE sp_ajuste_inventario(p_id_producto INT, p_nuevo_stock INT, p_motivo TEXT)
LANGUAGE plpgsql AS $$
DECLARE
    v_stock_anterior INT;
    v_nombre TEXT;
    v_diferencia INT;
BEGIN
    SELECT "stockActual", nombre INTO v_stock_anterior, v_nombre FROM "Producto" WHERE id = p_id_producto;
    v_diferencia := p_nuevo_stock - v_stock_anterior;
    UPDATE "Producto" SET "stockActual" = p_nuevo_stock, "updatedAt" = NOW() WHERE id = p_id_producto;
    
    INSERT INTO "LogProcedimientos" (procedimiento, descripcion, datos)
    VALUES ('sp_ajuste_inventario', p_motivo,
        jsonb_build_object('producto', v_nombre, 'stockAnterior', v_stock_anterior, 'stockNuevo', p_nuevo_stock, 'diferencia', v_diferencia));
END;
$$;

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

    INSERT INTO "LogProcedimientos" (procedimiento, descripcion, datos)
    VALUES ('sp_cierre_caja', 'Cierre de caja del día ' || p_fecha,
        jsonb_build_object('fecha', p_fecha, 'numVentas', v_num_ventas, 'efectivo', v_efectivo, 'total', v_total));
END;
$$;

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
    END LOOP;

    INSERT INTO "LogProcedimientos" (procedimiento, descripcion, datos)
    VALUES ('sp_desactivar_sin_movimiento', v_count || ' productos desactivados por inactividad',
        jsonb_build_object('diasSinVenta', p_dias, 'productosDesactivados', v_count));
END;
$$;

CREATE OR REPLACE PROCEDURE actualizar_stock(
    p_id_producto INT, 
    p_nuevo_stock INT, 
    p_motivo TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_stock_anterior INT;
    v_nombre TEXT;
BEGIN
    SELECT "stockActual", nombre INTO v_stock_anterior, v_nombre
    FROM "Producto" WHERE id = p_id_producto;

    IF v_nombre IS NULL THEN
        RAISE EXCEPTION 'Producto con ID % no existe', p_id_producto;
    END IF;

    UPDATE "Producto"
    SET "stockActual" = p_nuevo_stock, "updatedAt" = NOW()
    WHERE id = p_id_producto;

    INSERT INTO "MovimientoInventario" ("idProducto", "tipo", "cantidad", "stockResultante", "referencia")
    VALUES (
        p_id_producto, 
        CASE WHEN p_nuevo_stock > v_stock_anterior THEN 'AJUSTE_POSITIVO' ELSE 'AJUSTE_NEGATIVO' END, 
        ABS(p_nuevo_stock - v_stock_anterior), 
        p_nuevo_stock, 
        p_motivo
    );
END;
$$;

CREATE OR REPLACE PROCEDURE apertura_caja(
    p_id_usuario INT, 
    p_monto_inicial DECIMAL
)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO "LogProcedimientos" (procedimiento, descripcion, datos)
    VALUES (
        'apertura_caja', 
        'Apertura de caja realizada por usuario ID ' || p_id_usuario, 
        jsonb_build_object('idUsuario', p_id_usuario, 'montoInicial', p_monto_inicial)
    );
END;
$$;

CREATE OR REPLACE PROCEDURE cierre_caja(
    p_id_usuario INT, 
    p_monto_final_real DECIMAL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_efectivo DECIMAL(10,2);
    v_tarjeta DECIMAL(10,2);
    v_transferencia DECIMAL(10,2);
    v_total_ventas DECIMAL(10,2);
    v_diferencia DECIMAL(10,2);
BEGIN
    SELECT 
        COALESCE(SUM(CASE WHEN "metodoPago" = 'EFECTIVO' THEN total ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN "metodoPago" = 'TARJETA' THEN total ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN "metodoPago" = 'TRANSFERENCIA' THEN total ELSE 0 END), 0.00),
        COALESCE(SUM(total), 0.00)
    INTO v_efectivo, v_tarjeta, v_transferencia, v_total_ventas
    FROM "Venta"
    WHERE fecha::date = CURRENT_DATE AND estado = 'COMPLETADA';

    v_diferencia := p_monto_final_real - v_total_ventas;

    INSERT INTO "LogProcedimientos" (procedimiento, descripcion, datos)
    VALUES (
        'cierre_caja', 
        'Cierre de caja consolidado realizado por usuario ID ' || p_id_usuario, 
        jsonb_build_object(
            'idUsuario', p_id_usuario, 
            'montoFinalReal', p_monto_final_real, 
            'totalVentasSistema', v_total_ventas,
            'efectivo', v_efectivo,
            'tarjeta', v_tarjeta,
            'transferencia', v_transferencia,
            'diferencia', v_diferencia
        )
    );
END;
$$;

CREATE OR REPLACE PROCEDURE registrar_auditoria(
    p_usuario TEXT,
    p_accion TEXT,
    p_modulo TEXT,
    p_ip TEXT,
    p_datos_anteriores JSONB,
    p_datos_nuevos JSONB
)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO "Auditoria" ("usuario", "accion", "modulo", "ip", "datos_anteriores", "datos_nuevos")
    VALUES (p_usuario, p_accion, p_modulo, p_ip, p_datos_anteriores, p_datos_nuevos);
END;
$$;

-- 9. RESTRICCIONES DE STOCK NO NEGATIVO
ALTER TABLE "Producto" DROP CONSTRAINT IF EXISTS "chk_stock_no_negativo";
ALTER TABLE "Producto" ADD CONSTRAINT "chk_stock_no_negativo" CHECK ("stockActual" >= 0);

ALTER TABLE "Lote" DROP CONSTRAINT IF EXISTS "chk_stock_lote_no_negativo";
ALTER TABLE "Lote" ADD CONSTRAINT "chk_stock_lote_no_negativo" CHECK ("stockActual" >= 0);

-- 10. ÍNDICES DE CLAVES FORÁNEAS FALTANTES PARA RENDIMIENTO
CREATE INDEX IF NOT EXISTS "idx_proveedor_producto_idproveedor" ON "ProveedorProducto"("idProveedor");
CREATE INDEX IF NOT EXISTS "idx_proveedor_producto_idproducto" ON "ProveedorProducto"("idProducto");
CREATE INDEX IF NOT EXISTS "idx_detalle_compra_idcompra" ON "DetalleCompra"("idCompra");
CREATE INDEX IF NOT EXISTS "idx_lote_iddetallecompra" ON "Lote"("idDetalleCompra");
CREATE INDEX IF NOT EXISTS "idx_movimiento_inventario_idlote" ON "MovimientoInventario"("idLote");
CREATE INDEX IF NOT EXISTS "idx_movimiento_inventario_idusuario" ON "MovimientoInventario"("idUsuario");
CREATE INDEX IF NOT EXISTS "idx_venta_idcliente" ON "Venta"("idCliente");
CREATE INDEX IF NOT EXISTS "idx_usuario_idrol" ON "Usuario"("idRol");
CREATE INDEX IF NOT EXISTS "idx_producto_idcategoria" ON "Producto"("idCategoria");
CREATE INDEX IF NOT EXISTS "idx_compra_idproveedor" ON "Compra"("idProveedor");
CREATE INDEX IF NOT EXISTS "idx_compra_idusuario" ON "Compra"("idUsuario");
CREATE INDEX IF NOT EXISTS "idx_detalle_compra_idproducto" ON "DetalleCompra"("idProducto");
CREATE INDEX IF NOT EXISTS "idx_venta_idusuario" ON "Venta"("idUsuario");
CREATE INDEX IF NOT EXISTS "idx_detalle_venta_idproducto" ON "DetalleVenta"("idProducto");
CREATE INDEX IF NOT EXISTS "idx_detalle_venta_idventa" ON "DetalleVenta"("idVenta");
CREATE INDEX IF NOT EXISTS "idx_auditoria_log_idusuario" ON "AuditoriaLog"("idUsuario");
CREATE INDEX IF NOT EXISTS "idx_cliente_producto_stats_idcliente" ON "ClienteProductoStats"("idCliente");
CREATE INDEX IF NOT EXISTS "idx_cliente_producto_stats_idproducto" ON "ClienteProductoStats"("idProducto");
CREATE INDEX IF NOT EXISTS "idx_alerta_stock_bajo_idproducto" ON "AlertaStockBajo"("idProducto");
CREATE INDEX IF NOT EXISTS "idx_historial_precios_idproducto" ON "HistorialPrecios"("idProducto");

