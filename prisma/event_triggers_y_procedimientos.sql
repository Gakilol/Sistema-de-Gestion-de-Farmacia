-- ============================================================
-- EVENT TRIGGERS Y PROCEDIMIENTOS ALMACENADOS
-- Sistema de Gestión de Farmacia
-- Copiar y pegar en pgAdmin4 > Query Tool
-- ============================================================


-- ************************************************************
-- PARTE 1: TABLAS AUXILIARES PARA EVENT TRIGGERS
-- ************************************************************

-- Tabla para registrar cambios DDL (CREATE, ALTER, DROP)
CREATE TABLE IF NOT EXISTS "AuditoriaDDL" (
    id              SERIAL PRIMARY KEY,
    evento          TEXT NOT NULL,          -- 'CREATE TABLE', 'DROP FUNCTION', etc.
    nombre_objeto   TEXT,                   -- nombre del objeto afectado
    tipo_objeto     TEXT,                   -- 'TABLE', 'FUNCTION', etc.
    esquema         TEXT DEFAULT 'public',
    usuario         TEXT NOT NULL,          -- quién ejecutó el cambio
    ip_cliente      TEXT,
    consulta_sql    TEXT,                   -- el SQL ejecutado
    fecha           TIMESTAMP DEFAULT NOW()
);

-- Tabla log para operaciones de procedimientos
CREATE TABLE IF NOT EXISTS "LogProcedimientos" (
    id              SERIAL PRIMARY KEY,
    procedimiento   TEXT NOT NULL,
    descripcion     TEXT,
    datos           JSONB,                  -- detalles en JSON
    usuario         TEXT DEFAULT current_user,
    fecha           TIMESTAMP DEFAULT NOW()
);


-- ************************************************************
-- PARTE 2: EVENT TRIGGERS (auditoría de cambios DDL)
-- ************************************************************

-- ============================================================
-- EVENT TRIGGER 1: AUDITORÍA DE CREACIÓN DE OBJETOS
-- Registra cuando alguien crea tablas, funciones, vistas, etc.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_evt_audit_create()
RETURNS event_trigger AS $$
DECLARE
    obj RECORD;
BEGIN
    FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
    LOOP
        INSERT INTO "AuditoriaDDL" (evento, nombre_objeto, tipo_objeto, esquema, usuario, consulta_sql)
        VALUES (
            'CREATE',
            obj.object_identity,
            obj.object_type,
            obj.schema_name,
            current_user,
            current_query()
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE EVENT TRIGGER evt_audit_create
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE', 'CREATE FUNCTION', 'CREATE VIEW', 'CREATE INDEX', 'CREATE TRIGGER')
EXECUTE FUNCTION fn_evt_audit_create();


-- ============================================================
-- EVENT TRIGGER 2: AUDITORÍA DE MODIFICACIÓN DE OBJETOS
-- Registra cuando alguien modifica tablas, funciones, etc.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_evt_audit_alter()
RETURNS event_trigger AS $$
DECLARE
    obj RECORD;
BEGIN
    FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
    LOOP
        INSERT INTO "AuditoriaDDL" (evento, nombre_objeto, tipo_objeto, esquema, usuario, consulta_sql)
        VALUES (
            'ALTER',
            obj.object_identity,
            obj.object_type,
            obj.schema_name,
            current_user,
            current_query()
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE EVENT TRIGGER evt_audit_alter
ON ddl_command_end
WHEN TAG IN ('ALTER TABLE', 'ALTER FUNCTION', 'ALTER VIEW', 'ALTER INDEX')
EXECUTE FUNCTION fn_evt_audit_alter();


-- ============================================================
-- EVENT TRIGGER 3: PROTECCIÓN CONTRA DROP DE TABLAS CRÍTICAS
-- Previene la eliminación accidental de tablas del sistema
-- ============================================================
CREATE OR REPLACE FUNCTION fn_evt_proteger_drop()
RETURNS event_trigger AS $$
DECLARE
    obj RECORD;
    tablas_protegidas TEXT[] := ARRAY[
        'Producto', 'Venta', 'DetalleVenta', 'Cliente',
        'Usuario', 'Rol', 'Compra', 'DetalleCompra',
        'Proveedor', 'CategoriaProducto', 'AuditoriaLog'
    ];
BEGIN
    FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
    LOOP
        -- Registrar el intento de DROP
        INSERT INTO "AuditoriaDDL" (evento, nombre_objeto, tipo_objeto, esquema, usuario, consulta_sql)
        VALUES ('DROP (BLOQUEADO)', obj.object_identity, obj.object_type, obj.schema_name, current_user, current_query());

        -- Bloquear si es una tabla protegida
        IF obj.object_type = 'table' THEN
            DECLARE
                nombre_tabla TEXT;
            BEGIN
                nombre_tabla := split_part(obj.object_identity, '.', 2);
                IF nombre_tabla = ANY(tablas_protegidas) THEN
                    RAISE EXCEPTION '⛔ BLOQUEADO: No se puede eliminar la tabla "%" - es una tabla crítica del sistema.', nombre_tabla;
                END IF;
            END;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE EVENT TRIGGER evt_proteger_drop
ON sql_drop
EXECUTE FUNCTION fn_evt_proteger_drop();


-- ************************************************************
-- PARTE 3: PROCEDIMIENTOS ALMACENADOS
-- ************************************************************

-- ============================================================
-- PROCEDIMIENTO 1: REGISTRAR VENTA COMPLETA
-- Registra una venta con todos sus detalles en una transacción
-- Deduce el stock automáticamente
-- USO: CALL sp_registrar_venta(1, 1, 'EFECTIVO', '[{"idProducto":1,"cantidad":2,"precioUnitario":50.00}]');
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_registrar_venta(
    p_id_cliente    INT,        -- NULL si es venta sin cliente
    p_id_usuario    INT,
    p_metodo_pago   TEXT,
    p_detalles      JSONB       -- Array JSON: [{"idProducto":1, "cantidad":2, "precioUnitario":50.00}]
)
LANGUAGE plpgsql AS $$
DECLARE
    v_id_venta  INT;
    v_total     DECIMAL(10,2) := 0;
    v_detalle   JSONB;
    v_id_prod   INT;
    v_cantidad  INT;
    v_precio    DECIMAL(10,2);
    v_subtotal  DECIMAL(10,2);
    v_stock     INT;
    v_nombre    TEXT;
BEGIN
    -- Calcular total y validar stock
    FOR v_detalle IN SELECT * FROM jsonb_array_elements(p_detalles)
    LOOP
        v_id_prod  := (v_detalle->>'idProducto')::INT;
        v_cantidad := (v_detalle->>'cantidad')::INT;
        v_precio   := (v_detalle->>'precioUnitario')::DECIMAL;

        SELECT "stockActual", nombre INTO v_stock, v_nombre
        FROM "Producto" WHERE id = v_id_prod;

        IF v_stock IS NULL THEN
            RAISE EXCEPTION 'Producto ID % no existe', v_id_prod;
        END IF;
        IF v_stock < v_cantidad THEN
            RAISE EXCEPTION 'Stock insuficiente para "%": tiene % unidades, se piden %', v_nombre, v_stock, v_cantidad;
        END IF;

        v_total := v_total + (v_precio * v_cantidad);
    END LOOP;

    -- Crear la venta
    INSERT INTO "Venta" (fecha, "idCliente", total, "metodoPago", "idUsuario", "createdAt", "updatedAt")
    VALUES (NOW(), p_id_cliente, v_total, p_metodo_pago, p_id_usuario, NOW(), NOW())
    RETURNING id INTO v_id_venta;

    -- Insertar detalles y descontar stock
    FOR v_detalle IN SELECT * FROM jsonb_array_elements(p_detalles)
    LOOP
        v_id_prod  := (v_detalle->>'idProducto')::INT;
        v_cantidad := (v_detalle->>'cantidad')::INT;
        v_precio   := (v_detalle->>'precioUnitario')::DECIMAL;
        v_subtotal := v_precio * v_cantidad;

        INSERT INTO "DetalleVenta" ("idVenta", "idProducto", cantidad, "precioUnitario", subtotal, "tipoUnidad", "createdAt", "updatedAt")
        VALUES (v_id_venta, v_id_prod, v_cantidad, v_precio, v_subtotal, 'UNIDAD', NOW(), NOW());

        UPDATE "Producto" SET "stockActual" = "stockActual" - v_cantidad, "updatedAt" = NOW()
        WHERE id = v_id_prod;
    END LOOP;

    -- Log
    INSERT INTO "LogProcedimientos" (procedimiento, descripcion, datos)
    VALUES ('sp_registrar_venta', 'Venta registrada exitosamente',
        jsonb_build_object('idVenta', v_id_venta, 'total', v_total, 'items', jsonb_array_length(p_detalles)));

    RAISE NOTICE '✅ Venta #% registrada. Total: C$%', v_id_venta, v_total;
END;
$$;


-- ============================================================
-- PROCEDIMIENTO 2: REPORTE DE VENTAS POR PERIODO
-- Genera un resumen de ventas para un rango de fechas
-- USO: CALL sp_reporte_ventas('2026-05-01', '2026-05-31');
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_reporte_ventas(
    p_fecha_inicio  DATE,
    p_fecha_fin     DATE
)
LANGUAGE plpgsql AS $$
DECLARE
    v_total_ventas      INT;
    v_ingreso_total     DECIMAL(12,2);
    v_ticket_promedio   DECIMAL(10,2);
    v_producto_top      TEXT;
    v_cliente_top       TEXT;
BEGIN
    -- Total de ventas y monto
    SELECT COUNT(*), COALESCE(SUM(total), 0)
    INTO v_total_ventas, v_ingreso_total
    FROM "Venta"
    WHERE fecha >= p_fecha_inicio AND fecha < p_fecha_fin + INTERVAL '1 day';

    v_ticket_promedio := CASE WHEN v_total_ventas > 0 THEN v_ingreso_total / v_total_ventas ELSE 0 END;

    -- Producto más vendido
    SELECT p.nombre INTO v_producto_top
    FROM "DetalleVenta" dv
    JOIN "Venta" v ON v.id = dv."idVenta"
    JOIN "Producto" p ON p.id = dv."idProducto"
    WHERE v.fecha >= p_fecha_inicio AND v.fecha < p_fecha_fin + INTERVAL '1 day'
    GROUP BY p.nombre
    ORDER BY SUM(dv.cantidad) DESC
    LIMIT 1;

    -- Cliente que más compró
    SELECT c."nombreCompleto" INTO v_cliente_top
    FROM "Venta" v
    JOIN "Cliente" c ON c.id = v."idCliente"
    WHERE v.fecha >= p_fecha_inicio AND v.fecha < p_fecha_fin + INTERVAL '1 day'
    GROUP BY c."nombreCompleto"
    ORDER BY SUM(v.total) DESC
    LIMIT 1;

    -- Mostrar reporte
    RAISE NOTICE '══════════════════════════════════════';
    RAISE NOTICE '  REPORTE DE VENTAS';
    RAISE NOTICE '  Periodo: % al %', p_fecha_inicio, p_fecha_fin;
    RAISE NOTICE '══════════════════════════════════════';
    RAISE NOTICE '  Total ventas:      %', v_total_ventas;
    RAISE NOTICE '  Ingreso total:     C$%', v_ingreso_total;
    RAISE NOTICE '  Ticket promedio:   C$%', v_ticket_promedio;
    RAISE NOTICE '  Producto top:      %', COALESCE(v_producto_top, 'N/A');
    RAISE NOTICE '  Cliente top:       %', COALESCE(v_cliente_top, 'N/A');
    RAISE NOTICE '══════════════════════════════════════';

    -- Guardar en log
    INSERT INTO "LogProcedimientos" (procedimiento, descripcion, datos)
    VALUES ('sp_reporte_ventas', 'Reporte generado',
        jsonb_build_object('inicio', p_fecha_inicio, 'fin', p_fecha_fin,
            'totalVentas', v_total_ventas, 'ingresoTotal', v_ingreso_total,
            'ticketPromedio', v_ticket_promedio));
END;
$$;


-- ============================================================
-- PROCEDIMIENTO 3: AJUSTE DE INVENTARIO
-- Ajusta el stock de un producto con motivo registrado
-- USO: CALL sp_ajuste_inventario(1, 50, 'Recepción de mercancía');
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_ajuste_inventario(
    p_id_producto   INT,
    p_nuevo_stock   INT,
    p_motivo        TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_stock_anterior INT;
    v_nombre         TEXT;
    v_diferencia     INT;
BEGIN
    SELECT "stockActual", nombre INTO v_stock_anterior, v_nombre
    FROM "Producto" WHERE id = p_id_producto;

    IF v_nombre IS NULL THEN
        RAISE EXCEPTION 'Producto ID % no encontrado', p_id_producto;
    END IF;

    v_diferencia := p_nuevo_stock - v_stock_anterior;

    UPDATE "Producto"
    SET "stockActual" = p_nuevo_stock, "updatedAt" = NOW()
    WHERE id = p_id_producto;

    INSERT INTO "LogProcedimientos" (procedimiento, descripcion, datos)
    VALUES ('sp_ajuste_inventario', p_motivo,
        jsonb_build_object('producto', v_nombre, 'stockAnterior', v_stock_anterior,
            'stockNuevo', p_nuevo_stock, 'diferencia', v_diferencia));

    RAISE NOTICE '✅ Stock de "%" ajustado: % → % (diferencia: %)', v_nombre, v_stock_anterior, p_nuevo_stock, v_diferencia;
END;
$$;


-- ============================================================
-- PROCEDIMIENTO 4: CIERRE DE CAJA DIARIO
-- Resume las ventas del día por método de pago
-- USO: CALL sp_cierre_caja('2026-05-05');
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_cierre_caja(
    p_fecha DATE DEFAULT CURRENT_DATE
)
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
    FROM "Venta"
    WHERE fecha::date = p_fecha;

    RAISE NOTICE '══════════════════════════════════════';
    RAISE NOTICE '  CIERRE DE CAJA - %', p_fecha;
    RAISE NOTICE '══════════════════════════════════════';
    RAISE NOTICE '  Ventas realizadas:  %', v_num_ventas;
    RAISE NOTICE '  Efectivo:           C$%', v_efectivo;
    RAISE NOTICE '  Tarjeta:            C$%', v_tarjeta;
    RAISE NOTICE '  Transferencia:      C$%', v_transferencia;
    RAISE NOTICE '  ─────────────────────────────';
    RAISE NOTICE '  TOTAL DEL DÍA:      C$%', v_total;
    RAISE NOTICE '══════════════════════════════════════';

    INSERT INTO "LogProcedimientos" (procedimiento, descripcion, datos)
    VALUES ('sp_cierre_caja', 'Cierre de caja del día ' || p_fecha,
        jsonb_build_object('fecha', p_fecha, 'numVentas', v_num_ventas,
            'efectivo', v_efectivo, 'tarjeta', v_tarjeta,
            'transferencia', v_transferencia, 'total', v_total));
END;
$$;


-- ============================================================
-- PROCEDIMIENTO 5: DESACTIVAR PRODUCTOS SIN MOVIMIENTO
-- Desactiva productos que no se han vendido en X días
-- USO: CALL sp_desactivar_sin_movimiento(90);
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_desactivar_sin_movimiento(
    p_dias INT DEFAULT 90
)
LANGUAGE plpgsql AS $$
DECLARE
    v_count INT := 0;
    v_producto RECORD;
BEGIN
    FOR v_producto IN
        SELECT p.id, p.nombre
        FROM "Producto" p
        WHERE p.activo = TRUE
        AND p.id NOT IN (
            SELECT DISTINCT dv."idProducto"
            FROM "DetalleVenta" dv
            JOIN "Venta" v ON v.id = dv."idVenta"
            WHERE v.fecha >= NOW() - (p_dias || ' days')::INTERVAL
        )
    LOOP
        UPDATE "Producto" SET activo = FALSE, "updatedAt" = NOW() WHERE id = v_producto.id;
        v_count := v_count + 1;
        RAISE NOTICE '  ⚠️ Desactivado: %', v_producto.nombre;
    END LOOP;

    INSERT INTO "LogProcedimientos" (procedimiento, descripcion, datos)
    VALUES ('sp_desactivar_sin_movimiento', v_count || ' productos desactivados por inactividad',
        jsonb_build_object('diasSinVenta', p_dias, 'productosDesactivados', v_count));

    RAISE NOTICE '✅ % productos desactivados (sin ventas en % días)', v_count, p_dias;
END;
$$;


-- ************************************************************
-- PARTE 4: CÓMO USAR TODO ESTO EN pgAdmin
-- ************************************************************

-- 📋 VER EVENT TRIGGERS CREADOS:
-- SELECT evtname, evtevent, evtfoid::regproc FROM pg_event_trigger;

-- 📋 VER LOG DE CAMBIOS DDL:
-- SELECT * FROM "AuditoriaDDL" ORDER BY fecha DESC;

-- 📋 VER LOG DE PROCEDIMIENTOS:
-- SELECT * FROM "LogProcedimientos" ORDER BY fecha DESC;

-- 📋 EJECUTAR PROCEDIMIENTOS:
-- CALL sp_registrar_venta(1, 1, 'EFECTIVO', '[{"idProducto":1,"cantidad":2,"precioUnitario":50.00}]');
-- CALL sp_reporte_ventas('2026-05-01', '2026-05-31');
-- CALL sp_ajuste_inventario(1, 100, 'Recepción de mercancía');
-- CALL sp_cierre_caja();  -- usa la fecha de hoy
-- CALL sp_cierre_caja('2026-05-04');  -- fecha específica
-- CALL sp_desactivar_sin_movimiento(90);  -- 90 días sin venta
