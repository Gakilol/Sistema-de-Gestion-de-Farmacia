-- =========================================================================
--  SCRIPT DE AUDITORÍA COMPLETA, VISTAS, PROCEDIMIENTOS Y FUNCIONES SQL
--  SISTEMA DE GESTIÓN DE FARMACIA - PODOCARE SYSTEM
--  
--  Diseñado por Senior DBA y Arquitecto de Base de Datos.
-- =========================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. TABLA Y DISPARADORES (TRIGGERS) DE AUDITORÍA TRANSACCIONAL DML
-- ─────────────────────────────────────────────────────────────────────────

-- Crear la tabla Auditoria en caso de que no exista
CREATE TABLE IF NOT EXISTS "Auditoria" (
    "id" SERIAL PRIMARY KEY,
    "usuario" VARCHAR(255) NOT NULL,
    "fecha" DATE NOT NULL DEFAULT CURRENT_DATE,
    "hora" TIME NOT NULL DEFAULT CURRENT_TIME,
    "accion" VARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    "modulo" VARCHAR(100) NOT NULL, -- Tabla afectada
    "ip" VARCHAR(50),
    "datos_anteriores" JSONB, -- Estado previo del registro
    "datos_nuevos" JSONB -- Estado posterior al cambio
);

-- Función desencadenadora para auditoría DML genérica
CREATE OR REPLACE FUNCTION fn_registrar_auditoria_dml()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario TEXT;
    v_ip TEXT;
    v_datos_ant JSONB := NULL;
    v_datos_nue JSONB := NULL;
BEGIN
    -- Capturar el usuario de la aplicación Next.js mediante variable local de sesión,
    -- o en su defecto, el usuario de la conexión de base de datos.
    v_usuario := COALESCE(current_setting('app.current_user_id', true), session_user::text);
    v_ip := COALESCE(current_setting('app.client_ip', true), '127.0.0.1');

    IF (TG_OP = 'DELETE') THEN
        v_datos_ant := to_jsonb(OLD);
    ELSIF (TG_OP = 'INSERT') THEN
        v_datos_nue := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_datos_ant := to_jsonb(OLD);
        v_datos_nue := to_jsonb(NEW);
    END IF;

    INSERT INTO "Auditoria" ("usuario", "accion", "modulo", "ip", "datos_anteriores", "datos_nuevos")
    VALUES (v_usuario, TG_OP, TG_TABLE_NAME, v_ip, v_datos_ant, v_datos_nue);

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers en tablas críticas para resguardo total de la integridad
DROP TRIGGER IF EXISTS tr_audit_producto ON "Producto";
CREATE TRIGGER tr_audit_producto 
AFTER INSERT OR UPDATE OR DELETE ON "Producto" 
FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria_dml();

DROP TRIGGER IF EXISTS tr_audit_venta ON "Venta";
CREATE TRIGGER tr_audit_venta 
AFTER INSERT OR UPDATE OR DELETE ON "Venta" 
FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria_dml();

DROP TRIGGER IF EXISTS tr_audit_detalle_venta ON "DetalleVenta";
CREATE TRIGGER tr_audit_detalle_venta 
AFTER INSERT OR UPDATE OR DELETE ON "DetalleVenta" 
FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria_dml();

DROP TRIGGER IF EXISTS tr_audit_compra ON "Compra";
CREATE TRIGGER tr_audit_compra 
AFTER INSERT OR UPDATE OR DELETE ON "Compra" 
FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria_dml();

DROP TRIGGER IF EXISTS tr_audit_detalle_compra ON "DetalleCompra";
CREATE TRIGGER tr_audit_detalle_compra 
AFTER INSERT OR UPDATE OR DELETE ON "DetalleCompra" 
FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria_dml();

DROP TRIGGER IF EXISTS tr_audit_cliente ON "Cliente";
CREATE TRIGGER tr_audit_cliente 
AFTER INSERT OR UPDATE OR DELETE ON "Cliente" 
FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria_dml();

DROP TRIGGER IF EXISTS tr_audit_proveedor ON "Proveedor";
CREATE TRIGGER tr_audit_proveedor 
AFTER INSERT OR UPDATE OR DELETE ON "Proveedor" 
FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria_dml();

DROP TRIGGER IF EXISTS tr_audit_usuario ON "Usuario";
CREATE TRIGGER tr_audit_usuario 
AFTER INSERT OR UPDATE OR DELETE ON "Usuario" 
FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria_dml();


-- ─────────────────────────────────────────────────────────────────────────
-- 2. FUNCIONES SQL PROFESIONALES (REPORTES Y CONSULTAS)
-- ─────────────────────────────────────────────────────────────────────────

-- Calcular Stock Actual Consolidado por Lotes
CREATE OR REPLACE FUNCTION calcular_stock_actual(p_id_producto INT)
RETURNS INT AS $$
DECLARE
    v_stock INT;
BEGIN
    SELECT COALESCE(SUM("stockActual"), 0) INTO v_stock
    FROM "Lote"
    WHERE "idProducto" = p_id_producto AND activo = true;
    RETURN v_stock;
END;
$$ LANGUAGE plpgsql;

-- Calcular Stock Disponible (Consolidado por Lotes Activos y No Vencidos)
CREATE OR REPLACE FUNCTION calcular_stock_disponible(p_id_producto INT)
RETURNS INT AS $$
DECLARE
    v_stock INT;
BEGIN
    SELECT COALESCE(SUM("stockActual"), 0) INTO v_stock
    FROM "Lote"
    WHERE "idProducto" = p_id_producto 
      AND activo = true 
      AND (fechaVencimiento IS NULL OR fechaVencimiento > NOW());
    RETURN v_stock;
END;
$$ LANGUAGE plpgsql;

-- Obtener Productos Bajo Stock Minimo
CREATE OR REPLACE FUNCTION obtener_productos_bajo_stock()
RETURNS TABLE (
    id INT,
    nombre TEXT,
    stock_actual INT,
    stock_minimo INT,
    diferencia INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.nombre, p."stockActual", COALESCE(p."stockMinimo", 0), (COALESCE(p."stockMinimo", 0) - p."stockActual")
    FROM "Producto" p
    WHERE p.activo = true 
      AND p."stockActual" <= COALESCE(p."stockMinimo", 10)
    ORDER BY (COALESCE(p."stockMinimo", 0) - p."stockActual") DESC;
END;
$$ LANGUAGE plpgsql;

-- Calcular total de ventas diarias facturadas
CREATE OR REPLACE FUNCTION calcular_total_ventas_dia(p_fecha DATE)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_total DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(total), 0.00) INTO v_total
    FROM "Venta"
    WHERE fecha::date = p_fecha AND estado = 'COMPLETADA';
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Calcular total de ventas mensuales facturadas
CREATE OR REPLACE FUNCTION calcular_total_ventas_mes(p_mes INT, p_anio INT)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_total DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(total), 0.00) INTO v_total
    FROM "Venta"
    WHERE EXTRACT(MONTH FROM fecha) = p_mes 
      AND EXTRACT(YEAR FROM fecha) = p_anio 
      AND estado = 'COMPLETADA';
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Calcular total de compras mensuales registradas
CREATE OR REPLACE FUNCTION calcular_total_compras_mes(p_mes INT, p_anio INT)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_total DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(total), 0.00) INTO v_total
    FROM "Compra"
    WHERE EXTRACT(MONTH FROM fecha) = p_mes 
      AND EXTRACT(YEAR FROM fecha) = p_anio;
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Obtener historial de facturación de un cliente específico
CREATE OR REPLACE FUNCTION obtener_historial_cliente(p_id_cliente INT)
RETURNS TABLE (
    id_venta INT,
    fecha TIMESTAMP,
    total DECIMAL(10,2),
    metodo_pago TEXT,
    estado TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT v.id, v.fecha, v.total, v."metodoPago", v.estado
    FROM "Venta" v
    WHERE v."idCliente" = p_id_cliente
    ORDER BY v.fecha DESC;
END;
$$ LANGUAGE plpgsql;

-- Generar resumen KPI general en JSON
CREATE OR REPLACE FUNCTION generar_resumen_general()
RETURNS JSON AS $$
DECLARE
    v_ventas_hoy DECIMAL(10,2);
    v_compras_mes DECIMAL(10,2);
    v_productos_bajo_stock INT;
    v_resumen JSON;
BEGIN
    v_ventas_hoy := calcular_total_ventas_dia(CURRENT_DATE);
    v_compras_mes := calcular_total_compras_mes(EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT);
    
    SELECT COUNT(*)::INT INTO v_productos_bajo_stock 
    FROM obtener_productos_bajo_stock();

    v_resumen := json_build_object(
        'ventas_hoy', v_ventas_hoy,
        'compras_mes', v_compras_mes,
        'productos_bajo_stock', v_productos_bajo_stock,
        'fecha_reporte', NOW()
    );
    RETURN v_resumen;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────────────────
-- 3. PROCEDIMIENTOS ALMACENADOS (Stored Procedures Administrativos)
-- ─────────────────────────────────────────────────────────────────────────

-- NOTA: sp_registrar_venta y sp_registrar_compra se omiten para mantener 
-- la lógica atómica FIFO por lotes del backend (Next.js/Prisma) como única fuente de verdad.

-- Ajuste de stock físico e inserción en Kardex
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

    -- Registrar el ajuste en el Kardex
    INSERT INTO "MovimientoInventario" ("idProducto", "tipo", "cantidad", "stockResultante", "referencia")
    VALUES (
        p_id_producto, 
        CASE WHEN p_nuevo_stock > v_stock_anterior THEN 'AJUSTE_POSITIVO' ELSE 'AJUSTE_NEGATIVO' END, 
        ABS(p_nuevo_stock - v_stock_anterior), 
        p_nuevo_stock, 
        p_motivo
    );

    RAISE NOTICE 'Stock de % actualizado: % -> % (% )', v_nombre, v_stock_anterior, p_nuevo_stock, p_motivo;
END;
$$;

-- Registro de apertura de caja
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
    RAISE NOTICE 'Apertura de caja registrada. Usuario: %, Monto: %', p_id_usuario, p_monto_inicial;
END;
$$;

-- Cierre de caja consolidado
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
    
    RAISE NOTICE 'Cierre de caja registrado. Total: %, Diferencia: %', v_total_ventas, v_diferencia;
END;
$$;

-- Procedimiento para inserción manual en logs de auditoría
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


-- ─────────────────────────────────────────────────────────────────────────
-- 4. VISTAS SQL PROFESIONALES Y REPORTES
-- ─────────────────────────────────────────────────────────────────────────

-- 4.1 Vista de Inventario General
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

-- 4.2 Vista de Ventas Diarias
CREATE OR REPLACE VIEW vw_ventas_diarias AS
SELECT 
    fecha::date AS fecha_venta,
    COUNT(id) AS cantidad_ventas,
    SUM(total) AS total_recaudado,
    AVG(total) AS ticket_promedio
FROM "Venta"
WHERE estado = 'COMPLETADA'
GROUP BY fecha::date;

-- 4.3 Vista de Ventas Mensuales
CREATE OR REPLACE VIEW vw_ventas_mensuales AS
SELECT 
    EXTRACT(YEAR FROM fecha)::INT AS anio,
    EXTRACT(MONTH FROM fecha)::INT AS mes,
    COUNT(id) AS cantidad_ventas,
    SUM(total) AS total_recaudado
FROM "Venta"
WHERE estado = 'COMPLETADA'
GROUP BY EXTRACT(YEAR FROM fecha), EXTRACT(MONTH FROM fecha);

-- 4.4 Vista de Compras Mensuales
CREATE OR REPLACE VIEW vw_compras_mensuales AS
SELECT 
    EXTRACT(YEAR FROM fecha)::INT AS anio,
    EXTRACT(MONTH FROM fecha)::INT AS mes,
    COUNT(id) AS cantidad_compras,
    SUM(total) AS total_invertido
FROM "Compra"
GROUP BY EXTRACT(YEAR FROM fecha), EXTRACT(MONTH FROM fecha);

-- 4.5 Vista de Clientes Frecuentes
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

-- 4.6 Vista de Productos Más Vendidos
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

-- 4.7 Vista General de Auditoría
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

-- 4.8 Vista de Reporte Kardex de Inventario (User Addition 7)
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

-- 4.9 Vista de Reporte de Vencimientos por Lotes (User Addition 8)
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

-- 4.10 Vista de Reporte de Clasificación ABC de Productos (User Addition 9)
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
