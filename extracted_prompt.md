<USER_REQUEST>
# Solicitud de implementación: Separación de Servicios en Compras + Módulo completo de Podología Clínica

Necesito que revises, corrijas e implementes estas mejoras en el sistema de farmacia y clínica. Antes de modificar código, analiza la estructura actual del proyecto, el esquema de base de datos, los roles, las rutas, componentes, servicios/API y dependencias existentes. Mantén compatibilidad con la arquitectura actual, PostgreSQL/NeonDB, autenticación, auditoría, modo claro/oscuro y despliegue en Vercel.

No inventes funcionalidades desconectadas del sistema actual: integra todo correctamente con los módulos existentes de clientes/pacientes, usuarios, ventas, inventario, reportes y auditoría.

---

# OBJETIVO GENERAL

1. Evitar que los servicios aparezcan en el apartado de compras.
2. Crear un módulo real y completo de Podología Clínica.
3. Crear reportes exclusivos de podología.
4. Crear un dashboard independiente para la clínica/podología.
5. Restringir el acceso a podología únicamente a los roles `ADMIN` y `DOCTOR`.
6. Mejorar la información clínica disponible en podología, ya que actualmente la IA o el sistema no muestra suficiente información de la parte clínica/podológica.
7. Mantener trazabilidad mediante auditoría para todas las acciones importantes.

---

# PARTE 1 — CORRECCIÓN: LOS SERVICIOS NO DEBEN APARECER EN COMPRAS

Actualmente los servicios están apareciendo en el módulo de compras, lo cual es incorrecto.

## Reglas de negocio obligatorias

- Un servicio NO es inventariable.
- Un servicio NO tiene lote.
- Un servicio NO tiene fecha de vencimiento.
- Un servicio NO tiene proveedor obligatorio.
- Un servicio NO debe aumentar stock.
- Un servicio NO debe poder agregarse a una orden, factura o registro de compra.
- Un servicio NO debe aparecer en:
  - listado de productos comprables;
  - buscador de compras;
  - formulario de nueva compra;
  - detalle de compra;
  - historial de compras;
  - reportes de compras;
  - filtros de inventario;
  - alertas 
<truncated 16660 bytes>

Instrucciones para ejecutar migraciones.
Instrucciones para probar el módulo de podología.
Actualización del README con:
módulo de farmacia;
módulo de compras;
inventario;
ventas;
auditoría;
podología clínica;
dashboard clínico;
reportes de podología;
roles y permisos;
configuración local;
pruebas.
CRITERIOS DE ACEPTACIÓN

La implementación se considera terminada únicamente cuando:

Los servicios ya no aparecen ni pueden registrarse en compras.
Los productos físicos continúan funcionando correctamente en compras e inventario.
Existe un módulo completo de Podología Clínica.
Solo ADMIN y DOCTOR pueden acceder a podología.
Existe historial clínico por paciente.
Se pueden registrar consultas, diagnósticos, tratamientos y evoluciones.
Los productos usados en consultas descuentan inventario correctamente.
Existe un dashboard clínico independiente.
Existen reportes exclusivos de podología.
Los reportes se pueden filtrar y exportar.
La IA recibe contexto clínico suficiente y seguro.
La IA no inventa información ni reemplaza el criterio médico.
Todas las acciones relevantes quedan registradas en auditoría.
El sistema funciona en modo claro y oscuro.
No se rompen los módulos existentes.
Se incluyen pruebas automatizadas y datos de prueba realistas.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-06-24T22:54:38-06:00.

The user's current state is as follows:
Active Document: c:\Users\Gaki\Documents\podocare-system-master\Sistema de Gestion de Farmacia\app\admin\descuentos\page.tsx (LANGUAGE_TSX)
Cursor is on line: 1
Other open documents:
- c:\Users\Gaki\Documents\podocare-system-master\Sistema de Gestion de Farmacia\app\admin\descuentos\page.tsx (LANGUAGE_TSX)
</ADDITIONAL_METADATA>
<USER_SETTINGS_CHANGE>
The user changed setting `Model Selection` from None to Claude Sonnet 4.6 (Thinking). No need to comment on this change if the user doesn't ask about it. If reporting what model you are, please use a human readable name instead of the exact string.
</USER_SETTINGS_CHANGE>