--
-- PostgreSQL database dump
--

\restrict inA0nAJ2BALCS8hkxfr16omuudh0oj92ae5RUbZYrdDnQBcoRYIEa8pJMZdP2FL

-- Dumped from database version 17.10 (21f7c76)
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE ONLY public."Venta" DROP CONSTRAINT "Venta_idUsuario_fkey";
ALTER TABLE ONLY public."Venta" DROP CONSTRAINT "Venta_idDescuento_fkey";
ALTER TABLE ONLY public."Venta" DROP CONSTRAINT "Venta_idCliente_fkey";
ALTER TABLE ONLY public."Usuario" DROP CONSTRAINT "Usuario_idRol_fkey";
ALTER TABLE ONLY public."Receta" DROP CONSTRAINT "Receta_idUsuario_fkey";
ALTER TABLE ONLY public."Receta" DROP CONSTRAINT "Receta_idCliente_fkey";
ALTER TABLE ONLY public."Receta" DROP CONSTRAINT "Receta_idAtencion_fkey";
ALTER TABLE ONLY public."ProveedorProducto" DROP CONSTRAINT "ProveedorProducto_idProveedor_fkey";
ALTER TABLE ONLY public."ProveedorProducto" DROP CONSTRAINT "ProveedorProducto_idProducto_fkey";
ALTER TABLE ONLY public."Producto" DROP CONSTRAINT "Producto_idLaboratorio_fkey";
ALTER TABLE ONLY public."Producto" DROP CONSTRAINT "Producto_idCategoria_fkey";
ALTER TABLE ONLY public."MovimientoInventario" DROP CONSTRAINT "MovimientoInventario_idUsuario_fkey";
ALTER TABLE ONLY public."MovimientoInventario" DROP CONSTRAINT "MovimientoInventario_idProducto_fkey";
ALTER TABLE ONLY public."MovimientoInventario" DROP CONSTRAINT "MovimientoInventario_idLote_fkey";
ALTER TABLE ONLY public."Lote" DROP CONSTRAINT "Lote_idProducto_fkey";
ALTER TABLE ONLY public."Lote" DROP CONSTRAINT "Lote_idDetalleCompra_fkey";
ALTER TABLE ONLY public."DevolucionProveedor" DROP CONSTRAINT "DevolucionProveedor_idUsuario_fkey";
ALTER TABLE ONLY public."DevolucionProveedor" DROP CONSTRAINT "DevolucionProveedor_idProveedor_fkey";
ALTER TABLE ONLY public."DevolucionProveedor" DROP CONSTRAINT "DevolucionProveedor_idProducto_fkey";
ALTER TABLE ONLY public."DevolucionProveedor" DROP CONSTRAINT "DevolucionProveedor_idMovimientoInventario_fkey";
ALTER TABLE ONLY public."DevolucionProveedor" DROP CONSTRAINT "DevolucionProveedor_idLote_fkey";
ALTER TABLE ONLY public."DetalleVenta" DROP CONSTRAINT "DetalleVenta_idVenta_fkey";
ALTER TABLE ONLY public."DetalleVenta" DROP CONSTRAINT "DetalleVenta_idProducto_fkey";
ALTER TABLE ONLY public."DetalleVentaLote" DROP CONSTRAINT "DetalleVentaLote_idLote_fkey";
ALTER TABLE ONLY public."DetalleVentaLote" DROP CONSTRAINT "DetalleVentaLote_idDetalleVenta_fkey";
ALTER TABLE ONLY public."DetalleReceta" DROP CONSTRAINT "DetalleReceta_idReceta_fkey";
ALTER TABLE ONLY public."DetalleReceta" DROP CONSTRAINT "DetalleReceta_idProducto_fkey";
ALTER TABLE ONLY public."DetalleCompra" DROP CONSTRAINT "DetalleCompra_idProducto_fkey";
ALTER TABLE ONLY public."DetalleCompra" DROP CONSTRAINT "DetalleCompra_idCompra_fkey";
ALTER TABLE ONLY public."Descuento" DROP CONSTRAINT "Descuento_idUsuario_fkey";
ALTER TABLE ONLY public."DatosClinicosPaciente" DROP CONSTRAINT "DatosClinicosPaciente_idCliente_fkey";
ALTER TABLE ONLY public."Compra" DROP CONSTRAINT "Compra_idUsuario_fkey";
ALTER TABLE ONLY public."Compra" DROP CONSTRAINT "Compra_idProveedor_fkey";
ALTER TABLE ONLY public."Cita" DROP CONSTRAINT "Cita_idCliente_fkey";
ALTER TABLE ONLY public."AuditoriaLog" DROP CONSTRAINT "AuditoriaLog_idUsuario_fkey";
ALTER TABLE ONLY public."AtencionPodologica" DROP CONSTRAINT "AtencionPodologica_idUsuario_fkey";
ALTER TABLE ONLY public."AtencionPodologica" DROP CONSTRAINT "AtencionPodologica_idServicio_fkey";
ALTER TABLE ONLY public."AtencionPodologica" DROP CONSTRAINT "AtencionPodologica_idCliente_fkey";
ALTER TABLE ONLY public."AtencionPodologica" DROP CONSTRAINT "AtencionPodologica_idCita_fkey";
ALTER TABLE ONLY neon_auth.session DROP CONSTRAINT "session_userId_fkey";
ALTER TABLE ONLY neon_auth.member DROP CONSTRAINT "member_userId_fkey";
ALTER TABLE ONLY neon_auth.member DROP CONSTRAINT "member_organizationId_fkey";
ALTER TABLE ONLY neon_auth.invitation DROP CONSTRAINT "invitation_organizationId_fkey";
ALTER TABLE ONLY neon_auth.invitation DROP CONSTRAINT "invitation_inviterId_fkey";
ALTER TABLE ONLY neon_auth.account DROP CONSTRAINT "account_userId_fkey";
DROP TRIGGER tr_rastrear_compras_cliente ON public."DetalleVenta";
DROP TRIGGER tr_historial_precios ON public."Producto";
DROP TRIGGER tr_audit_venta ON public."Venta";
DROP TRIGGER tr_audit_usuario ON public."Usuario";
DROP TRIGGER tr_audit_proveedor ON public."Proveedor";
DROP TRIGGER tr_audit_producto ON public."Producto";
DROP TRIGGER tr_audit_detalle_venta ON public."DetalleVenta";
DROP TRIGGER tr_audit_detalle_compra ON public."DetalleCompra";
DROP TRIGGER tr_audit_compra ON public."Compra";
DROP TRIGGER tr_audit_cliente ON public."Cliente";
DROP TRIGGER tr_actualizar_stats_producto ON public."DetalleVenta";
DROP INDEX public."ServicioPodologia_nombre_key";
DROP INDEX public."Receta_idAtencion_key";
DROP INDEX public."Receta_codigoReceta_key";
DROP INDEX public."Proveedor_ruc_key";
DROP INDEX public."PasswordResetToken_tokenHash_idx";
DROP INDEX public."PasswordResetToken_correo_idx";
DROP INDEX public."PasswordResetRequest_ip_createdAt_idx";
DROP INDEX public."PasswordResetRequest_correo_createdAt_idx";
DROP INDEX public."MovimientoInventario_idProducto_idx";
DROP INDEX public."MovimientoInventario_createdAt_idx";
DROP INDEX public."Lote_idProducto_idx";
DROP INDEX public."Lote_idProducto_codigoLote_key";
DROP INDEX public."Lote_fechaVencimiento_idx";
DROP INDEX public."Laboratorio_nombre_key";
DROP INDEX public."DevolucionProveedor_idempotencyKey_key";
DROP INDEX public."DetalleVentaLote_idLote_idx";
DROP INDEX public."DetalleVentaLote_idDetalleVenta_idx";
DROP INDEX public."DetalleVentaLote_idDetalleVenta_idLote_key";
DROP INDEX public."DatosClinicosPaciente_idCliente_key";
DROP INDEX public."AtencionPodologica_idCita_key";
DROP INDEX neon_auth.verification_identifier_idx;
DROP INDEX neon_auth."session_userId_idx";
DROP INDEX neon_auth.organization_slug_uidx;
DROP INDEX neon_auth."member_userId_idx";
DROP INDEX neon_auth."member_organizationId_idx";
DROP INDEX neon_auth."invitation_organizationId_idx";
DROP INDEX neon_auth.invitation_email_idx;
DROP INDEX neon_auth."account_userId_idx";
ALTER TABLE ONLY public."Venta" DROP CONSTRAINT "Venta_pkey";
ALTER TABLE ONLY public."Usuario" DROP CONSTRAINT "Usuario_pkey";
ALTER TABLE ONLY public."Usuario" DROP CONSTRAINT "Usuario_correo_key";
ALTER TABLE ONLY public."ServicioPodologia" DROP CONSTRAINT "ServicioPodologia_pkey";
ALTER TABLE ONLY public."Rol" DROP CONSTRAINT "Rol_pkey";
ALTER TABLE ONLY public."Rol" DROP CONSTRAINT "Rol_nombre_key";
ALTER TABLE ONLY public."Receta" DROP CONSTRAINT "Receta_pkey";
ALTER TABLE ONLY public."Proveedor" DROP CONSTRAINT "Proveedor_pkey";
ALTER TABLE ONLY public."Proveedor" DROP CONSTRAINT "Proveedor_nombre_key";
ALTER TABLE ONLY public."ProveedorProducto" DROP CONSTRAINT "ProveedorProducto_pkey";
ALTER TABLE ONLY public."ProveedorProducto" DROP CONSTRAINT "ProveedorProducto_idProveedor_idProducto_key";
ALTER TABLE ONLY public."Producto" DROP CONSTRAINT "Producto_pkey";
ALTER TABLE ONLY public."Producto" DROP CONSTRAINT "Producto_nombre_key";
ALTER TABLE ONLY public."Producto" DROP CONSTRAINT "Producto_codigoBarras_key";
ALTER TABLE ONLY public."PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_tokenHash_key";
ALTER TABLE ONLY public."PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_pkey";
ALTER TABLE ONLY public."PasswordResetRequest" DROP CONSTRAINT "PasswordResetRequest_pkey";
ALTER TABLE ONLY public."MovimientoInventario" DROP CONSTRAINT "MovimientoInventario_pkey";
ALTER TABLE ONLY public."Lote" DROP CONSTRAINT "Lote_pkey";
ALTER TABLE ONLY public."Laboratorio" DROP CONSTRAINT "Laboratorio_pkey";
ALTER TABLE ONLY public."DevolucionProveedor" DROP CONSTRAINT "DevolucionProveedor_pkey";
ALTER TABLE ONLY public."DetalleVenta" DROP CONSTRAINT "DetalleVenta_pkey";
ALTER TABLE ONLY public."DetalleVentaLote" DROP CONSTRAINT "DetalleVentaLote_pkey";
ALTER TABLE ONLY public."DetalleReceta" DROP CONSTRAINT "DetalleReceta_pkey";
ALTER TABLE ONLY public."DetalleCompra" DROP CONSTRAINT "DetalleCompra_pkey";
ALTER TABLE ONLY public."Descuento" DROP CONSTRAINT "Descuento_pkey";
ALTER TABLE ONLY public."DatosClinicosPaciente" DROP CONSTRAINT "DatosClinicosPaciente_pkey";
ALTER TABLE ONLY public."Compra" DROP CONSTRAINT "Compra_pkey";
ALTER TABLE ONLY public."Cliente" DROP CONSTRAINT "Cliente_telefono_key";
ALTER TABLE ONLY public."Cliente" DROP CONSTRAINT "Cliente_ruc_key";
ALTER TABLE ONLY public."Cliente" DROP CONSTRAINT "Cliente_pkey";
ALTER TABLE ONLY public."Cliente" DROP CONSTRAINT "Cliente_correo_key";
ALTER TABLE ONLY public."Cliente" DROP CONSTRAINT "Cliente_cedula_key";
ALTER TABLE ONLY public."Cita" DROP CONSTRAINT "Cita_pkey";
ALTER TABLE ONLY public."CategoriaProducto" DROP CONSTRAINT "CategoriaProducto_pkey";
ALTER TABLE ONLY public."CategoriaProducto" DROP CONSTRAINT "CategoriaProducto_nombre_key";
ALTER TABLE ONLY public."Auditoria" DROP CONSTRAINT "Auditoria_pkey";
ALTER TABLE ONLY public."AuditoriaLog" DROP CONSTRAINT "AuditoriaLog_pkey";
ALTER TABLE ONLY public."AtencionPodologica" DROP CONSTRAINT "AtencionPodologica_pkey";
ALTER TABLE ONLY neon_auth.verification DROP CONSTRAINT verification_pkey;
ALTER TABLE ONLY neon_auth."user" DROP CONSTRAINT user_pkey;
ALTER TABLE ONLY neon_auth."user" DROP CONSTRAINT user_email_key;
ALTER TABLE ONLY neon_auth.session DROP CONSTRAINT session_token_key;
ALTER TABLE ONLY neon_auth.session DROP CONSTRAINT session_pkey;
ALTER TABLE ONLY neon_auth.project_config DROP CONSTRAINT project_config_pkey;
ALTER TABLE ONLY neon_auth.project_config DROP CONSTRAINT project_config_endpoint_id_key;
ALTER TABLE ONLY neon_auth.organization DROP CONSTRAINT organization_slug_key;
ALTER TABLE ONLY neon_auth.organization DROP CONSTRAINT organization_pkey;
ALTER TABLE ONLY neon_auth.member DROP CONSTRAINT member_pkey;
ALTER TABLE ONLY neon_auth.jwks DROP CONSTRAINT jwks_pkey;
ALTER TABLE ONLY neon_auth.invitation DROP CONSTRAINT invitation_pkey;
ALTER TABLE ONLY neon_auth.account DROP CONSTRAINT account_pkey;
ALTER TABLE public."Venta" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."Usuario" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."ServicioPodologia" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."Rol" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."Receta" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."ProveedorProducto" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."Proveedor" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."Producto" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."PasswordResetToken" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."PasswordResetRequest" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."MovimientoInventario" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."Lote" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."Laboratorio" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."DevolucionProveedor" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."DetalleVentaLote" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."DetalleVenta" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."DetalleReceta" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."DetalleCompra" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."Descuento" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."DatosClinicosPaciente" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."Compra" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."Cliente" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."Cita" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."CategoriaProducto" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."AuditoriaLog" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."Auditoria" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."AtencionPodologica" ALTER COLUMN id DROP DEFAULT;
DROP VIEW public.vw_ventas_mensuales;
DROP VIEW public.vw_ventas_diarias;
DROP VIEW public.vw_productos_por_vencer;
DROP VIEW public.vw_productos_mas_vendidos;
DROP VIEW public.vw_productos_abc;
DROP VIEW public.vw_kardex_producto;
DROP VIEW public.vw_inventario_general;
DROP VIEW public.vw_compras_mensuales;
DROP VIEW public.vw_clientes_frecuentes;
DROP VIEW public.vw_auditoria_general;
DROP SEQUENCE public."Venta_id_seq";
DROP TABLE public."Venta";
DROP SEQUENCE public."Usuario_id_seq";
DROP TABLE public."Usuario";
DROP SEQUENCE public."ServicioPodologia_id_seq";
DROP TABLE public."ServicioPodologia";
DROP SEQUENCE public."Rol_id_seq";
DROP TABLE public."Rol";
DROP SEQUENCE public."Receta_id_seq";
DROP TABLE public."Receta";
DROP SEQUENCE public."Proveedor_id_seq";
DROP SEQUENCE public."ProveedorProducto_id_seq";
DROP TABLE public."ProveedorProducto";
DROP TABLE public."Proveedor";
DROP SEQUENCE public."Producto_id_seq";
DROP TABLE public."Producto";
DROP SEQUENCE public."PasswordResetToken_id_seq";
DROP TABLE public."PasswordResetToken";
DROP SEQUENCE public."PasswordResetRequest_id_seq";
DROP TABLE public."PasswordResetRequest";
DROP SEQUENCE public."MovimientoInventario_id_seq";
DROP TABLE public."MovimientoInventario";
DROP SEQUENCE public."Lote_id_seq";
DROP TABLE public."Lote";
DROP SEQUENCE public."Laboratorio_id_seq";
DROP TABLE public."Laboratorio";
DROP SEQUENCE public."DevolucionProveedor_id_seq";
DROP TABLE public."DevolucionProveedor";
DROP SEQUENCE public."DetalleVenta_id_seq";
DROP SEQUENCE public."DetalleVentaLote_id_seq";
DROP TABLE public."DetalleVentaLote";
DROP TABLE public."DetalleVenta";
DROP SEQUENCE public."DetalleReceta_id_seq";
DROP TABLE public."DetalleReceta";
DROP SEQUENCE public."DetalleCompra_id_seq";
DROP TABLE public."DetalleCompra";
DROP SEQUENCE public."Descuento_id_seq";
DROP TABLE public."Descuento";
DROP SEQUENCE public."DatosClinicosPaciente_id_seq";
DROP TABLE public."DatosClinicosPaciente";
DROP SEQUENCE public."Compra_id_seq";
DROP TABLE public."Compra";
DROP SEQUENCE public."Cliente_id_seq";
DROP TABLE public."Cliente";
DROP SEQUENCE public."Cita_id_seq";
DROP TABLE public."Cita";
DROP SEQUENCE public."CategoriaProducto_id_seq";
DROP TABLE public."CategoriaProducto";
DROP SEQUENCE public."Auditoria_id_seq";
DROP SEQUENCE public."AuditoriaLog_id_seq";
DROP TABLE public."AuditoriaLog";
DROP TABLE public."Auditoria";
DROP SEQUENCE public."AtencionPodologica_id_seq";
DROP TABLE public."AtencionPodologica";
DROP TABLE neon_auth.verification;
DROP TABLE neon_auth."user";
DROP TABLE neon_auth.session;
DROP TABLE neon_auth.project_config;
DROP TABLE neon_auth.organization;
DROP TABLE neon_auth.member;
DROP TABLE neon_auth.jwks;
DROP TABLE neon_auth.invitation;
DROP TABLE neon_auth.account;
DROP PROCEDURE public.sp_resumen_ventas_por_metodo_pago(IN p_fecha_inicio date, IN p_fecha_fin date);
DROP PROCEDURE public.sp_reporte_ventas_por_fecha(IN p_fecha_inicio date, IN p_fecha_fin date);
DROP PROCEDURE public.sp_reporte_ventas(IN p_fecha_inicio date, IN p_fecha_fin date);
DROP PROCEDURE public.sp_registrar_venta(IN p_id_cliente integer, IN p_id_usuario integer, IN p_metodo_pago text, IN p_detalles jsonb);
DROP PROCEDURE public.sp_productos_stock_bajo();
DROP PROCEDURE public.sp_desactivar_sin_movimiento(IN p_dias integer);
DROP PROCEDURE public.sp_cierre_caja(IN p_fecha date);
DROP PROCEDURE public.sp_ajuste_inventario(IN p_id_producto integer, IN p_nuevo_stock integer, IN p_motivo text);
DROP PROCEDURE public.registrar_auditoria(IN p_usuario text, IN p_accion text, IN p_modulo text, IN p_ip text, IN p_datos_anteriores jsonb, IN p_datos_nuevos jsonb);
DROP FUNCTION public.obtener_productos_bajo_stock();
DROP FUNCTION public.obtener_historial_cliente(p_id_cliente integer);
DROP FUNCTION public.generar_resumen_general();
DROP FUNCTION public.fn_registrar_auditoria_dml();
DROP FUNCTION public.fn_rastrear_compras_cliente();
DROP FUNCTION public.fn_historial_precios();
DROP FUNCTION public.fn_actualizar_stats_producto();
DROP PROCEDURE public.cierre_caja(IN p_id_usuario integer, IN p_monto_final_real numeric);
DROP FUNCTION public.calcular_total_ventas_mes(p_mes integer, p_anio integer);
DROP FUNCTION public.calcular_total_ventas_dia(p_fecha date);
DROP FUNCTION public.calcular_total_compras_mes(p_mes integer, p_anio integer);
DROP FUNCTION public.calcular_stock_disponible(p_id_producto integer);
DROP FUNCTION public.calcular_stock_actual(p_id_producto integer);
DROP PROCEDURE public.apertura_caja(IN p_id_usuario integer, IN p_monto_inicial numeric);
DROP PROCEDURE public.actualizar_stock(IN p_id_producto integer, IN p_nuevo_stock integer, IN p_motivo text);
DROP SCHEMA neon_auth;
--
-- Name: neon_auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA neon_auth;


--
-- Name: actualizar_stock(integer, integer, text); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.actualizar_stock(IN p_id_producto integer, IN p_nuevo_stock integer, IN p_motivo text)
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: apertura_caja(integer, numeric); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.apertura_caja(IN p_id_usuario integer, IN p_monto_inicial numeric)
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: calcular_stock_actual(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calcular_stock_actual(p_id_producto integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_stock INT;
BEGIN
    SELECT COALESCE(SUM("stockActual"), 0) INTO v_stock
    FROM "Lote"
    WHERE "idProducto" = p_id_producto AND activo = true;
    RETURN v_stock;
END;
$$;


--
-- Name: calcular_stock_disponible(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calcular_stock_disponible(p_id_producto integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: calcular_total_compras_mes(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calcular_total_compras_mes(p_mes integer, p_anio integer) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(total), 0.00) INTO v_total
    FROM "Compra"
    WHERE EXTRACT(MONTH FROM fecha) = p_mes 
      AND EXTRACT(YEAR FROM fecha) = p_anio;
    RETURN v_total;
END;
$$;


--
-- Name: calcular_total_ventas_dia(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calcular_total_ventas_dia(p_fecha date) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(total), 0.00) INTO v_total
    FROM "Venta"
    WHERE fecha::date = p_fecha AND estado = 'COMPLETADA';
    RETURN v_total;
END;
$$;


--
-- Name: calcular_total_ventas_mes(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calcular_total_ventas_mes(p_mes integer, p_anio integer) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: cierre_caja(integer, numeric); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.cierre_caja(IN p_id_usuario integer, IN p_monto_final_real numeric)
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: fn_actualizar_stats_producto(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_actualizar_stats_producto() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: fn_historial_precios(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_historial_precios() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: fn_rastrear_compras_cliente(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_rastrear_compras_cliente() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: fn_registrar_auditoria_dml(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_registrar_auditoria_dml() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_usuario TEXT;
    v_ip TEXT;
    v_datos_ant JSONB := NULL;
    v_datos_nue JSONB := NULL;
BEGIN
    -- Capturar el usuario de la aplicación Next.js mediante variable local de sesión,
    -- o en su defecto, el usuario de la conexión de base de datos.
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
        RAISE WARNING '[Auditoria] Error al registrar operación % en %: %', TG_OP, TG_TABLE_NAME, SQLERRM;
    END;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;


--
-- Name: generar_resumen_general(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generar_resumen_general() RETURNS json
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: obtener_historial_cliente(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obtener_historial_cliente(p_id_cliente integer) RETURNS TABLE(id_venta integer, fecha timestamp without time zone, total numeric, metodo_pago text, estado text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT v.id, v.fecha, v.total, v."metodoPago", v.estado
    FROM "Venta" v
    WHERE v."idCliente" = p_id_cliente
    ORDER BY v.fecha DESC;
END;
$$;


--
-- Name: obtener_productos_bajo_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obtener_productos_bajo_stock() RETURNS TABLE(id integer, nombre text, stock_actual integer, stock_minimo integer, diferencia integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.nombre, p."stockActual", COALESCE(p."stockMinimo", 0), (COALESCE(p."stockMinimo", 0) - p."stockActual")
    FROM "Producto" p
    WHERE p.activo = true 
      AND p."stockActual" <= COALESCE(p."stockMinimo", 10)
    ORDER BY (COALESCE(p."stockMinimo", 0) - p."stockActual") DESC;
END;
$$;


--
-- Name: registrar_auditoria(text, text, text, text, jsonb, jsonb); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.registrar_auditoria(IN p_usuario text, IN p_accion text, IN p_modulo text, IN p_ip text, IN p_datos_anteriores jsonb, IN p_datos_nuevos jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO "Auditoria" ("usuario", "accion", "modulo", "ip", "datos_anteriores", "datos_nuevos")
    VALUES (p_usuario, p_accion, p_modulo, p_ip, p_datos_anteriores, p_datos_nuevos);
END;
$$;


--
-- Name: sp_ajuste_inventario(integer, integer, text); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.sp_ajuste_inventario(IN p_id_producto integer, IN p_nuevo_stock integer, IN p_motivo text)
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: sp_cierre_caja(date); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.sp_cierre_caja(IN p_fecha date DEFAULT CURRENT_DATE)
    LANGUAGE plpgsql
    AS $_$
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
$_$;


--
-- Name: sp_desactivar_sin_movimiento(integer); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.sp_desactivar_sin_movimiento(IN p_dias integer DEFAULT 90)
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: sp_productos_stock_bajo(); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.sp_productos_stock_bajo()
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


--
-- Name: sp_registrar_venta(integer, integer, text, jsonb); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.sp_registrar_venta(IN p_id_cliente integer, IN p_id_usuario integer, IN p_metodo_pago text, IN p_detalles jsonb)
    LANGUAGE plpgsql
    AS $_$
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
$_$;


--
-- Name: sp_reporte_ventas(date, date); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.sp_reporte_ventas(IN p_fecha_inicio date, IN p_fecha_fin date)
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: sp_reporte_ventas_por_fecha(date, date); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.sp_reporte_ventas_por_fecha(IN p_fecha_inicio date, IN p_fecha_fin date)
    LANGUAGE plpgsql
    AS $_$
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
    RAISE NOTICE '  TOTAL GENERAL EN PERIODO: C$ %', v_total_general;
    RAISE NOTICE '══════════════════════════════════════════════';
END;
$_$;


--
-- Name: sp_resumen_ventas_por_metodo_pago(date, date); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.sp_resumen_ventas_por_metodo_pago(IN p_fecha_inicio date, IN p_fecha_fin date)
    LANGUAGE plpgsql
    AS $$
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.account (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" uuid NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp with time zone,
    "refreshTokenExpiresAt" timestamp with time zone,
    scope text,
    password text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: invitation; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.invitation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "organizationId" uuid NOT NULL,
    email text NOT NULL,
    role text,
    status text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "inviterId" uuid NOT NULL
);


--
-- Name: jwks; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.jwks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "publicKey" text NOT NULL,
    "privateKey" text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "expiresAt" timestamp with time zone
);


--
-- Name: member; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.member (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "organizationId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    role text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL
);


--
-- Name: organization; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.organization (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo text,
    "createdAt" timestamp with time zone NOT NULL,
    metadata text
);


--
-- Name: project_config; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.project_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    endpoint_id text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    trusted_origins jsonb NOT NULL,
    social_providers jsonb NOT NULL,
    email_provider jsonb,
    email_and_password jsonb,
    allow_localhost boolean NOT NULL,
    plugin_configs jsonb,
    webhook_config jsonb
);


--
-- Name: session; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.session (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" uuid NOT NULL,
    "impersonatedBy" text,
    "activeOrganizationId" text
);


--
-- Name: user; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth."user" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "emailVerified" boolean NOT NULL,
    image text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role text,
    banned boolean,
    "banReason" text,
    "banExpires" timestamp with time zone
);


--
-- Name: verification; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.verification (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AtencionPodologica; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AtencionPodologica" (
    id integer NOT NULL,
    "idCita" integer,
    "idCliente" integer NOT NULL,
    "idUsuario" integer NOT NULL,
    fecha timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    subjetivo text NOT NULL,
    objetivo text NOT NULL,
    analisis text NOT NULL,
    plan text NOT NULL,
    "esDatoPrueba" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "idServicio" integer
);


--
-- Name: AtencionPodologica_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."AtencionPodologica_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AtencionPodologica_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."AtencionPodologica_id_seq" OWNED BY public."AtencionPodologica".id;


--
-- Name: Auditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Auditoria" (
    id integer NOT NULL,
    usuario character varying(255) NOT NULL,
    fecha date DEFAULT CURRENT_TIMESTAMP NOT NULL,
    hora time without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    accion character varying(50) NOT NULL,
    modulo character varying(100) NOT NULL,
    ip character varying(50),
    datos_anteriores jsonb,
    datos_nuevos jsonb
);


--
-- Name: AuditoriaLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditoriaLog" (
    id integer NOT NULL,
    accion text NOT NULL,
    entidad text NOT NULL,
    "entidadId" integer,
    detalles text,
    "idUsuario" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modulo text DEFAULT 'FARMACIA'::text NOT NULL
);


--
-- Name: AuditoriaLog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."AuditoriaLog_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AuditoriaLog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."AuditoriaLog_id_seq" OWNED BY public."AuditoriaLog".id;


--
-- Name: Auditoria_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Auditoria_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Auditoria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Auditoria_id_seq" OWNED BY public."Auditoria".id;


--
-- Name: CategoriaProducto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CategoriaProducto" (
    id integer NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "esDatoPrueba" boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    "createdBy" integer
);


--
-- Name: CategoriaProducto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."CategoriaProducto_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: CategoriaProducto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."CategoriaProducto_id_seq" OWNED BY public."CategoriaProducto".id;


--
-- Name: Cita; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Cita" (
    id integer NOT NULL,
    "idCliente" integer NOT NULL,
    fecha timestamp(3) without time zone NOT NULL,
    motivo text,
    estado text DEFAULT 'PENDIENTE'::text NOT NULL,
    "esDatoPrueba" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Cita_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Cita_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Cita_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Cita_id_seq" OWNED BY public."Cita".id;


--
-- Name: Cliente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Cliente" (
    id integer NOT NULL,
    "nombreCompleto" text NOT NULL,
    telefono text,
    correo text,
    cedula text,
    ruc text,
    direccion text,
    activo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "esDatoPrueba" boolean DEFAULT false NOT NULL,
    "fechaNacimiento" timestamp(3) without time zone,
    sexo text,
    "tipoPerfil" text DEFAULT 'FARMACIA'::text NOT NULL
);


--
-- Name: Cliente_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Cliente_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Cliente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Cliente_id_seq" OWNED BY public."Cliente".id;


--
-- Name: Compra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Compra" (
    id integer NOT NULL,
    fecha timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "fechaCompra" timestamp(3) without time zone,
    "numeroFactura" text,
    "idProveedor" integer NOT NULL,
    total numeric(10,2) NOT NULL,
    "idUsuario" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Compra_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Compra_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Compra_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Compra_id_seq" OWNED BY public."Compra".id;


--
-- Name: DatosClinicosPaciente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DatosClinicosPaciente" (
    id integer NOT NULL,
    "idCliente" integer NOT NULL,
    antecedentes text,
    alergias text,
    "observacionesClinicas" text,
    "diagnosticoGeneral" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: DatosClinicosPaciente_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."DatosClinicosPaciente_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: DatosClinicosPaciente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."DatosClinicosPaciente_id_seq" OWNED BY public."DatosClinicosPaciente".id;


--
-- Name: Descuento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Descuento" (
    id integer NOT NULL,
    tipo text NOT NULL,
    valor numeric(10,2) NOT NULL,
    motivo text NOT NULL,
    "fechaInicio" timestamp(3) without time zone,
    "fechaFin" timestamp(3) without time zone,
    "montoMinimo" numeric(10,2),
    "maxDescuento" numeric(10,2),
    "esAcumulable" boolean DEFAULT false NOT NULL,
    estado text DEFAULT 'ACTIVO'::text NOT NULL,
    "idUsuario" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Descuento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Descuento_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Descuento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Descuento_id_seq" OWNED BY public."Descuento".id;


--
-- Name: DetalleCompra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DetalleCompra" (
    id integer NOT NULL,
    "idCompra" integer NOT NULL,
    "idProducto" integer NOT NULL,
    cantidad integer NOT NULL,
    "precioUnitario" numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    lote text,
    "fechaVencimiento" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: DetalleCompra_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."DetalleCompra_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: DetalleCompra_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."DetalleCompra_id_seq" OWNED BY public."DetalleCompra".id;


--
-- Name: DetalleReceta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DetalleReceta" (
    id integer NOT NULL,
    "idReceta" integer NOT NULL,
    "idProducto" integer NOT NULL,
    cantidad integer NOT NULL,
    "cantidadFacturada" integer DEFAULT 0 NOT NULL,
    indicaciones text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: DetalleReceta_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."DetalleReceta_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: DetalleReceta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."DetalleReceta_id_seq" OWNED BY public."DetalleReceta".id;


--
-- Name: DetalleVenta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DetalleVenta" (
    id integer NOT NULL,
    "idVenta" integer NOT NULL,
    "idProducto" integer NOT NULL,
    cantidad integer NOT NULL,
    "precioUnitario" numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    "tipoUnidad" text DEFAULT 'UNIDAD'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "descuentoLinea" numeric(10,2) DEFAULT 0
);


--
-- Name: DetalleVentaLote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DetalleVentaLote" (
    id integer NOT NULL,
    "idDetalleVenta" integer NOT NULL,
    "idLote" integer NOT NULL,
    cantidad integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DetalleVentaLote_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."DetalleVentaLote_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: DetalleVentaLote_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."DetalleVentaLote_id_seq" OWNED BY public."DetalleVentaLote".id;


--
-- Name: DetalleVenta_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."DetalleVenta_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: DetalleVenta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."DetalleVenta_id_seq" OWNED BY public."DetalleVenta".id;


--
-- Name: DevolucionProveedor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DevolucionProveedor" (
    id integer NOT NULL,
    "idempotencyKey" text NOT NULL,
    "idProducto" integer NOT NULL,
    "idLote" integer NOT NULL,
    "idProveedor" integer,
    cantidad integer NOT NULL,
    motivo text NOT NULL,
    observacion text,
    estado text DEFAULT 'COMPLETADA'::text NOT NULL,
    "idMovimientoInventario" integer,
    "idUsuario" integer NOT NULL,
    fecha timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "motivoAnulacion" text,
    "esDatoPrueba" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: DevolucionProveedor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."DevolucionProveedor_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: DevolucionProveedor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."DevolucionProveedor_id_seq" OWNED BY public."DevolucionProveedor".id;


--
-- Name: Laboratorio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Laboratorio" (
    id integer NOT NULL,
    nombre text NOT NULL,
    pais text,
    direccion text,
    telefono text,
    correo text,
    contacto text,
    activo boolean DEFAULT true NOT NULL,
    observaciones text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Laboratorio_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Laboratorio_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Laboratorio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Laboratorio_id_seq" OWNED BY public."Laboratorio".id;


--
-- Name: Lote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Lote" (
    id integer NOT NULL,
    "idProducto" integer NOT NULL,
    "codigoLote" text NOT NULL,
    "fechaVencimiento" timestamp(3) without time zone,
    "stockInicial" integer DEFAULT 0 NOT NULL,
    "stockActual" integer DEFAULT 0 NOT NULL,
    "costoCompra" numeric(10,2) DEFAULT 0 NOT NULL,
    "idDetalleCompra" integer,
    activo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Lote_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Lote_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Lote_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Lote_id_seq" OWNED BY public."Lote".id;


--
-- Name: MovimientoInventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MovimientoInventario" (
    id integer NOT NULL,
    "idProducto" integer NOT NULL,
    "idLote" integer,
    tipo text NOT NULL,
    cantidad integer NOT NULL,
    "stockResultante" integer DEFAULT 0 NOT NULL,
    "costoUnitario" numeric(10,2),
    referencia text,
    "idUsuario" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    observacion text
);


--
-- Name: MovimientoInventario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."MovimientoInventario_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: MovimientoInventario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."MovimientoInventario_id_seq" OWNED BY public."MovimientoInventario".id;


--
-- Name: PasswordResetRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PasswordResetRequest" (
    id integer NOT NULL,
    correo text NOT NULL,
    ip text,
    exitoso boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PasswordResetRequest_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."PasswordResetRequest_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: PasswordResetRequest_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."PasswordResetRequest_id_seq" OWNED BY public."PasswordResetRequest".id;


--
-- Name: PasswordResetToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PasswordResetToken" (
    id integer NOT NULL,
    correo text NOT NULL,
    "tokenHash" text NOT NULL,
    expiracion timestamp(3) without time zone NOT NULL,
    usado boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "intentosFallidos" integer DEFAULT 0 NOT NULL,
    "ipOrigen" text
);


--
-- Name: PasswordResetToken_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."PasswordResetToken_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: PasswordResetToken_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."PasswordResetToken_id_seq" OWNED BY public."PasswordResetToken".id;


--
-- Name: Producto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Producto" (
    id integer NOT NULL,
    nombre text NOT NULL,
    "codigoBarras" text,
    descripcion text,
    "fechaVencimiento" timestamp(3) without time zone,
    "idCategoria" integer NOT NULL,
    "precioCompra" numeric(10,2) NOT NULL,
    "precioVenta" numeric(10,2) NOT NULL,
    "precioBlister" numeric(10,2),
    "precioCaja" numeric(10,2),
    "unidadesPorBlister" integer,
    "unidadesPorCaja" integer,
    "stockActual" integer DEFAULT 0 NOT NULL,
    "stockMinimo" integer,
    activo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    concentracion text,
    "esDatoPrueba" boolean DEFAULT false NOT NULL,
    "esServicio" boolean DEFAULT false NOT NULL,
    laboratorio text,
    "unidadMedida" text,
    "blísteresPorCaja" integer,
    "formaPresentacion" text,
    "idLaboratorio" integer,
    "margenUtilidad" numeric(10,2),
    "precioSugerido" numeric(10,2)
);


--
-- Name: Producto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Producto_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Producto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Producto_id_seq" OWNED BY public."Producto".id;


--
-- Name: Proveedor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Proveedor" (
    id integer NOT NULL,
    nombre text NOT NULL,
    telefono text,
    correo text,
    direccion text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "esDatoPrueba" boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    contacto text,
    ruc text
);


--
-- Name: ProveedorProducto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProveedorProducto" (
    id integer NOT NULL,
    "idProveedor" integer NOT NULL,
    "idProducto" integer NOT NULL,
    "precioCompra" numeric(10,2),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ProveedorProducto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ProveedorProducto_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ProveedorProducto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ProveedorProducto_id_seq" OWNED BY public."ProveedorProducto".id;


--
-- Name: Proveedor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Proveedor_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Proveedor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Proveedor_id_seq" OWNED BY public."Proveedor".id;


--
-- Name: Receta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Receta" (
    id integer NOT NULL,
    "codigoReceta" text NOT NULL,
    "idAtencion" integer NOT NULL,
    "idCliente" integer NOT NULL,
    "idUsuario" integer NOT NULL,
    estado text DEFAULT 'EMITIDA'::text NOT NULL,
    "fechaVencimiento" timestamp(3) without time zone,
    observaciones text,
    "esDatoPrueba" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Receta_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Receta_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Receta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Receta_id_seq" OWNED BY public."Receta".id;


--
-- Name: Rol; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Rol" (
    id integer NOT NULL,
    nombre text NOT NULL
);


--
-- Name: Rol_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Rol_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Rol_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Rol_id_seq" OWNED BY public."Rol".id;


--
-- Name: ServicioPodologia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ServicioPodologia" (
    id integer NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    precio numeric(10,2) NOT NULL,
    duracion integer,
    activo boolean DEFAULT true NOT NULL,
    "esDatoPrueba" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ServicioPodologia_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ServicioPodologia_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ServicioPodologia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ServicioPodologia_id_seq" OWNED BY public."ServicioPodologia".id;


--
-- Name: Usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Usuario" (
    id integer NOT NULL,
    "nombreCompleto" text NOT NULL,
    correo text NOT NULL,
    "passwordHash" text NOT NULL,
    "idRol" integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "esDatoPrueba" boolean DEFAULT false NOT NULL
);


--
-- Name: Usuario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Usuario_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Usuario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Usuario_id_seq" OWNED BY public."Usuario".id;


--
-- Name: Venta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Venta" (
    id integer NOT NULL,
    fecha timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "idCliente" integer,
    total numeric(10,2) NOT NULL,
    "metodoPago" text NOT NULL,
    "nombrePodologo" text,
    "numeroReceta" text,
    "idUsuario" integer NOT NULL,
    "tipoComprobante" text DEFAULT 'RECIBO'::text NOT NULL,
    estado text DEFAULT 'COMPLETADA'::text NOT NULL,
    "montoRecibido" numeric(10,2),
    cambio numeric(10,2),
    "rucCliente" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "descuentoTotal" numeric(10,2) DEFAULT 0,
    "idDescuento" integer
);


--
-- Name: Venta_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Venta_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Venta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Venta_id_seq" OWNED BY public."Venta".id;


--
-- Name: vw_auditoria_general; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_auditoria_general AS
 SELECT id,
    usuario,
    fecha,
    hora,
    accion,
    modulo,
    ip,
    datos_anteriores,
    datos_nuevos
   FROM public."Auditoria" a;


--
-- Name: vw_clientes_frecuentes; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_clientes_frecuentes AS
 SELECT c.id AS cliente_id,
    c."nombreCompleto" AS cliente_nombre,
    c.cedula,
    count(v.id) AS total_compras,
    sum(v.total) AS total_gastado,
    max(v.fecha) AS ultima_compra
   FROM (public."Cliente" c
     JOIN public."Venta" v ON ((v."idCliente" = c.id)))
  WHERE ((v.estado = 'COMPLETADA'::text) AND (c.activo = true))
  GROUP BY c.id, c."nombreCompleto", c.cedula;


--
-- Name: vw_compras_mensuales; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_compras_mensuales AS
 SELECT (EXTRACT(year FROM fecha))::integer AS anio,
    (EXTRACT(month FROM fecha))::integer AS mes,
    count(id) AS cantidad_compras,
    sum(total) AS total_invertido
   FROM public."Compra"
  GROUP BY (EXTRACT(year FROM fecha)), (EXTRACT(month FROM fecha));


--
-- Name: vw_inventario_general; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_inventario_general AS
 SELECT p.id AS producto_id,
    p.nombre AS producto_nombre,
    p."codigoBarras" AS codigo_barras,
    c.nombre AS categoria_nombre,
    p."stockActual" AS stock_total,
    p."stockMinimo" AS stock_minimo,
    p."precioCompra" AS precio_compra,
    p."precioVenta" AS precio_venta,
    p.activo
   FROM (public."Producto" p
     JOIN public."CategoriaProducto" c ON ((c.id = p."idCategoria")));


--
-- Name: vw_kardex_producto; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_kardex_producto AS
 SELECT m.id AS movimiento_id,
    m."idProducto" AS producto_id,
    p.nombre AS producto_nombre,
    m."createdAt" AS fecha,
    m.tipo AS tipo_movimiento,
    m.referencia,
    u."nombreCompleto" AS usuario_nombre,
        CASE
            WHEN (m.tipo = ANY (ARRAY['ENTRADA_COMPRA'::text, 'AJUSTE_POSITIVO'::text])) THEN m.cantidad
            ELSE NULL::integer
        END AS entrada,
        CASE
            WHEN (m.tipo = ANY (ARRAY['SALIDA_VENTA'::text, 'AJUSTE_NEGATIVO'::text])) THEN m.cantidad
            ELSE NULL::integer
        END AS salida,
    m."stockResultante" AS saldo
   FROM ((public."MovimientoInventario" m
     JOIN public."Producto" p ON ((p.id = m."idProducto")))
     LEFT JOIN public."Usuario" u ON ((u.id = m."idUsuario")));


--
-- Name: vw_productos_abc; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_productos_abc AS
 WITH total_ventas AS (
         SELECT sum(dv.subtotal) AS total_global
           FROM (public."DetalleVenta" dv
             JOIN public."Venta" v ON ((v.id = dv."idVenta")))
          WHERE (v.estado = 'COMPLETADA'::text)
        ), ventas_producto AS (
         SELECT p.id AS producto_id,
            p.nombre AS producto_nombre,
            COALESCE(sum(dv.subtotal), (0)::numeric) AS ingresos_producto
           FROM ((public."Producto" p
             LEFT JOIN public."DetalleVenta" dv ON ((dv."idProducto" = p.id)))
             LEFT JOIN public."Venta" v ON (((v.id = dv."idVenta") AND (v.estado = 'COMPLETADA'::text))))
          GROUP BY p.id, p.nombre
        ), acumulado AS (
         SELECT vp.producto_id,
            vp.producto_nombre,
            vp.ingresos_producto,
            sum(vp.ingresos_producto) OVER (ORDER BY vp.ingresos_producto DESC) AS ingreso_acumulado,
            COALESCE(( SELECT total_ventas.total_global
                   FROM total_ventas), 1.00) AS total_global
           FROM ventas_producto vp
        ), porcentajes AS (
         SELECT acumulado.producto_id,
            acumulado.producto_nombre,
            acumulado.ingresos_producto,
            acumulado.ingreso_acumulado,
            ((acumulado.ingreso_acumulado / acumulado.total_global) * (100)::numeric) AS porcentaje_acumulado
           FROM acumulado
        )
 SELECT producto_id,
    producto_nombre,
    ingresos_producto,
    porcentaje_acumulado,
        CASE
            WHEN (porcentaje_acumulado <= 70.00) THEN 'A'::text
            WHEN (porcentaje_acumulado <= 90.00) THEN 'B'::text
            ELSE 'C'::text
        END AS clasificacion_abc
   FROM porcentajes;


--
-- Name: vw_productos_mas_vendidos; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_productos_mas_vendidos AS
 SELECT p.id AS producto_id,
    p.nombre AS producto_nombre,
    sum(dv.cantidad) AS cantidad_vendida,
    sum(dv.subtotal) AS total_recaudado
   FROM ((public."Producto" p
     JOIN public."DetalleVenta" dv ON ((dv."idProducto" = p.id)))
     JOIN public."Venta" v ON ((v.id = dv."idVenta")))
  WHERE (v.estado = 'COMPLETADA'::text)
  GROUP BY p.id, p.nombre;


--
-- Name: vw_productos_por_vencer; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_productos_por_vencer AS
 SELECT l.id AS lote_id,
    l."codigoLote" AS codigo_lote,
    p.id AS producto_id,
    p.nombre AS producto_nombre,
    l."stockActual" AS stock_lote,
    l."fechaVencimiento" AS fecha_vencimiento,
    ((l."fechaVencimiento")::date - CURRENT_DATE) AS dias_restantes,
        CASE
            WHEN (((l."fechaVencimiento")::date - CURRENT_DATE) <= 0) THEN 'VENCIDO'::text
            WHEN (((l."fechaVencimiento")::date - CURRENT_DATE) <= 30) THEN 'MENOS_30_DIAS'::text
            WHEN (((l."fechaVencimiento")::date - CURRENT_DATE) <= 60) THEN 'MENOS_60_DIAS'::text
            WHEN (((l."fechaVencimiento")::date - CURRENT_DATE) <= 90) THEN 'MENOS_90_DIAS'::text
            ELSE 'SEGURO'::text
        END AS estado_vencimiento
   FROM (public."Lote" l
     JOIN public."Producto" p ON ((p.id = l."idProducto")))
  WHERE ((l.activo = true) AND (l."stockActual" > 0) AND (l."fechaVencimiento" IS NOT NULL));


--
-- Name: vw_ventas_diarias; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_ventas_diarias AS
 SELECT (fecha)::date AS fecha_venta,
    count(id) AS cantidad_ventas,
    sum(total) AS total_recaudado,
    avg(total) AS ticket_promedio
   FROM public."Venta"
  WHERE (estado = 'COMPLETADA'::text)
  GROUP BY ((fecha)::date);


--
-- Name: vw_ventas_mensuales; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_ventas_mensuales AS
 SELECT (EXTRACT(year FROM fecha))::integer AS anio,
    (EXTRACT(month FROM fecha))::integer AS mes,
    count(id) AS cantidad_ventas,
    sum(total) AS total_recaudado
   FROM public."Venta"
  WHERE (estado = 'COMPLETADA'::text)
  GROUP BY (EXTRACT(year FROM fecha)), (EXTRACT(month FROM fecha));


--
-- Name: AtencionPodologica id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AtencionPodologica" ALTER COLUMN id SET DEFAULT nextval('public."AtencionPodologica_id_seq"'::regclass);


--
-- Name: Auditoria id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Auditoria" ALTER COLUMN id SET DEFAULT nextval('public."Auditoria_id_seq"'::regclass);


--
-- Name: AuditoriaLog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditoriaLog" ALTER COLUMN id SET DEFAULT nextval('public."AuditoriaLog_id_seq"'::regclass);


--
-- Name: CategoriaProducto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CategoriaProducto" ALTER COLUMN id SET DEFAULT nextval('public."CategoriaProducto_id_seq"'::regclass);


--
-- Name: Cita id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Cita" ALTER COLUMN id SET DEFAULT nextval('public."Cita_id_seq"'::regclass);


--
-- Name: Cliente id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Cliente" ALTER COLUMN id SET DEFAULT nextval('public."Cliente_id_seq"'::regclass);


--
-- Name: Compra id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Compra" ALTER COLUMN id SET DEFAULT nextval('public."Compra_id_seq"'::regclass);


--
-- Name: DatosClinicosPaciente id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DatosClinicosPaciente" ALTER COLUMN id SET DEFAULT nextval('public."DatosClinicosPaciente_id_seq"'::regclass);


--
-- Name: Descuento id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Descuento" ALTER COLUMN id SET DEFAULT nextval('public."Descuento_id_seq"'::regclass);


--
-- Name: DetalleCompra id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DetalleCompra" ALTER COLUMN id SET DEFAULT nextval('public."DetalleCompra_id_seq"'::regclass);


--
-- Name: DetalleReceta id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DetalleReceta" ALTER COLUMN id SET DEFAULT nextval('public."DetalleReceta_id_seq"'::regclass);


--
-- Name: DetalleVenta id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DetalleVenta" ALTER COLUMN id SET DEFAULT nextval('public."DetalleVenta_id_seq"'::regclass);


--
-- Name: DetalleVentaLote id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DetalleVentaLote" ALTER COLUMN id SET DEFAULT nextval('public."DetalleVentaLote_id_seq"'::regclass);


--
-- Name: DevolucionProveedor id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DevolucionProveedor" ALTER COLUMN id SET DEFAULT nextval('public."DevolucionProveedor_id_seq"'::regclass);


--
-- Name: Laboratorio id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Laboratorio" ALTER COLUMN id SET DEFAULT nextval('public."Laboratorio_id_seq"'::regclass);


--
-- Name: Lote id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Lote" ALTER COLUMN id SET DEFAULT nextval('public."Lote_id_seq"'::regclass);


--
-- Name: MovimientoInventario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MovimientoInventario" ALTER COLUMN id SET DEFAULT nextval('public."MovimientoInventario_id_seq"'::regclass);


--
-- Name: PasswordResetRequest id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordResetRequest" ALTER COLUMN id SET DEFAULT nextval('public."PasswordResetRequest_id_seq"'::regclass);


--
-- Name: PasswordResetToken id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordResetToken" ALTER COLUMN id SET DEFAULT nextval('public."PasswordResetToken_id_seq"'::regclass);


--
-- Name: Producto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Producto" ALTER COLUMN id SET DEFAULT nextval('public."Producto_id_seq"'::regclass);


--
-- Name: Proveedor id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Proveedor" ALTER COLUMN id SET DEFAULT nextval('public."Proveedor_id_seq"'::regclass);


--
-- Name: ProveedorProducto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProveedorProducto" ALTER COLUMN id SET DEFAULT nextval('public."ProveedorProducto_id_seq"'::regclass);


--
-- Name: Receta id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Receta" ALTER COLUMN id SET DEFAULT nextval('public."Receta_id_seq"'::regclass);


--
-- Name: Rol id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Rol" ALTER COLUMN id SET DEFAULT nextval('public."Rol_id_seq"'::regclass);


--
-- Name: ServicioPodologia id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ServicioPodologia" ALTER COLUMN id SET DEFAULT nextval('public."ServicioPodologia_id_seq"'::regclass);


--
-- Name: Usuario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Usuario" ALTER COLUMN id SET DEFAULT nextval('public."Usuario_id_seq"'::regclass);


--
-- Name: Venta id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Venta" ALTER COLUMN id SET DEFAULT nextval('public."Venta_id_seq"'::regclass);


--
-- Data for Name: account; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.account (id, "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", scope, password, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: invitation; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.invitation (id, "organizationId", email, role, status, "expiresAt", "createdAt", "inviterId") FROM stdin;
\.


--
-- Data for Name: jwks; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.jwks (id, "publicKey", "privateKey", "createdAt", "expiresAt") FROM stdin;
\.


--
-- Data for Name: member; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.member (id, "organizationId", "userId", role, "createdAt") FROM stdin;
\.


--
-- Data for Name: organization; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.organization (id, name, slug, logo, "createdAt", metadata) FROM stdin;
\.


--
-- Data for Name: project_config; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.project_config (id, name, endpoint_id, created_at, updated_at, trusted_origins, social_providers, email_provider, email_and_password, allow_localhost, plugin_configs, webhook_config) FROM stdin;
fcdb458e-d0e0-4d76-9584-4dae0b68f115	Farmacia	ep-restless-bonus-ap2ksomq	2026-06-01 15:27:17.137+00	2026-06-01 15:27:17.137+00	[]	[{"id": "google", "isShared": true}]	{"type": "shared"}	{"enabled": true, "disableSignUp": false, "emailVerificationMethod": "otp", "requireEmailVerification": false, "autoSignInAfterVerification": true, "sendVerificationEmailOnSignIn": false, "sendVerificationEmailOnSignUp": false}	t	{"magicLink": {"config": {"expiresIn": 5, "disableSignUp": false}, "enabled": false}, "phoneNumber": {"config": {"otp_expires_in": 300}, "enabled": false}, "organization": {"config": {"creatorRole": "owner", "membershipLimit": 100, "organizationLimit": 10, "sendInvitationEmail": false}, "enabled": true}}	{"enabled": false, "enabledEvents": [], "timeoutSeconds": 5}
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.session (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId", "impersonatedBy", "activeOrganizationId") FROM stdin;
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth."user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt", role, banned, "banReason", "banExpires") FROM stdin;
\.


--
-- Data for Name: verification; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AtencionPodologica; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AtencionPodologica" (id, "idCita", "idCliente", "idUsuario", fecha, subjetivo, objetivo, analisis, plan, "esDatoPrueba", "createdAt", "updatedAt", "idServicio") FROM stdin;
2	4	49	9	2026-06-24 05:18:32.56	Presenta una comezon anormal en la planta de los pies	Examen de hongos	Hongo detectado por sudoracion	Clotrimazol al 1% durante 14 dias, cita para control	f	2026-06-24 05:18:32.56	2026-06-24 05:18:32.56	\N
\.


--
-- Data for Name: Auditoria; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Auditoria" (id, usuario, fecha, hora, accion, modulo, ip, datos_anteriores, datos_nuevos) FROM stdin;
29159	neondb_owner	2026-06-23	17:02:22.304876	INSERT	Usuario	127.0.0.1	\N	{"id": 9, "idRol": 1, "activo": true, "correo": "kevingabrield23@gmail.com", "createdAt": "2026-06-23T17:02:22.303", "updatedAt": "2026-06-23T17:02:22.303", "esDatoPrueba": false, "passwordHash": "$2b$10$90bHBG.iiQ5ZL43AOjQ3VOh3ceUNalRvuonwDDeKcfbn2IRBeSzY2", "nombreCompleto": "Kevin Gabriel Duarte"}
29160	neondb_owner	2026-06-24	04:11:13.753612	INSERT	Cliente	127.0.0.1	\N	{"id": 48, "ruc": null, "activo": true, "cedula": "001-188181-5150R", "correo": "tututtu@gmail.com", "telefono": "57921649", "createdAt": "2026-06-24T04:11:13.751", "direccion": "ceibo 1/2 c abajo", "updatedAt": "2026-06-24T04:11:13.751", "esDatoPrueba": false, "nombreCompleto": "justin Ramses Flores Camacho"}
29161	neondb_owner	2026-06-24	04:13:27.850048	INSERT	Cliente	127.0.0.1	\N	{"id": 49, "ruc": null, "activo": true, "cedula": "001-150898-1021R", "correo": "tututu@gmail.com", "telefono": "57921648", "createdAt": "2026-06-24T04:13:27.849", "direccion": "ceibo 1/2 c abajo", "updatedAt": "2026-06-24T04:13:27.849", "esDatoPrueba": false, "nombreCompleto": "Justin Ramsess Flores Camacho"}
29162	neondb_owner	2026-06-24	04:13:58.752396	UPDATE	Cliente	127.0.0.1	{"id": 48, "ruc": null, "activo": true, "cedula": "001-188181-5150R", "correo": "tututtu@gmail.com", "telefono": "57921649", "createdAt": "2026-06-24T04:11:13.751", "direccion": "ceibo 1/2 c abajo", "updatedAt": "2026-06-24T04:11:13.751", "esDatoPrueba": false, "nombreCompleto": "justin Ramses Flores Camacho"}	{"id": 48, "ruc": null, "activo": true, "cedula": "001-188181-5150R", "correo": "tututtu@gmail.com", "telefono": "57921649", "createdAt": "2026-06-24T04:11:13.751", "direccion": "ceibo 1/2 c abajo", "updatedAt": "2026-06-24T04:13:58.75", "esDatoPrueba": false, "nombreCompleto": "justin Ramses Flores Camacho"}
29163	neondb_owner	2026-06-24	04:15:28.134267	INSERT	Cliente	127.0.0.1	\N	{"id": 50, "ruc": null, "activo": true, "cedula": "001-180685-1587Z", "correo": "ererer@hotmail.com", "telefono": "11111111", "createdAt": "2026-06-24T04:15:28.13", "direccion": "mercado Oriental", "updatedAt": "2026-06-24T04:15:28.13", "esDatoPrueba": false, "nombreCompleto": "Kevin"}
29164	neondb_owner	2026-06-24	04:21:10.513125	INSERT	Producto	127.0.0.1	\N	{"id": 98, "activo": true, "nombre": "er", "createdAt": "2026-06-24T04:21:10.516", "updatedAt": "2026-06-24T04:21:10.516", "esServicio": false, "precioCaja": 384.00, "descripcion": "a", "idCategoria": 17, "laboratorio": "prrrr", "precioVenta": 6.00, "stockActual": 10, "stockMinimo": 1, "codigoBarras": "88549645641894", "esDatoPrueba": false, "precioCompra": 1.00, "unidadMedida": "nada ", "concentracion": "1000000 mg", "precioBlister": 2.40, "unidadesPorCaja": 320, "fechaVencimiento": null, "unidadesPorBlister": 2}
29165	neondb_owner	2026-06-24	04:21:47.238711	INSERT	Proveedor	127.0.0.1	\N	{"id": 16, "correo": "r@gmail.com", "nombre": "si", "telefono": "7878785", "createdAt": "2026-06-24T04:21:47.236", "direccion": "1", "updatedAt": "2026-06-24T04:21:47.236", "esDatoPrueba": false}
29166	neondb_owner	2026-06-24	04:22:49.637924	INSERT	Compra	127.0.0.1	\N	{"id": 17, "fecha": "2026-06-24T04:22:49.639", "total": 111.00, "createdAt": "2026-06-24T04:22:49.64", "idUsuario": 9, "updatedAt": "2026-06-24T04:22:49.64", "fechaCompra": "2026-06-24T00:00:00", "idProveedor": 16, "numeroFactura": "FAC"}
29167	neondb_owner	2026-06-24	04:22:49.637924	INSERT	DetalleCompra	127.0.0.1	\N	{"id": 87, "lote": "231-RE-2", "cantidad": 111, "idCompra": 17, "subtotal": 111.00, "createdAt": "2026-06-24T04:22:49.64", "updatedAt": "2026-06-24T04:22:49.64", "idProducto": 98, "precioUnitario": 1.00, "fechaVencimiento": "2027-12-03T00:00:00"}
29168	neondb_owner	2026-06-24	04:22:49.637924	UPDATE	Producto	127.0.0.1	{"id": 98, "activo": true, "nombre": "er", "createdAt": "2026-06-24T04:21:10.516", "updatedAt": "2026-06-24T04:21:10.516", "esServicio": false, "precioCaja": 384.00, "descripcion": "a", "idCategoria": 17, "laboratorio": "prrrr", "precioVenta": 6.00, "stockActual": 10, "stockMinimo": 1, "codigoBarras": "88549645641894", "esDatoPrueba": false, "precioCompra": 1.00, "unidadMedida": "nada ", "concentracion": "1000000 mg", "precioBlister": 2.40, "unidadesPorCaja": 320, "fechaVencimiento": null, "unidadesPorBlister": 2}	{"id": 98, "activo": true, "nombre": "er", "createdAt": "2026-06-24T04:21:10.516", "updatedAt": "2026-06-24T04:22:49.701", "esServicio": false, "precioCaja": 384.00, "descripcion": "a", "idCategoria": 17, "laboratorio": "prrrr", "precioVenta": 6.00, "stockActual": 121, "stockMinimo": 1, "codigoBarras": "88549645641894", "esDatoPrueba": false, "precioCompra": 1.00, "unidadMedida": "nada ", "concentracion": "1000000 mg", "precioBlister": 2.40, "unidadesPorCaja": 320, "fechaVencimiento": null, "unidadesPorBlister": 2}
29169	neondb_owner	2026-06-24	04:42:03.479699	INSERT	Compra	127.0.0.1	\N	{"id": 18, "fecha": "2026-06-24T04:42:03.489", "total": 100.00, "createdAt": "2026-06-24T04:42:03.491", "idUsuario": 9, "updatedAt": "2026-06-24T04:42:03.491", "fechaCompra": "2026-06-24T00:00:00", "idProveedor": 16, "numeroFactura": "001"}
29170	neondb_owner	2026-06-24	04:42:03.479699	INSERT	DetalleCompra	127.0.0.1	\N	{"id": 88, "lote": "55454", "cantidad": 100, "idCompra": 18, "subtotal": 100.00, "createdAt": "2026-06-24T04:42:03.491", "updatedAt": "2026-06-24T04:42:03.491", "idProducto": 98, "precioUnitario": 1.00, "fechaVencimiento": "2026-08-27T00:00:00"}
29171	neondb_owner	2026-06-24	04:42:03.479699	UPDATE	Producto	127.0.0.1	{"id": 98, "activo": true, "nombre": "er", "createdAt": "2026-06-24T04:21:10.516", "updatedAt": "2026-06-24T04:22:49.701", "esServicio": false, "precioCaja": 384.00, "descripcion": "a", "idCategoria": 17, "laboratorio": "prrrr", "precioVenta": 6.00, "stockActual": 121, "stockMinimo": 1, "codigoBarras": "88549645641894", "esDatoPrueba": false, "precioCompra": 1.00, "unidadMedida": "nada ", "concentracion": "1000000 mg", "precioBlister": 2.40, "unidadesPorCaja": 320, "fechaVencimiento": null, "unidadesPorBlister": 2}	{"id": 98, "activo": true, "nombre": "er", "createdAt": "2026-06-24T04:21:10.516", "updatedAt": "2026-06-24T04:42:03.645", "esServicio": false, "precioCaja": 384.00, "descripcion": "a", "idCategoria": 17, "laboratorio": "prrrr", "precioVenta": 6.00, "stockActual": 221, "stockMinimo": 1, "codigoBarras": "88549645641894", "esDatoPrueba": false, "precioCompra": 1.00, "unidadMedida": "nada ", "concentracion": "1000000 mg", "precioBlister": 2.40, "unidadesPorCaja": 320, "fechaVencimiento": null, "unidadesPorBlister": 2}
29172	neondb_owner	2026-06-24	04:48:22.21871	UPDATE	Producto	127.0.0.1	{"id": 98, "activo": true, "nombre": "er", "createdAt": "2026-06-24T04:21:10.516", "updatedAt": "2026-06-24T04:42:03.645", "esServicio": false, "precioCaja": 384.00, "descripcion": "a", "idCategoria": 17, "laboratorio": "prrrr", "precioVenta": 6.00, "stockActual": 221, "stockMinimo": 1, "codigoBarras": "88549645641894", "esDatoPrueba": false, "precioCompra": 1.00, "unidadMedida": "nada ", "concentracion": "1000000 mg", "precioBlister": 2.40, "unidadesPorCaja": 320, "fechaVencimiento": null, "unidadesPorBlister": 2}	{"id": 98, "activo": true, "nombre": "er", "createdAt": "2026-06-24T04:21:10.516", "updatedAt": "2026-06-24T04:48:22.254", "esServicio": false, "precioCaja": 384.00, "descripcion": "a", "idCategoria": 17, "laboratorio": "prrrr", "precioVenta": 6.00, "stockActual": 121, "stockMinimo": 1, "codigoBarras": "88549645641894", "esDatoPrueba": false, "precioCompra": 1.00, "unidadMedida": "nada ", "concentracion": "1000000 mg", "precioBlister": 2.40, "unidadesPorCaja": 320, "fechaVencimiento": null, "unidadesPorBlister": 2}
29173	neondb_owner	2026-06-24	04:52:01.659605	INSERT	Venta	127.0.0.1	\N	{"id": 46, "fecha": "2026-06-24T04:52:01.676", "total": 42.00, "cambio": null, "estado": "COMPLETADA", "createdAt": "2026-06-24T04:52:01.678", "idCliente": 50, "idUsuario": 9, "updatedAt": "2026-06-24T04:52:01.678", "metodoPago": "TRANSFERENCIA", "rucCliente": null, "numeroReceta": null, "montoRecibido": null, "nombrePodologo": null, "tipoComprobante": "RECIBO"}
29174	neondb_owner	2026-06-24	04:52:01.659605	INSERT	DetalleVenta	127.0.0.1	\N	{"id": 93, "idVenta": 46, "cantidad": 7, "subtotal": 42.00, "createdAt": "2026-06-24T04:52:01.678", "updatedAt": "2026-06-24T04:52:01.678", "idProducto": 98, "tipoUnidad": "UNIDAD", "precioUnitario": 6.00}
29175	neondb_owner	2026-06-24	04:52:01.659605	UPDATE	Producto	127.0.0.1	{"id": 98, "activo": true, "nombre": "er", "createdAt": "2026-06-24T04:21:10.516", "updatedAt": "2026-06-24T04:48:22.254", "esServicio": false, "precioCaja": 384.00, "descripcion": "a", "idCategoria": 17, "laboratorio": "prrrr", "precioVenta": 6.00, "stockActual": 121, "stockMinimo": 1, "codigoBarras": "88549645641894", "esDatoPrueba": false, "precioCompra": 1.00, "unidadMedida": "nada ", "concentracion": "1000000 mg", "precioBlister": 2.40, "unidadesPorCaja": 320, "fechaVencimiento": null, "unidadesPorBlister": 2}	{"id": 98, "activo": true, "nombre": "er", "createdAt": "2026-06-24T04:21:10.516", "updatedAt": "2026-06-24T04:52:01.806", "esServicio": false, "precioCaja": 384.00, "descripcion": "a", "idCategoria": 17, "laboratorio": "prrrr", "precioVenta": 6.00, "stockActual": 114, "stockMinimo": 1, "codigoBarras": "88549645641894", "esDatoPrueba": false, "precioCompra": 1.00, "unidadMedida": "nada ", "concentracion": "1000000 mg", "precioBlister": 2.40, "unidadesPorCaja": 320, "fechaVencimiento": null, "unidadesPorBlister": 2}
29177	neondb_owner	2026-06-24	06:15:47.064819	INSERT	Producto	127.0.0.1	\N	{"id": 99, "activo": true, "nombre": "metamizol", "createdAt": "2026-06-24T06:15:47.068", "updatedAt": "2026-06-24T06:15:47.068", "esServicio": false, "precioCaja": 60.00, "descripcion": "Para quitar calentura", "idCategoria": 18, "laboratorio": null, "precioVenta": 2.00, "stockActual": 50, "stockMinimo": 5, "codigoBarras": "4566465454564", "esDatoPrueba": false, "precioCompra": 1.00, "unidadMedida": "unidad ", "concentracion": "500 mg", "idLaboratorio": null, "precioBlister": 20.00, "margenUtilidad": null, "precioSugerido": null, "unidadesPorCaja": 50, "fechaVencimiento": null, "blísteresPorCaja": null, "formaPresentacion": null, "unidadesPorBlister": 10}
29178	neondb_owner	2026-06-24	06:20:37.584974	UPDATE	Proveedor	127.0.0.1	{"id": 16, "ruc": null, "activo": true, "correo": "r@gmail.com", "nombre": "si", "contacto": null, "telefono": "7878785", "createdAt": "2026-06-24T04:21:47.236", "direccion": "1", "updatedAt": "2026-06-24T04:21:47.236", "esDatoPrueba": false}	{"id": 16, "ruc": null, "activo": true, "correo": "r@gmail.com", "nombre": "si", "contacto": null, "telefono": "78787855", "createdAt": "2026-06-24T04:21:47.236", "direccion": "1", "updatedAt": "2026-06-24T06:20:37.581", "esDatoPrueba": false}
29196	neondb_owner	2026-06-24	06:34:03.031472	INSERT	Compra	127.0.0.1	\N	{"id": 27, "fecha": "2026-06-24T06:33:58.887", "total": 46.00, "createdAt": "2026-06-24T06:33:58.891", "idUsuario": 1, "updatedAt": "2026-06-24T06:33:58.891", "fechaCompra": "2026-06-24T00:00:00", "idProveedor": 16, "numeroFactura": "002"}
29197	neondb_owner	2026-06-24	06:34:03.031472	INSERT	DetalleCompra	127.0.0.1	\N	{"id": 97, "lote": "22548g", "cantidad": 46, "idCompra": 27, "subtotal": 46.00, "createdAt": "2026-06-24T06:33:58.891", "updatedAt": "2026-06-24T06:33:58.891", "idProducto": 99, "precioUnitario": 1.00, "fechaVencimiento": "2026-11-24T00:00:00"}
29198	neondb_owner	2026-06-24	06:34:03.031472	UPDATE	Producto	127.0.0.1	{"id": 99, "activo": true, "nombre": "metamizol", "createdAt": "2026-06-24T06:15:47.068", "updatedAt": "2026-06-24T06:15:47.068", "esServicio": false, "precioCaja": 60.00, "descripcion": "Para quitar calentura", "idCategoria": 18, "laboratorio": null, "precioVenta": 2.00, "stockActual": 50, "stockMinimo": 5, "codigoBarras": "4566465454564", "esDatoPrueba": false, "precioCompra": 1.00, "unidadMedida": "unidad ", "concentracion": "500 mg", "idLaboratorio": null, "precioBlister": 20.00, "margenUtilidad": null, "precioSugerido": null, "unidadesPorCaja": 50, "fechaVencimiento": null, "blísteresPorCaja": null, "formaPresentacion": null, "unidadesPorBlister": 10}	{"id": 99, "activo": true, "nombre": "metamizol", "createdAt": "2026-06-24T06:15:47.068", "updatedAt": "2026-06-24T06:34:00.422", "esServicio": false, "precioCaja": 60.00, "descripcion": "Para quitar calentura", "idCategoria": 18, "laboratorio": null, "precioVenta": 2.00, "stockActual": 96, "stockMinimo": 5, "codigoBarras": "4566465454564", "esDatoPrueba": false, "precioCompra": 1.00, "unidadMedida": "unidad ", "concentracion": "500 mg", "idLaboratorio": null, "precioBlister": 20.00, "margenUtilidad": null, "precioSugerido": null, "unidadesPorCaja": 50, "fechaVencimiento": null, "blísteresPorCaja": null, "formaPresentacion": null, "unidadesPorBlister": 10}
29138	neondb_owner	2026-06-23	16:57:05.738549	DELETE	Producto	127.0.0.1	{"id": 1, "activo": true, "nombre": "Panadol Ultra 500mg (Caja 24)", "createdAt": "2026-06-23T16:36:42.063", "updatedAt": "2026-06-23T16:36:42.063", "esServicio": false, "precioCaja": null, "descripcion": "Panadol Ultra con cafeína para alivio rápido de dolores de cabeza fuertes.", "idCategoria": 1, "laboratorio": null, "precioVenta": 60.00, "stockActual": 148, "stockMinimo": 20, "codigoBarras": "7401004123456", "esDatoPrueba": false, "precioCompra": 40.00, "unidadMedida": null, "concentracion": null, "precioBlister": null, "unidadesPorCaja": null, "fechaVencimiento": null, "unidadesPorBlister": null}	\N
29150	neondb_owner	2026-06-23	16:57:06.061309	DELETE	Cliente	127.0.0.1	{"id": 1, "ruc": null, "activo": true, "cedula": "001-120590-0010M", "correo": "bayardo.espinoza@correo.ni", "telefono": "+505 8999-1122", "createdAt": "2026-06-23T16:36:42.706", "direccion": "Bello Horizonte, Iglesia Pío X 2c al norte, Managua", "updatedAt": "2026-06-23T16:36:42.706", "esDatoPrueba": false, "nombreCompleto": "Bayardo José Espinoza Zelaya"}	\N
29139	neondb_owner	2026-06-23	16:57:05.738549	DELETE	Producto	127.0.0.1	{"id": 2, "activo": true, "nombre": "Tafirol 500mg Paracetamol (Caja 100)", "createdAt": "2026-06-23T16:36:42.063", "updatedAt": "2026-06-23T16:36:42.063", "esServicio": false, "precioCaja": null, "descripcion": "Paracetamol de 500mg para control de fiebre y dolor general.", "idCategoria": 1, "laboratorio": null, "precioVenta": 180.00, "stockActual": 79, "stockMinimo": 15, "codigoBarras": "7501004123457", "esDatoPrueba": false, "precioCompra": 120.00, "unidadMedida": null, "concentracion": null, "precioBlister": null, "unidadesPorCaja": null, "fechaVencimiento": null, "unidadesPorBlister": null}	\N
29140	neondb_owner	2026-06-23	16:57:05.738549	DELETE	Producto	127.0.0.1	{"id": 3, "activo": true, "nombre": "Apronax 550mg Naproxeno (Caja 10)", "createdAt": "2026-06-23T16:36:42.063", "updatedAt": "2026-06-23T16:36:42.063", "esServicio": false, "precioCaja": null, "descripcion": "Naproxeno Sódico de 550mg potente antiinflamatorio y analgésico.", "idCategoria": 1, "laboratorio": null, "precioVenta": 125.00, "stockActual": 119, "stockMinimo": 25, "codigoBarras": "7801004123458", "esDatoPrueba": false, "precioCompra": 85.00, "unidadMedida": null, "concentracion": null, "precioBlister": null, "unidadesPorCaja": null, "fechaVencimiento": null, "unidadesPorBlister": null}	\N
29141	neondb_owner	2026-06-23	16:57:05.738549	DELETE	Producto	127.0.0.1	{"id": 4, "activo": true, "nombre": "Neurobión Inyectable Triple Dosis (3ml)", "createdAt": "2026-06-23T16:36:42.063", "updatedAt": "2026-06-23T16:36:42.063", "esServicio": false, "precioCaja": null, "descripcion": "Complejo B inyectable para neuritis y dolores musculares severos.", "idCategoria": 1, "laboratorio": null, "precioVenta": 220.00, "stockActual": 58, "stockMinimo": 10, "codigoBarras": "7901004123459", "esDatoPrueba": false, "precioCompra": 150.00, "unidadMedida": null, "concentracion": null, "precioBlister": null, "unidadesPorCaja": null, "fechaVencimiento": null, "unidadesPorBlister": null}	\N
29142	neondb_owner	2026-06-23	16:57:05.738549	DELETE	Producto	127.0.0.1	{"id": 5, "activo": true, "nombre": "Alka-Seltzer Efervescente (Caja 12)", "createdAt": "2026-06-23T16:36:42.063", "updatedAt": "2026-06-23T16:36:42.063", "esServicio": false, "precioCaja": null, "descripcion": "Antiácido y analgésico efervescente para indigestión.", "idCategoria": 5, "laboratorio": null, "precioVenta": 45.00, "stockActual": 200, "stockMinimo": 30, "codigoBarras": "7401004123460", "esDatoPrueba": false, "precioCompra": 30.00, "unidadMedida": null, "concentracion": null, "precioBlister": null, "unidadesPorCaja": null, "fechaVencimiento": null, "unidadesPorBlister": null}	\N
29143	neondb_owner	2026-06-23	16:57:05.738549	DELETE	Producto	127.0.0.1	{"id": 6, "activo": true, "nombre": "Crema Quadriderm Dérmica (20g)", "createdAt": "2026-06-23T16:36:42.063", "updatedAt": "2026-06-23T16:36:42.063", "esServicio": false, "precioCaja": null, "descripcion": "Crema tópica antiinflamatoria, bactericida y antimicótica de amplio espectro.", "idCategoria": 2, "laboratorio": null, "precioVenta": 250.00, "stockActual": 44, "stockMinimo": 10, "codigoBarras": "7401004123461", "esDatoPrueba": false, "precioCompra": 180.00, "unidadMedida": null, "concentracion": null, "precioBlister": null, "unidadesPorCaja": null, "fechaVencimiento": null, "unidadesPorBlister": null}	\N
29144	neondb_owner	2026-06-23	16:57:05.738549	DELETE	Producto	127.0.0.1	{"id": 7, "activo": true, "nombre": "Suero Electrolit Coco (625ml)", "createdAt": "2026-06-23T16:36:42.063", "updatedAt": "2026-06-23T16:36:42.063", "esServicio": false, "precioCaja": null, "descripcion": "Bebida hidratante para recuperar electrolitos sabor coco.", "idCategoria": 5, "laboratorio": null, "precioVenta": 42.00, "stockActual": 90, "stockMinimo": 15, "codigoBarras": "7401004123462", "esDatoPrueba": false, "precioCompra": 28.00, "unidadMedida": null, "concentracion": null, "precioBlister": null, "unidadesPorCaja": null, "fechaVencimiento": null, "unidadesPorBlister": null}	\N
29145	neondb_owner	2026-06-23	16:57:05.738549	DELETE	Producto	127.0.0.1	{"id": 8, "activo": true, "nombre": "Clotrimazol Crema Antimicótica 1% (20g)", "createdAt": "2026-06-23T16:36:42.063", "updatedAt": "2026-06-23T16:36:42.063", "esServicio": false, "precioCaja": null, "descripcion": "Tratamiento fungicida de pie de atleta e infecciones dérmicas.", "idCategoria": 2, "laboratorio": null, "precioVenta": 75.00, "stockActual": 69, "stockMinimo": 12, "codigoBarras": "7401004123463", "esDatoPrueba": false, "precioCompra": 45.00, "unidadMedida": null, "concentracion": null, "precioBlister": null, "unidadesPorCaja": null, "fechaVencimiento": null, "unidadesPorBlister": null}	\N
29146	neondb_owner	2026-06-23	16:57:05.738549	DELETE	Producto	127.0.0.1	{"id": 9, "activo": true, "nombre": "Amoxicilina 500mg Antibiótico (Caja 30)", "createdAt": "2026-06-23T16:36:42.063", "updatedAt": "2026-06-23T16:36:42.063", "esServicio": false, "precioCaja": null, "descripcion": "Antibiótico bactericida de amplio espectro para infecciones.", "idCategoria": 1, "laboratorio": null, "precioVenta": 140.00, "stockActual": 55, "stockMinimo": 10, "codigoBarras": "7401004123464", "esDatoPrueba": false, "precioCompra": 90.00, "unidadMedida": null, "concentracion": null, "precioBlister": null, "unidadesPorCaja": null, "fechaVencimiento": null, "unidadesPorBlister": null}	\N
29147	neondb_owner	2026-06-23	16:57:05.738549	DELETE	Producto	127.0.0.1	{"id": 10, "activo": true, "nombre": "Loratadina 10mg Antialérgico (Caja 10)", "createdAt": "2026-06-23T16:36:42.063", "updatedAt": "2026-06-23T16:36:42.063", "esServicio": false, "precioCaja": null, "descripcion": "Antihistamínico de segunda generación para alivio de alergias sin sueño.", "idCategoria": 1, "laboratorio": null, "precioVenta": 35.00, "stockActual": 107, "stockMinimo": 20, "codigoBarras": "7401004123465", "esDatoPrueba": false, "precioCompra": 20.00, "unidadMedida": null, "concentracion": null, "precioBlister": null, "unidadesPorCaja": null, "fechaVencimiento": null, "unidadesPorBlister": null}	\N
29148	neondb_owner	2026-06-23	16:57:05.738549	DELETE	Producto	127.0.0.1	{"id": 11, "activo": true, "nombre": "Crema Podológica PodoCare 100ml", "createdAt": "2026-06-23T16:36:42.063", "updatedAt": "2026-06-23T16:36:42.063", "esServicio": false, "precioCaja": null, "descripcion": "Crema altamente hidratante para talones agrietados y pie seco.", "idCategoria": 3, "laboratorio": null, "precioVenta": 380.00, "stockActual": 5, "stockMinimo": 8, "codigoBarras": "7401004123466", "esDatoPrueba": false, "precioCompra": 250.00, "unidadMedida": null, "concentracion": null, "precioBlister": null, "unidadesPorCaja": null, "fechaVencimiento": null, "unidadesPorBlister": null}	\N
29149	neondb_owner	2026-06-23	16:57:05.738549	DELETE	Producto	127.0.0.1	{"id": 12, "activo": true, "nombre": "Venda Elástica Autoadherente Coban 3M", "createdAt": "2026-06-23T16:36:42.063", "updatedAt": "2026-06-23T16:36:42.063", "esServicio": false, "precioCaja": null, "descripcion": "Venda elástica cohesiva de 3 pulgadas de ancho para soporte articular.", "idCategoria": 5, "laboratorio": null, "precioVenta": 95.00, "stockActual": 40, "stockMinimo": 15, "codigoBarras": "7401004123467", "esDatoPrueba": false, "precioCompra": 65.00, "unidadMedida": null, "concentracion": null, "precioBlister": null, "unidadesPorCaja": null, "fechaVencimiento": null, "unidadesPorBlister": null}	\N
29151	neondb_owner	2026-06-23	16:57:06.061309	DELETE	Cliente	127.0.0.1	{"id": 2, "ruc": null, "activo": true, "cedula": "401-240893-0002A", "correo": "ligia.gutierrez@correo.ni", "telefono": "+505 8444-5566", "createdAt": "2026-06-23T16:36:42.706", "direccion": "Barrio San Jerónimo, Masaya", "updatedAt": "2026-06-23T16:36:42.706", "esDatoPrueba": false, "nombreCompleto": "Ligia Mercedes Gutiérrez Brenes"}	\N
29152	neondb_owner	2026-06-23	16:57:06.061309	DELETE	Cliente	127.0.0.1	{"id": 3, "ruc": null, "activo": true, "cedula": "201-150285-0003B", "correo": "reynaldo.cerda@correo.ni", "telefono": "+505 7666-8899", "createdAt": "2026-06-23T16:36:42.706", "direccion": "Calle Real Xalteva, del Calvario 1c al oeste, Granada", "updatedAt": "2026-06-23T16:36:42.706", "esDatoPrueba": false, "nombreCompleto": "Reynaldo Antonio Cerda Martínez"}	\N
29153	neondb_owner	2026-06-23	16:57:06.061309	DELETE	Cliente	127.0.0.1	{"id": 4, "ruc": null, "activo": true, "cedula": "081-301195-0004L", "correo": "fabiola.toruno@correo.ni", "telefono": "+505 8111-2233", "createdAt": "2026-06-23T16:36:42.706", "direccion": "Reparto San Juan, costado norte de la Iglesia, León", "updatedAt": "2026-06-23T16:36:42.706", "esDatoPrueba": false, "nombreCompleto": "Fabiola Patricia Toruño Blandón"}	\N
29154	neondb_owner	2026-06-23	16:57:06.220932	DELETE	Proveedor	127.0.0.1	{"id": 1, "correo": "cefa.prevendedor.juan@distribuidor.com.ni", "nombre": "Droguería CEFA Nicaragua (Prevendedor: Juan Carlos Pérez)", "telefono": "+505 8888-1234", "createdAt": "2026-06-23T16:36:41.9", "direccion": "Km 8.5 Carretera Norte, Managua", "updatedAt": "2026-06-23T16:36:41.9", "esDatoPrueba": false}	\N
29155	neondb_owner	2026-06-23	16:57:06.220932	DELETE	Proveedor	127.0.0.1	{"id": 2, "correo": "crowley.prevendedor.maria@distribuidor.com.ni", "nombre": "Droguería Crowley (Prevendedor: María Alejandra Espinoza)", "telefono": "+505 8777-5678", "createdAt": "2026-06-23T16:36:41.9", "direccion": "Pista Juan Pablo II, Managua", "updatedAt": "2026-06-23T16:36:41.9", "esDatoPrueba": false}	\N
29156	neondb_owner	2026-06-23	16:57:06.220932	DELETE	Proveedor	127.0.0.1	{"id": 3, "correo": "diprofa.prevendedor.ronaldo@distribuidor.com.ni", "nombre": "Diprofa Nicaragua (Prevendedor: Ronaldo Blandón)", "telefono": "+505 8666-9012", "createdAt": "2026-06-23T16:36:41.9", "direccion": "Altamira, Sector Distribuidoras, Managua", "updatedAt": "2026-06-23T16:36:41.9", "esDatoPrueba": false}	\N
29157	neondb_owner	2026-06-23	16:57:06.220932	DELETE	Proveedor	127.0.0.1	{"id": 4, "correo": "disnteg.prevendedor.ligia@distribuidor.com.ni", "nombre": "Distribuidora DISNTEG (Prevendedor: Ligia Mercedes Blandón)", "telefono": "+505 7777-3456", "createdAt": "2026-06-23T16:36:41.9", "direccion": "Bello Horizonte, Multicentro 2c al sur, Managua", "updatedAt": "2026-06-23T16:36:41.9", "esDatoPrueba": false}	\N
29158	neondb_owner	2026-06-23	16:57:06.220932	DELETE	Proveedor	127.0.0.1	{"id": 5, "correo": "dicasa.prevendedor.guillermo@distribuidor.com.ni", "nombre": "DICASA Carazo (Prevendedor: Guillermo Antonio Brenes)", "telefono": "+505 8555-7890", "createdAt": "2026-06-23T16:36:41.9", "direccion": "Km 12 Carretera Sur, Managua", "updatedAt": "2026-06-23T16:36:41.9", "esDatoPrueba": false}	\N
\.


--
-- Data for Name: AuditoriaLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AuditoriaLog" (id, accion, entidad, "entidadId", detalles, "idUsuario", "createdAt", modulo) FROM stdin;
7	LOGIN_EXITOSO	Usuario	9	{"correo":"kevingabrield23@gmail.com","rol":"ADMIN"}	9	2026-06-23 18:26:29.084	FARMACIA
8	IA_CHAT_CONSULTA	AsistenteIA	\N	{"rol":"ADMIN","mensajes":2}	9	2026-06-23 18:27:49.472	FARMACIA
9	IA_GEMINI_ERROR	AsistenteIA	\N	{"status":503}	9	2026-06-23 18:27:49.927	FARMACIA
10	IA_CHAT_CONSULTA	AsistenteIA	\N	{"rol":"ADMIN","mensajes":4}	9	2026-06-23 18:27:59.982	FARMACIA
11	IA_TOOL_GET_DASHBOARD_SUMMARY	AsistenteIA	\N	{"herramienta":"getDashboardSummary","rol":"ADMIN","resultado":"OK","fuente":"Inventario, Lotes y Ventas en tiempo real."}	9	2026-06-23 18:28:00.939	FARMACIA
12	LOGIN_EXITOSO	Usuario	9	{"correo":"kevingabrield23@gmail.com","rol":"ADMIN"}	9	2026-06-24 04:09:40.985	FARMACIA
13	CREAR_PRODUCTO	Producto	98	{"nombre":"er","precioVenta":"6","stockActual":10}	9	2026-06-24 04:21:10.577	FARMACIA
14	CREAR_COMPRA	Compra	17	{"total":111,"idProveedor":16,"numeroFactura":"FAC","items":1,"productos":[{"idProducto":98,"cantidad":111,"precioUnitario":1,"lote":"231-RE-2"}]}	9	2026-06-24 04:22:49.726	FARMACIA
15	CREAR_COMPRA	Compra	18	{"total":100,"idProveedor":16,"numeroFactura":"001","items":1,"productos":[{"idProducto":98,"cantidad":100,"precioUnitario":1,"lote":"55454"}]}	9	2026-06-24 04:42:03.701	FARMACIA
16	CREAR_DEVOLUCION	DevolucionProveedor	1	{"idProducto":98,"lote":"55454","cantidad":100,"proveedorId":16,"motivo":"PRÓXIMO_A_VENCER"}	9	2026-06-24 04:48:22.336	FARMACIA
17	CREAR_VENTA	Venta	46	{"total":42,"metodoPago":"TRANSFERENCIA","idCliente":50,"tipoComprobante":"RECIBO","estado":"COMPLETADA","montoRecibido":null,"cambio":null,"rucCliente":null,"items":1,"productos":[{"idProducto":98,"cantidad":7,"tipoUnidad":"UNIDAD"}],"lotesDeducidos":[{"idProducto":98,"lote":"231-F","cantidad":7}]}	9	2026-06-24 04:52:01.816	FARMACIA
18	IA_CHAT_CONSULTA	AsistenteIA	\N	{"rol":"ADMIN","mensajes":2}	9	2026-06-24 05:05:31.32	FARMACIA
19	IA_TOOL_GET_NEAR_EXPIRATION	AsistenteIA	\N	{"herramienta":"getProductsNearExpiration","rol":"ADMIN","resultado":"OK","fuente":"Lotes próximos a vencer en los próximos 90 días (hasta el 22/9/2026)."}	9	2026-06-24 05:05:32.534	FARMACIA
20	IA_CHAT_CONSULTA	AsistenteIA	\N	{"rol":"ADMIN","mensajes":4}	9	2026-06-24 05:05:47.291	FARMACIA
21	IA_TOOL_GET_TOP_SELLING	AsistenteIA	\N	{"herramienta":"getTopSellingProducts","rol":"ADMIN","resultado":"OK","fuente":"Ventas del 25/5/2026 al 24/6/2026."}	9	2026-06-24 05:05:48.354	FARMACIA
22	IA_CHAT_CONSULTA	AsistenteIA	\N	{"rol":"ADMIN","mensajes":6}	9	2026-06-24 05:06:34.827	FARMACIA
23	IA_TOOL_GET_DASHBOARD_SUMMARY	AsistenteIA	\N	{"herramienta":"getDashboardSummary","rol":"ADMIN","resultado":"OK","fuente":"Inventario, Lotes y Ventas en tiempo real."}	9	2026-06-24 05:06:35.934	FARMACIA
24	IA_CHAT_CONSULTA	AsistenteIA	\N	{"rol":"ADMIN","mensajes":8}	9	2026-06-24 05:06:51.58	FARMACIA
25	IA_CHAT_CONSULTA	AsistenteIA	\N	{"rol":"ADMIN","mensajes":10}	9	2026-06-24 05:08:30.485	FARMACIA
26	IA_CHAT_CONSULTA	AsistenteIA	\N	{"rol":"ADMIN","mensajes":12}	9	2026-06-24 05:09:01.534	FARMACIA
27	IA_TOOL_SEARCH_PRODUCTS	AsistenteIA	\N	{"herramienta":"searchProducts","rol":"ADMIN","resultado":"OK","fuente":"Búsqueda en catálogo de productos activos. Término: \\"er\\"."}	9	2026-06-24 05:09:02.717	FARMACIA
28	IA_TOOL_GET_PRODUCT_DETAILS	AsistenteIA	\N	{"herramienta":"getProductDetails","rol":"ADMIN","resultado":"OK","fuente":"Datos del producto ID 98 con sus lotes activos (FEFO)."}	9	2026-06-24 05:09:03.742	FARMACIA
29	IA_CHAT_CONSULTA	AsistenteIA	\N	{"rol":"ADMIN","mensajes":2}	9	2026-06-24 05:41:43.145	FARMACIA
30	IA_TOOL_GET_DASHBOARD_SUMMARY	AsistenteIA	\N	{"herramienta":"getDashboardSummary","rol":"ADMIN","resultado":"OK","fuente":"Inventario, Lotes y Ventas en tiempo real."}	9	2026-06-24 05:41:44.124	FARMACIA
31	IA_GEMINI_ERROR	AsistenteIA	\N	{"status":429}	9	2026-06-24 05:41:44.226	FARMACIA
32	CREAR_CATEGORIA	CategoriaProducto	18	{"nombre":"Anti-inflamatorio"}	9	2026-06-24 05:59:17.727	FARMACIA
33	CREAR_PRODUCTO	Producto	99	{"nombre":"metamizol","precioVenta":"2","stockActual":50}	9	2026-06-24 06:15:47.289	FARMACIA
34	CREAR_LABORATORIO	Laboratorio	1	{"nombre":"RAMOS"}	9	2026-06-24 06:18:30.763	FARMACIA
35	DESACTIVAR_LABORATORIO	Laboratorio	1	{"nombre":"RAMOS","activo":false}	9	2026-06-24 06:18:59.236	FARMACIA
36	ACTIVAR_LABORATORIO	Laboratorio	1	{"nombre":"RAMOS","activo":true}	9	2026-06-24 06:19:04.301	FARMACIA
37	ACTUALIZAR_PROVEEDOR	Proveedor	16	{"nombre":"si"}	9	2026-06-24 06:20:37.591	FARMACIA
38	IA_CHAT_CONSULTA	AsistenteIA	\N	{"rol":"ADMIN","mensajes":2}	9	2026-06-24 06:26:59.686	FARMACIA
39	IA_TOOL_GET_DASHBOARD_SUMMARY	AsistenteIA	\N	{"herramienta":"getDashboardSummary","rol":"ADMIN","resultado":"OK","fuente":"Inventario, Lotes y Ventas en tiempo real."}	9	2026-06-24 06:27:00.971	FARMACIA
\.


--
-- Data for Name: CategoriaProducto; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CategoriaProducto" (id, nombre, descripcion, "createdAt", "updatedAt", "esDatoPrueba", activo, "createdBy") FROM stdin;
16	A		2026-06-24 04:20:17.283	2026-06-24 04:20:17.283	f	t	\N
17	Analgesico 		2026-06-24 04:20:51.355	2026-06-24 04:20:51.355	f	t	\N
18	Anti-inflamatorio	\N	2026-06-24 05:59:17.687	2026-06-24 05:59:17.687	f	t	9
\.


--
-- Data for Name: Cita; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Cita" (id, "idCliente", fecha, motivo, estado, "esDatoPrueba", "createdAt", "updatedAt") FROM stdin;
4	49	2026-06-24 14:00:00	consulta rapida	COMPLETADA	f	2026-06-24 05:15:14.987	2026-06-24 05:18:32.552
\.


--
-- Data for Name: Cliente; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Cliente" (id, "nombreCompleto", telefono, correo, cedula, ruc, direccion, activo, "createdAt", "updatedAt", "esDatoPrueba", "fechaNacimiento", sexo, "tipoPerfil") FROM stdin;
49	Justin Ramsess Flores Camacho	57921648	tututu@gmail.com	001-150898-1021R	\N	ceibo 1/2 c abajo	t	2026-06-24 04:13:27.849	2026-06-24 04:13:27.849	f	\N	\N	FARMACIA
48	justin Ramses Flores Camacho	57921649	tututtu@gmail.com	001-188181-5150R	\N	ceibo 1/2 c abajo	t	2026-06-24 04:11:13.751	2026-06-24 04:13:58.75	f	\N	\N	FARMACIA
50	Kevin	11111111	ererer@hotmail.com	001-180685-1587Z	\N	mercado Oriental	t	2026-06-24 04:15:28.13	2026-06-24 04:15:28.13	f	\N	\N	FARMACIA
\.


--
-- Data for Name: Compra; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Compra" (id, fecha, "fechaCompra", "numeroFactura", "idProveedor", total, "idUsuario", "createdAt", "updatedAt") FROM stdin;
17	2026-06-24 04:22:49.639	2026-06-24 00:00:00	FAC	16	111.00	9	2026-06-24 04:22:49.64	2026-06-24 04:22:49.64
18	2026-06-24 04:42:03.489	2026-06-24 00:00:00	001	16	100.00	9	2026-06-24 04:42:03.491	2026-06-24 04:42:03.491
27	2026-06-24 06:33:58.887	2026-06-24 00:00:00	002	16	46.00	1	2026-06-24 06:33:58.891	2026-06-24 06:33:58.891
\.


--
-- Data for Name: DatosClinicosPaciente; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DatosClinicosPaciente" (id, "idCliente", antecedentes, alergias, "observacionesClinicas", "diagnosticoGeneral", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Descuento; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Descuento" (id, tipo, valor, motivo, "fechaInicio", "fechaFin", "montoMinimo", "maxDescuento", "esAcumulable", estado, "idUsuario", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DetalleCompra; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DetalleCompra" (id, "idCompra", "idProducto", cantidad, "precioUnitario", subtotal, lote, "fechaVencimiento", "createdAt", "updatedAt") FROM stdin;
87	17	98	111	1.00	111.00	231-RE-2	2027-12-03 00:00:00	2026-06-24 04:22:49.64	2026-06-24 04:22:49.64
88	18	98	100	1.00	100.00	55454	2026-08-27 00:00:00	2026-06-24 04:42:03.491	2026-06-24 04:42:03.491
97	27	99	46	1.00	46.00	22548g	2026-11-24 00:00:00	2026-06-24 06:33:58.891	2026-06-24 06:33:58.891
\.


--
-- Data for Name: DetalleReceta; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DetalleReceta" (id, "idReceta", "idProducto", cantidad, "cantidadFacturada", indicaciones, "createdAt", "updatedAt") FROM stdin;
3	2	98	3	0	Aplicar una vez al dia	2026-06-24 05:18:32.779	2026-06-24 05:18:32.779
\.


--
-- Data for Name: DetalleVenta; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DetalleVenta" (id, "idVenta", "idProducto", cantidad, "precioUnitario", subtotal, "tipoUnidad", "createdAt", "updatedAt", "descuentoLinea") FROM stdin;
93	46	98	7	6.00	42.00	UNIDAD	2026-06-24 04:52:01.678	2026-06-24 04:52:01.678	0.00
\.


--
-- Data for Name: DetalleVentaLote; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DetalleVentaLote" (id, "idDetalleVenta", "idLote", cantidad, "createdAt") FROM stdin;
79	93	98	7	2026-06-24 04:52:01.776
\.


--
-- Data for Name: DevolucionProveedor; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DevolucionProveedor" (id, "idempotencyKey", "idProducto", "idLote", "idProveedor", cantidad, motivo, observacion, estado, "idMovimientoInventario", "idUsuario", fecha, "motivoAnulacion", "esDatoPrueba", "createdAt", "updatedAt") FROM stdin;
1	dev-key-1782276501840-7hy4d2z	98	100	16	100	PRÓXIMO_A_VENCER	devolución con dos meses de anticipación 	COMPLETADA	193	9	2026-06-24 04:48:22.266	\N	f	2026-06-24 04:48:22.266	2026-06-24 04:48:22.266
\.


--
-- Data for Name: Laboratorio; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Laboratorio" (id, nombre, pais, direccion, telefono, correo, contacto, activo, observaciones, "createdAt", "updatedAt") FROM stdin;
1	RAMOS	Nicaragua	\N	78787858	yyyyy@hotmail.com	Loquiyto123	t	buena onda	2026-06-24 06:18:30.749	2026-06-24 06:19:04.296
\.


--
-- Data for Name: Lote; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Lote" (id, "idProducto", "codigoLote", "fechaVencimiento", "stockInicial", "stockActual", "costoCompra", "idDetalleCompra", activo, "createdAt", "updatedAt") FROM stdin;
99	98	231-RE-2	2027-12-03 00:00:00	111	111	1.00	87	t	2026-06-24 04:22:49.695	2026-06-24 04:22:49.695
100	98	55454	2026-08-27 00:00:00	100	0	1.00	88	f	2026-06-24 04:42:03.624	2026-06-24 04:48:22.248
98	98	231-F	2026-12-12 00:00:00	10	3	1.00	\N	t	2026-06-24 04:21:10.535	2026-06-24 04:52:01.77
101	99	225478S	2026-10-31 00:00:00	50	50	1.00	\N	t	2026-06-24 06:15:47.214	2026-06-24 06:15:47.214
110	99	22548g	2026-11-24 00:00:00	46	46	1.00	97	t	2026-06-24 06:34:00.263	2026-06-24 06:34:00.263
\.


--
-- Data for Name: MovimientoInventario; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MovimientoInventario" (id, "idProducto", "idLote", tipo, cantidad, "stockResultante", "costoUnitario", referencia, "idUsuario", "createdAt", observacion) FROM stdin;
190	98	98	AJUSTE_POSITIVO	10	10	1.00	Stock inicial al registrar producto	9	2026-06-24 04:21:10.556	Ajuste de stock inicial durante creación
191	98	99	ENTRADA_COMPRA	111	121	1.00	Compra #17 (Fact: FAC)	9	2026-06-24 04:22:49.717	Entrada por compra. Lote: 231-RE-2
192	98	100	ENTRADA_COMPRA	100	221	1.00	Compra #18 (Fact: 001)	9	2026-06-24 04:42:03.676	Entrada por compra. Lote: 55454
193	98	100	DEVOLUCION	100	121	1.00	Devolución Proveedor	9	2026-06-24 04:48:22.242	Devolución de lote: 55454 (100 unds) por motivo: PRÓXIMO_A_VENCER.
194	98	98	SALIDA_VENTA	7	114	1.00	Venta #46	9	2026-06-24 04:52:01.8	Salida de lote: 231-F (7 unds)
195	99	101	AJUSTE_POSITIVO	50	50	1.00	Stock inicial al registrar producto	9	2026-06-24 06:15:47.252	Ajuste de stock inicial durante creación
196	99	110	ENTRADA_COMPRA	46	96	1.00	Compra #27 (Fact: 002)	1	2026-06-24 06:34:00.585	Entrada por compra. Lote: 22548g
\.


--
-- Data for Name: PasswordResetRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PasswordResetRequest" (id, correo, ip, exitoso, "createdAt") FROM stdin;
\.


--
-- Data for Name: PasswordResetToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PasswordResetToken" (id, correo, "tokenHash", expiracion, usado, "createdAt", "intentosFallidos", "ipOrigen") FROM stdin;
\.


--
-- Data for Name: Producto; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Producto" (id, nombre, "codigoBarras", descripcion, "fechaVencimiento", "idCategoria", "precioCompra", "precioVenta", "precioBlister", "precioCaja", "unidadesPorBlister", "unidadesPorCaja", "stockActual", "stockMinimo", activo, "createdAt", "updatedAt", concentracion, "esDatoPrueba", "esServicio", laboratorio, "unidadMedida", "blísteresPorCaja", "formaPresentacion", "idLaboratorio", "margenUtilidad", "precioSugerido") FROM stdin;
98	er	88549645641894	a	\N	17	1.00	6.00	2.40	384.00	2	320	114	1	t	2026-06-24 04:21:10.516	2026-06-24 04:52:01.806	1000000 mg	f	f	prrrr	nada 	\N	\N	\N	\N	\N
99	metamizol	4566465454564	Para quitar calentura	\N	18	1.00	2.00	20.00	60.00	10	50	96	5	t	2026-06-24 06:15:47.068	2026-06-24 06:34:00.422	500 mg	f	f	\N	unidad 	\N	\N	\N	\N	\N
\.


--
-- Data for Name: Proveedor; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Proveedor" (id, nombre, telefono, correo, direccion, "createdAt", "updatedAt", "esDatoPrueba", activo, contacto, ruc) FROM stdin;
16	si	78787855	r@gmail.com	1	2026-06-24 04:21:47.236	2026-06-24 06:20:37.581	f	t	\N	\N
\.


--
-- Data for Name: ProveedorProducto; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProveedorProducto" (id, "idProveedor", "idProducto", "precioCompra", "createdAt") FROM stdin;
\.


--
-- Data for Name: Receta; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Receta" (id, "codigoReceta", "idAtencion", "idCliente", "idUsuario", estado, "fechaVencimiento", observaciones, "esDatoPrueba", "createdAt", "updatedAt") FROM stdin;
2	RECETA-20260624-1325	2	49	9	EMITIDA	2026-06-29 00:00:00	Aplicar crema clotrimazol despues de bañarse y con el pie seco 	f	2026-06-24 05:18:32.779	2026-06-24 05:18:32.779
\.


--
-- Data for Name: Rol; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Rol" (id, nombre) FROM stdin;
1	ADMIN
2	EMPLEADO
3	DOCTOR
\.


--
-- Data for Name: ServicioPodologia; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ServicioPodologia" (id, nombre, descripcion, precio, duracion, activo, "esDatoPrueba", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Usuario; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Usuario" (id, "nombreCompleto", correo, "passwordHash", "idRol", activo, "createdAt", "updatedAt", "esDatoPrueba") FROM stdin;
1	Administrador Farmacia	admin@farmacia.com	$2b$10$9ApPHYQw14.fbKGCDK.SMOvxJi8T3h6zX4lEztylCFetHglmJ.IBW	1	t	2026-06-23 16:36:41.574	2026-06-23 16:36:41.574	f
2	Usuario Demo Podocare	demo@farmacia.com	$2b$10$mtFMWgesgHtMme0jEtNKI.cqkBQ/Wzu/TXne8pE.hegDcXEbvC87i	2	t	2026-06-23 16:36:41.574	2026-06-23 16:36:41.574	f
8	Doctor Clínica	doctor@farmacia.com	$2b$10$TvkKTnhXcF1mW6lbE/9Rr.dmd6ul4WRTU3wBnHaS2CHOu81c6dYli	3	t	2026-06-23 16:55:10.997	2026-06-23 16:55:10.997	f
9	Kevin Gabriel Duarte	kevingabrield23@gmail.com	$2b$10$90bHBG.iiQ5ZL43AOjQ3VOh3ceUNalRvuonwDDeKcfbn2IRBeSzY2	1	t	2026-06-23 17:02:22.303	2026-06-23 17:02:22.303	f
\.


--
-- Data for Name: Venta; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Venta" (id, fecha, "idCliente", total, "metodoPago", "nombrePodologo", "numeroReceta", "idUsuario", "tipoComprobante", estado, "montoRecibido", cambio, "rucCliente", "createdAt", "updatedAt", "descuentoTotal", "idDescuento") FROM stdin;
46	2026-06-24 04:52:01.676	50	42.00	TRANSFERENCIA	\N	\N	9	RECIBO	COMPLETADA	\N	\N	\N	2026-06-24 04:52:01.678	2026-06-24 04:52:01.678	0.00	\N
\.


--
-- Name: AtencionPodologica_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."AtencionPodologica_id_seq"', 2, true);


--
-- Name: AuditoriaLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."AuditoriaLog_id_seq"', 39, true);


--
-- Name: Auditoria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Auditoria_id_seq"', 29198, true);


--
-- Name: CategoriaProducto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."CategoriaProducto_id_seq"', 18, true);


--
-- Name: Cita_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Cita_id_seq"', 4, true);


--
-- Name: Cliente_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Cliente_id_seq"', 50, true);


--
-- Name: Compra_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Compra_id_seq"', 27, true);


--
-- Name: DatosClinicosPaciente_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."DatosClinicosPaciente_id_seq"', 1, false);


--
-- Name: Descuento_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Descuento_id_seq"', 1, false);


--
-- Name: DetalleCompra_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."DetalleCompra_id_seq"', 97, true);


--
-- Name: DetalleReceta_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."DetalleReceta_id_seq"', 3, true);


--
-- Name: DetalleVentaLote_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."DetalleVentaLote_id_seq"', 79, true);


--
-- Name: DetalleVenta_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."DetalleVenta_id_seq"', 94, true);


--
-- Name: DevolucionProveedor_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."DevolucionProveedor_id_seq"', 1, true);


--
-- Name: Laboratorio_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Laboratorio_id_seq"', 1, true);


--
-- Name: Lote_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Lote_id_seq"', 110, true);


--
-- Name: MovimientoInventario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."MovimientoInventario_id_seq"', 196, true);


--
-- Name: PasswordResetRequest_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."PasswordResetRequest_id_seq"', 22, true);


--
-- Name: PasswordResetToken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."PasswordResetToken_id_seq"', 1, false);


--
-- Name: Producto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Producto_id_seq"', 99, true);


--
-- Name: ProveedorProducto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ProveedorProducto_id_seq"', 92, true);


--
-- Name: Proveedor_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Proveedor_id_seq"', 16, true);


--
-- Name: Receta_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Receta_id_seq"', 2, true);


--
-- Name: Rol_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Rol_id_seq"', 3, true);


--
-- Name: ServicioPodologia_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ServicioPodologia_id_seq"', 1, false);


--
-- Name: Usuario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Usuario_id_seq"', 9, true);


--
-- Name: Venta_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Venta_id_seq"', 47, true);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: invitation invitation_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT invitation_pkey PRIMARY KEY (id);


--
-- Name: jwks jwks_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.jwks
    ADD CONSTRAINT jwks_pkey PRIMARY KEY (id);


--
-- Name: member member_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT member_pkey PRIMARY KEY (id);


--
-- Name: organization organization_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.organization
    ADD CONSTRAINT organization_pkey PRIMARY KEY (id);


--
-- Name: organization organization_slug_key; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.organization
    ADD CONSTRAINT organization_slug_key UNIQUE (slug);


--
-- Name: project_config project_config_endpoint_id_key; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.project_config
    ADD CONSTRAINT project_config_endpoint_id_key UNIQUE (endpoint_id);


--
-- Name: project_config project_config_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.project_config
    ADD CONSTRAINT project_config_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_key; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT session_token_key UNIQUE (token);


--
-- Name: user user_email_key; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: AtencionPodologica AtencionPodologica_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AtencionPodologica"
    ADD CONSTRAINT "AtencionPodologica_pkey" PRIMARY KEY (id);


--
-- Name: AuditoriaLog AuditoriaLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditoriaLog"
    ADD CONSTRAINT "AuditoriaLog_pkey" PRIMARY KEY (id);


--
-- Name: Auditoria Auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Auditoria"
    ADD CONSTRAINT "Auditoria_pkey" PRIMARY KEY (id);


--
-- Name: CategoriaProducto CategoriaProducto_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CategoriaProducto"
    ADD CONSTRAINT "CategoriaProducto_nombre_key" UNIQUE (nombre);


--
-- Name: CategoriaProducto CategoriaProducto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CategoriaProducto"
    ADD CONSTRAINT "CategoriaProducto_pkey" PRIMARY KEY (id);


--
-- Name: Cita Cita_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Cita"
    ADD CONSTRAINT "Cita_pkey" PRIMARY KEY (id);


--
-- Name: Cliente Cliente_cedula_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Cliente"
    ADD CONSTRAINT "Cliente_cedula_key" UNIQUE (cedula);


--
-- Name: Cliente Cliente_correo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Cliente"
    ADD CONSTRAINT "Cliente_correo_key" UNIQUE (correo);


--
-- Name: Cliente Cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Cliente"
    ADD CONSTRAINT "Cliente_pkey" PRIMARY KEY (id);


--
-- Name: Cliente Cliente_ruc_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Cliente"
    ADD CONSTRAINT "Cliente_ruc_key" UNIQUE (ruc);


--
-- Name: Cliente Cliente_telefono_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Cliente"
    ADD CONSTRAINT "Cliente_telefono_key" UNIQUE (telefono);


--
-- Name: Compra Compra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Compra"
    ADD CONSTRAINT "Compra_pkey" PRIMARY KEY (id);


--
-- Name: DatosClinicosPaciente DatosClinicosPaciente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DatosClinicosPaciente"
    ADD CONSTRAINT "DatosClinicosPaciente_pkey" PRIMARY KEY (id);


--
-- Name: Descuento Descuento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Descuento"
    ADD CONSTRAINT "Descuento_pkey" PRIMARY KEY (id);


--
-- Name: DetalleCompra DetalleCompra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DetalleCompra"
    ADD CONSTRAINT "DetalleCompra_pkey" PRIMARY KEY (id);


--
-- Name: DetalleReceta DetalleReceta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DetalleReceta"
    ADD CONSTRAINT "DetalleReceta_pkey" PRIMARY KEY (id);


--
-- Name: DetalleVentaLote DetalleVentaLote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DetalleVentaLote"
    ADD CONSTRAINT "DetalleVentaLote_pkey" PRIMARY KEY (id);


--
-- Name: DetalleVenta DetalleVenta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DetalleVenta"
    ADD CONSTRAINT "DetalleVenta_pkey" PRIMARY KEY (id);


--
-- Name: DevolucionProveedor DevolucionProveedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DevolucionProveedor"
    ADD CONSTRAINT "DevolucionProveedor_pkey" PRIMARY KEY (id);


--
-- Name: Laboratorio Laboratorio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Laboratorio"
    ADD CONSTRAINT "Laboratorio_pkey" PRIMARY KEY (id);


--
-- Name: Lote Lote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Lote"
    ADD CONSTRAINT "Lote_pkey" PRIMARY KEY (id);


--
-- Name: MovimientoInventario MovimientoInventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MovimientoInventario"
    ADD CONSTRAINT "MovimientoInventario_pkey" PRIMARY KEY (id);


--
-- Name: PasswordResetRequest PasswordResetRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordResetRequest"
    ADD CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY (id);


--
-- Name: PasswordResetToken PasswordResetToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY (id);


--
-- Name: PasswordResetToken PasswordResetToken_tokenHash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_tokenHash_key" UNIQUE ("tokenHash");


--
-- Name: Producto Producto_codigoBarras_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Producto"
    ADD CONSTRAINT "Producto_codigoBarras_key" UNIQUE ("codigoBarras");


--
-- Name: Producto Producto_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Producto"
    ADD CONSTRAINT "Producto_nombre_key" UNIQUE (nombre);


--
-- Name: Producto Producto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Producto"
    ADD CONSTRAINT "Producto_pkey" PRIMARY KEY (id);


--
-- Name: ProveedorProducto ProveedorProducto_idProveedor_idProducto_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProveedorProducto"
    ADD CONSTRAINT "ProveedorProducto_idProveedor_idProducto_key" UNIQUE ("idProveedor", "idProducto");


--
-- Name: ProveedorProducto ProveedorProducto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProveedorProducto"
    ADD CONSTRAINT "ProveedorProducto_pkey" PRIMARY KEY (id);


--
-- Name: Proveedor Proveedor_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Proveedor"
    ADD CONSTRAINT "Proveedor_nombre_key" UNIQUE (nombre);


--
-- Name: Proveedor Proveedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Proveedor"
    ADD CONSTRAINT "Proveedor_pkey" PRIMARY KEY (id);


--
-- Name: Receta Receta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Receta"
    ADD CONSTRAINT "Receta_pkey" PRIMARY KEY (id);


--
-- Name: Rol Rol_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Rol"
    ADD CONSTRAINT "Rol_nombre_key" UNIQUE (nombre);


--
-- Name: Rol Rol_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Rol"
    ADD CONSTRAINT "Rol_pkey" PRIMARY KEY (id);


--
-- Name: ServicioPodologia ServicioPodologia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ServicioPodologia"
    ADD CONSTRAINT "ServicioPodologia_pkey" PRIMARY KEY (id);


--
-- Name: Usuario Usuario_correo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Usuario"
    ADD CONSTRAINT "Usuario_correo_key" UNIQUE (correo);


--
-- Name: Usuario Usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Usuario"
    ADD CONSTRAINT "Usuario_pkey" PRIMARY KEY (id);


--
-- Name: Venta Venta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Venta"
    ADD CONSTRAINT "Venta_pkey" PRIMARY KEY (id);


--
-- Name: account_userId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "account_userId_idx" ON neon_auth.account USING btree ("userId");


--
-- Name: invitation_email_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX invitation_email_idx ON neon_auth.invitation USING btree (email);


--
-- Name: invitation_organizationId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "invitation_organizationId_idx" ON neon_auth.invitation USING btree ("organizationId");


--
-- Name: member_organizationId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "member_organizationId_idx" ON neon_auth.member USING btree ("organizationId");


--
-- Name: member_userId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "member_userId_idx" ON neon_auth.member USING btree ("userId");


--
-- Name: organization_slug_uidx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE UNIQUE INDEX organization_slug_uidx ON neon_auth.organization USING btree (slug);


--
-- Name: session_userId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "session_userId_idx" ON neon_auth.session USING btree ("userId");


--
-- Name: verification_identifier_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX verification_identifier_idx ON neon_auth.verification USING btree (identifier);


--
-- Name: AtencionPodologica_idCita_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AtencionPodologica_idCita_key" ON public."AtencionPodologica" USING btree ("idCita");


--
-- Name: DatosClinicosPaciente_idCliente_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DatosClinicosPaciente_idCliente_key" ON public."DatosClinicosPaciente" USING btree ("idCliente");


--
-- Name: DetalleVentaLote_idDetalleVenta_idLote_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DetalleVentaLote_idDetalleVenta_idLote_key" ON public."DetalleVentaLote" USING btree ("idDetalleVenta", "idLote");


--
-- Name: DetalleVentaLote_idDetalleVenta_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DetalleVentaLote_idDetalleVenta_idx" ON public."DetalleVentaLote" USING btree ("idDetalleVenta");


--
-- Name: DetalleVentaLote_idLote_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DetalleVentaLote_idLote_idx" ON public."DetalleVentaLote" USING btree ("idLote");


--
-- Name: DevolucionProveedor_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DevolucionProveedor_idempotencyKey_key" ON public."DevolucionProveedor" USING btree ("idempotencyKey");


--
-- Name: Laboratorio_nombre_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Laboratorio_nombre_key" ON public."Laboratorio" USING btree (nombre);


--
-- Name: Lote_fechaVencimiento_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Lote_fechaVencimiento_idx" ON public."Lote" USING btree ("fechaVencimiento");


--
-- Name: Lote_idProducto_codigoLote_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Lote_idProducto_codigoLote_key" ON public."Lote" USING btree ("idProducto", "codigoLote");


--
-- Name: Lote_idProducto_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Lote_idProducto_idx" ON public."Lote" USING btree ("idProducto");


--
-- Name: MovimientoInventario_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MovimientoInventario_createdAt_idx" ON public."MovimientoInventario" USING btree ("createdAt");


--
-- Name: MovimientoInventario_idProducto_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MovimientoInventario_idProducto_idx" ON public."MovimientoInventario" USING btree ("idProducto");


--
-- Name: PasswordResetRequest_correo_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasswordResetRequest_correo_createdAt_idx" ON public."PasswordResetRequest" USING btree (correo, "createdAt");


--
-- Name: PasswordResetRequest_ip_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasswordResetRequest_ip_createdAt_idx" ON public."PasswordResetRequest" USING btree (ip, "createdAt");


--
-- Name: PasswordResetToken_correo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasswordResetToken_correo_idx" ON public."PasswordResetToken" USING btree (correo);


--
-- Name: PasswordResetToken_tokenHash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasswordResetToken_tokenHash_idx" ON public."PasswordResetToken" USING btree ("tokenHash");


--
-- Name: Proveedor_ruc_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Proveedor_ruc_key" ON public."Proveedor" USING btree (ruc);


--
-- Name: Receta_codigoReceta_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Receta_codigoReceta_key" ON public."Receta" USING btree ("codigoReceta");


--
-- Name: Receta_idAtencion_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Receta_idAtencion_key" ON public."Receta" USING btree ("idAtencion");


--
-- Name: ServicioPodologia_nombre_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ServicioPodologia_nombre_key" ON public."ServicioPodologia" USING btree (nombre);


--
-- Name: DetalleVenta tr_actualizar_stats_producto; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_actualizar_stats_producto AFTER INSERT ON public."DetalleVenta" FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_stats_producto();


--
-- Name: Cliente tr_audit_cliente; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_audit_cliente AFTER INSERT OR DELETE OR UPDATE ON public."Cliente" FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria_dml();


--
-- Name: Compra tr_audit_compra; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_audit_compra AFTER INSERT OR DELETE OR UPDATE ON public."Compra" FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria_dml();


--
-- Name: DetalleCompra tr_audit_detalle_compra; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_audit_detalle_compra AFTER INSERT OR DELETE OR UPDATE ON public."DetalleCompra" FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria_dml();


--
-- Name: DetalleVenta tr_audit_detalle_venta; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_audit_detalle_venta AFTER INSERT OR DELETE OR UPDATE ON public."DetalleVenta" FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria_dml();


--
-- Name: Producto tr_audit_producto; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_audit_producto AFTER INSERT OR DELETE OR UPDATE ON public."Producto" FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria_dml();


--
-- Name: Proveedor tr_audit_proveedor; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_audit_proveedor AFTER INSERT OR DELETE OR UPDATE ON public."Proveedor" FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria_dml();


--
-- Name: Usuario tr_audit_usuario; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_audit_usuario AFTER INSERT OR DELETE OR UPDATE ON public."Usuario" FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria_dml();


--
-- Name: Venta tr_audit_venta; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_audit_venta AFTER INSERT OR DELETE OR UPDATE ON public."Venta" FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria_dml();


--
-- Name: Producto tr_historial_precios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_historial_precios AFTER UPDATE ON public."Producto" FOR EACH ROW EXECUTE FUNCTION public.fn_historial_precios();


--
-- Name: DetalleVenta tr_rastrear_compras_cliente; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_rastrear_compras_cliente AFTER INSERT ON public."DetalleVenta" FOR EACH ROW EXECUTE FUNCTION public.fn_rastrear_compras_cliente();


--
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: invitation invitation_inviterId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: invitation invitation_organizationId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES neon_auth.organization(id) ON DELETE CASCADE;


--
-- Name: member member_organizationId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES neon_auth.organization(id) ON DELETE CASCADE;


--
-- Name: member member_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: session session_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: AtencionPodologica AtencionPodologica_idCita_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AtencionPodologica"
    ADD CONSTRAINT "AtencionPodologica_idCita_fkey" FOREIGN KEY ("idCita") REFERENCES public."Cita"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AtencionPodologica AtencionPodologica_idCliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AtencionPodologica"
    ADD CONSTRAINT "AtencionPodologica_idCliente_fkey" FOREIGN KEY ("idCliente") REFERENCES public."Cliente"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AtencionPodologica AtencionPodologica_idServicio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AtencionPodologica"
    ADD CONSTRAINT "AtencionPodologica_idServicio_fkey" FOREIGN KEY ("idServicio") REFERENCES public."ServicioPodologia"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AtencionPodologica AtencionPodologica_idUsuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AtencionPodologica"
    ADD CONSTRAINT "AtencionPodologica_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AuditoriaLog AuditoriaLog_idUsuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditoriaLog"
    ADD CONSTRAINT "AuditoriaLog_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Cita Cita_idCliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Cita"
    ADD CONSTRAINT "Cita_idCliente_fkey" FOREIGN KEY ("idCliente") REFERENCES public."Cliente"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Compra Compra_idProveedor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Compra"
    ADD CONSTRAINT "Compra_idProveedor_fkey" FOREIGN KEY ("idProveedor") REFERENCES public."Proveedor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Compra Compra_idUsuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Compra"
    ADD CONSTRAINT "Compra_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DatosClinicosPaciente DatosClinicosPaciente_idCliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DatosClinicosPaciente"
    ADD CONSTRAINT "DatosClinicosPaciente_idCliente_fkey" FOREIGN KEY ("idCliente") REFERENCES public."Cliente"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Descuento Descuento_idUsuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Descuento"
    ADD CONSTRAINT "Descuento_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DetalleCompra DetalleCompra_idCompra_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DetalleCompra"
    ADD CONSTRAINT "DetalleCompra_idCompra_fkey" FOREIGN KEY ("idCompra") REFERENCES public."Compra"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DetalleCompra DetalleCompra_idProducto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DetalleCompra"
    ADD CONSTRAINT "DetalleCompra_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES public."Producto"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DetalleReceta DetalleReceta_idProducto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DetalleReceta"
    ADD CONSTRAINT "DetalleReceta_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES public."Producto"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DetalleReceta DetalleReceta_idReceta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DetalleReceta"
    ADD CONSTRAINT "DetalleReceta_idReceta_fkey" FOREIGN KEY ("idReceta") REFERENCES public."Receta"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DetalleVentaLote DetalleVentaLote_idDetalleVenta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DetalleVentaLote"
    ADD CONSTRAINT "DetalleVentaLote_idDetalleVenta_fkey" FOREIGN KEY ("idDetalleVenta") REFERENCES public."DetalleVenta"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DetalleVentaLote DetalleVentaLote_idLote_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DetalleVentaLote"
    ADD CONSTRAINT "DetalleVentaLote_idLote_fkey" FOREIGN KEY ("idLote") REFERENCES public."Lote"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DetalleVenta DetalleVenta_idProducto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DetalleVenta"
    ADD CONSTRAINT "DetalleVenta_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES public."Producto"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DetalleVenta DetalleVenta_idVenta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DetalleVenta"
    ADD CONSTRAINT "DetalleVenta_idVenta_fkey" FOREIGN KEY ("idVenta") REFERENCES public."Venta"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DevolucionProveedor DevolucionProveedor_idLote_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DevolucionProveedor"
    ADD CONSTRAINT "DevolucionProveedor_idLote_fkey" FOREIGN KEY ("idLote") REFERENCES public."Lote"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DevolucionProveedor DevolucionProveedor_idMovimientoInventario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DevolucionProveedor"
    ADD CONSTRAINT "DevolucionProveedor_idMovimientoInventario_fkey" FOREIGN KEY ("idMovimientoInventario") REFERENCES public."MovimientoInventario"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DevolucionProveedor DevolucionProveedor_idProducto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DevolucionProveedor"
    ADD CONSTRAINT "DevolucionProveedor_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES public."Producto"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DevolucionProveedor DevolucionProveedor_idProveedor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DevolucionProveedor"
    ADD CONSTRAINT "DevolucionProveedor_idProveedor_fkey" FOREIGN KEY ("idProveedor") REFERENCES public."Proveedor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DevolucionProveedor DevolucionProveedor_idUsuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DevolucionProveedor"
    ADD CONSTRAINT "DevolucionProveedor_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Lote Lote_idDetalleCompra_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Lote"
    ADD CONSTRAINT "Lote_idDetalleCompra_fkey" FOREIGN KEY ("idDetalleCompra") REFERENCES public."DetalleCompra"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Lote Lote_idProducto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Lote"
    ADD CONSTRAINT "Lote_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES public."Producto"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MovimientoInventario MovimientoInventario_idLote_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MovimientoInventario"
    ADD CONSTRAINT "MovimientoInventario_idLote_fkey" FOREIGN KEY ("idLote") REFERENCES public."Lote"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MovimientoInventario MovimientoInventario_idProducto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MovimientoInventario"
    ADD CONSTRAINT "MovimientoInventario_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES public."Producto"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MovimientoInventario MovimientoInventario_idUsuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MovimientoInventario"
    ADD CONSTRAINT "MovimientoInventario_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Producto Producto_idCategoria_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Producto"
    ADD CONSTRAINT "Producto_idCategoria_fkey" FOREIGN KEY ("idCategoria") REFERENCES public."CategoriaProducto"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Producto Producto_idLaboratorio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Producto"
    ADD CONSTRAINT "Producto_idLaboratorio_fkey" FOREIGN KEY ("idLaboratorio") REFERENCES public."Laboratorio"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProveedorProducto ProveedorProducto_idProducto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProveedorProducto"
    ADD CONSTRAINT "ProveedorProducto_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES public."Producto"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProveedorProducto ProveedorProducto_idProveedor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProveedorProducto"
    ADD CONSTRAINT "ProveedorProducto_idProveedor_fkey" FOREIGN KEY ("idProveedor") REFERENCES public."Proveedor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Receta Receta_idAtencion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Receta"
    ADD CONSTRAINT "Receta_idAtencion_fkey" FOREIGN KEY ("idAtencion") REFERENCES public."AtencionPodologica"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Receta Receta_idCliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Receta"
    ADD CONSTRAINT "Receta_idCliente_fkey" FOREIGN KEY ("idCliente") REFERENCES public."Cliente"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Receta Receta_idUsuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Receta"
    ADD CONSTRAINT "Receta_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Usuario Usuario_idRol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Usuario"
    ADD CONSTRAINT "Usuario_idRol_fkey" FOREIGN KEY ("idRol") REFERENCES public."Rol"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Venta Venta_idCliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Venta"
    ADD CONSTRAINT "Venta_idCliente_fkey" FOREIGN KEY ("idCliente") REFERENCES public."Cliente"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Venta Venta_idDescuento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Venta"
    ADD CONSTRAINT "Venta_idDescuento_fkey" FOREIGN KEY ("idDescuento") REFERENCES public."Descuento"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Venta Venta_idUsuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Venta"
    ADD CONSTRAINT "Venta_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict inA0nAJ2BALCS8hkxfr16omuudh0oj92ae5RUbZYrdDnQBcoRYIEa8pJMZdP2FL

