-- =========================================================================
-- FIX: Error al registrar proveedor en producción (NeonDB)
-- 
-- PROBLEMA: El trigger tr_audit_proveedor falla porque la tabla "Auditoria"
-- no existe en NeonDB, lo que causa un error 500 al crear/editar proveedores.
--
-- SOLUCIÓN: Ejecutar este script en NeonDB (pgAdmin4 > Query Tool o
-- en el SQL Editor de NeonDB Dashboard).
--
-- PASOS:
--   1. Ir a tu proyecto en NeonDB
--   2. Abrir el SQL Editor
--   3. Pegar y ejecutar todo este script
-- =========================================================================


-- ─────────────────────────────────────────────────────────────────────────
-- PASO 1: Crear la tabla "Auditoria" si no existe
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Auditoria" (
    "id"               SERIAL PRIMARY KEY,
    "usuario"          VARCHAR(255) NOT NULL,
    "fecha"            DATE         NOT NULL DEFAULT CURRENT_DATE,
    "hora"             TIME         NOT NULL DEFAULT CURRENT_TIME,
    "accion"           VARCHAR(50)  NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE'
    "modulo"           VARCHAR(100) NOT NULL,  -- Tabla afectada
    "ip"               VARCHAR(50),
    "datos_anteriores" JSONB,
    "datos_nuevos"     JSONB
);


-- ─────────────────────────────────────────────────────────────────────────
-- PASO 2: Actualizar la función de auditoría para que sea tolerante a fallos
-- Esto evita que un error en el log de auditoría bloquee la operación principal
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_registrar_auditoria_dml()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario    TEXT;
    v_ip         TEXT;
    v_datos_ant  JSONB := NULL;
    v_datos_nue  JSONB := NULL;
BEGIN
    -- Capturar usuario e IP de la sesión, con fallbacks seguros
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

    -- Insertar en auditoría de forma tolerante a fallos
    BEGIN
        INSERT INTO "Auditoria" ("usuario", "accion", "modulo", "ip", "datos_anteriores", "datos_nuevos")
        VALUES (v_usuario, TG_OP, TG_TABLE_NAME, v_ip, v_datos_ant, v_datos_nue);
    EXCEPTION WHEN OTHERS THEN
        -- Si falla la auditoría, NO interrumpir la operación principal
        -- Solo registrar en el log del servidor PostgreSQL
        RAISE WARNING '[Auditoria] Error al registrar operación % en %: %', TG_OP, TG_TABLE_NAME, SQLERRM;
    END;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────────────────
-- PASO 3: Re-crear todos los triggers DML (idempotente - DROP IF EXISTS primero)
-- ─────────────────────────────────────────────────────────────────────────
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
-- VERIFICACIÓN: Confirmar que los triggers quedaron instalados
-- ─────────────────────────────────────────────────────────────────────────
SELECT tgname AS trigger_name, tgrelid::regclass::text AS tabla, tgenabled
FROM pg_trigger
WHERE tgname LIKE 'tr_audit_%'
ORDER BY tgrelid::regclass::text;
