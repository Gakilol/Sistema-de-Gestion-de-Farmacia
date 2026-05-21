-- ============================================================
--  PROCEDIMIENTOS ALMACENADOS – SISTEMA DE GESTIÓN DE FARMACIA
--  Ejecutar en PostgreSQL (psql o pgAdmin)
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1️⃣  sp_reporte_ventas_por_fecha
--     Devuelve todas las ventas con su detalle dentro de un
--     rango de fechas.  Útil para reportes diarios / mensuales.
-- ─────────────────────────────────────────────────────────────
CREATE PROCEDURE sp_reporte_ventas_por_fecha(
    p_fecha_inicio DATE,
    p_fecha_fin    DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
    v_total_general NUMERIC(10,2) := 0;
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════';
    RAISE NOTICE '  REPORTE DE VENTAS: % → %', p_fecha_inicio, p_fecha_fin;
    RAISE NOTICE '══════════════════════════════════════════════';

    FOR r IN
        SELECT
            v.id            AS venta_id,
            v.fecha,
            v."metodoPago"  AS metodo_pago,
            v.total,
            c."nombreCompleto" AS cliente,
            u."nombreCompleto" AS vendedor
        FROM "Venta" v
        LEFT JOIN "Cliente" c ON c.id = v."idCliente"
        JOIN "Usuario" u      ON u.id = v."idUsuario"
        WHERE v.fecha::date BETWEEN p_fecha_inicio AND p_fecha_fin
        ORDER BY v.fecha
    LOOP
        RAISE NOTICE 'Venta #% | % | Cliente: % | Vendedor: % | Método: % | Total: L %',
            r.venta_id, r.fecha::date, COALESCE(r.cliente, 'Público'), r.vendedor,
            r.metodo_pago, r.total;
        v_total_general := v_total_general + r.total;
    END LOOP;

    RAISE NOTICE '----------------------------------------------';
    RAISE NOTICE '  TOTAL GENERAL: L %', v_total_general;
    RAISE NOTICE '══════════════════════════════════════════════';
END;
$$;

-- Ejemplo de uso:
-- CALL sp_reporte_ventas_por_fecha('2026-05-01', '2026-05-05');


-- ─────────────────────────────────────────────────────────────
-- 2️⃣  sp_productos_stock_bajo
--     Lista todos los productos cuyo stock actual está por
--     debajo de su stock mínimo configurado.
--     Ideal para generar órdenes de compra a proveedores.
-- ─────────────────────────────────────────────────────────────
CREATE PROCEDURE sp_productos_stock_bajo()
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
    v_contador INT := 0;
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════';
    RAISE NOTICE '  ALERTA: PRODUCTOS CON STOCK BAJO';
    RAISE NOTICE '══════════════════════════════════════════════';

    FOR r IN
        SELECT
            p.id,
            p.nombre,
            cp.nombre       AS categoria,
            p."stockActual"  AS stock_actual,
            p."stockMinimo"  AS stock_minimo,
            (p."stockMinimo" - p."stockActual") AS unidades_faltantes
        FROM "Producto" p
        JOIN "CategoriaProducto" cp ON cp.id = p."idCategoria"
        WHERE p.activo = true
          AND p."stockMinimo" IS NOT NULL
          AND p."stockActual" < p."stockMinimo"
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

-- Ejemplo de uso:
-- CALL sp_productos_stock_bajo();


-- ─────────────────────────────────────────────────────────────
-- 3️⃣  sp_resumen_ventas_por_metodo_pago
--     Muestra un resumen de ventas agrupadas por método de
--     pago (EFECTIVO, TARJETA, TRANSFERENCIA) en un período.
--     Útil para el cierre de caja.
-- ─────────────────────────────────────────────────────────────
CREATE PROCEDURE sp_resumen_ventas_por_metodo_pago(
    p_fecha_inicio DATE,
    p_fecha_fin    DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
    v_total_general NUMERIC(10,2) := 0;
BEGIN
    RAISE NOTICE '══════════════════════════════════════════════';
    RAISE NOTICE '  RESUMEN POR MÉTODO DE PAGO: % → %', p_fecha_inicio, p_fecha_fin;
    RAISE NOTICE '══════════════════════════════════════════════';

    FOR r IN
        SELECT
            v."metodoPago"     AS metodo,
            COUNT(*)           AS cantidad_ventas,
            SUM(v.total)       AS total_metodo
        FROM "Venta" v
        WHERE v.fecha::date BETWEEN p_fecha_inicio AND p_fecha_fin
        GROUP BY v."metodoPago"
        ORDER BY total_metodo DESC
    LOOP
        RAISE NOTICE '💰 % → % ventas | Total: L %',
            r.metodo, r.cantidad_ventas, r.total_metodo;
        v_total_general := v_total_general + r.total_metodo;
    END LOOP;

    IF v_total_general = 0 THEN
        RAISE NOTICE '  (Sin ventas en este período)';
    ELSE
        RAISE NOTICE '----------------------------------------------';
        RAISE NOTICE '  TOTAL TODAS LAS FORMAS DE PAGO: L %', v_total_general;
    END IF;

    RAISE NOTICE '══════════════════════════════════════════════';
END;
$$;

-- Ejemplo de uso:
-- CALL sp_resumen_ventas_por_metodo_pago('2026-05-01', '2026-05-05');
