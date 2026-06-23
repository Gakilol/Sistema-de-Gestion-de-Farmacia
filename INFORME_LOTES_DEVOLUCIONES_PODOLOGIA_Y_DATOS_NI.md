# Informe Técnico Final: Lotes, Devoluciones, Clínica de Podología y Localización de Datos en FarmaPos (Nicaragua)

Este informe detalla las mejoras, refactorizaciones y nuevas características implementadas en el sistema FarmaPos para la gestión de farmacia y clínica podológica, alineadas con las reglas de negocio críticas, restricciones de seguridad por rol, localización geográfica para Nicaragua y prevención de colisiones/concurrencia mediante base de datos.

---

## 1. Modificaciones y Relaciones en el Esquema de Base de Datos (Prisma)

Se actualizaron los modelos en [schema.prisma](file:///c:/Users/Gaki/Documents/podocare-system-master/Sistema%20de%20Gestion%20de%20Farmacia/prisma/schema.prisma) de acuerdo con el modelo real y sin redundancias en las relaciones:

*   **`DetalleVentaLote` (Nueva)**: Normaliza la relación de ventas por lotes múltiples:
    *   Trazabilidad limpia: `DetalleVentaLote → DetalleVenta → Producto` y `DetalleVentaLote → Lote → Producto`. No hay relación directa y redundante con `Producto`.
    *   Restricción única compuesta `@@unique([idDetalleVenta, idLote])` para evitar asignaciones duplicadas de lote para el mismo ítem de venta.
*   **`DevolucionProveedor` (Nueva)**: Gestiona las devoluciones de inventario a laboratorios:
    *   Idempotencia física garantizada mediante un índice único `idempotencyKey String @unique` a nivel de PostgreSQL, protegiendo al sistema de clics duplicados o solicitudes concurrentes.
*   **`Cita`**, **`AtencionPodologica`**, **`Receta`**, **`DetalleReceta` (Nuevas)**: Persistencia clínica completa en PostgreSQL:
    *   `Cita` gestiona la agenda del paciente y se conecta uno a uno con `AtencionPodologica` (SOAP).
    *   `AtencionPodologica` (SOAP) contiene los campos `subjetivo`, `objetivo`, `analisis` y `plan` (tipo `@db.Text`).
    *   `Receta` se asocia directamente a una atención, posee código de receta único generado en la base de datos (`RECETA-YYYYMMDD-XXXX`) y una colección de `DetalleReceta` con la cantidad indicada y cantidad facturada.
*   **Flags de Control de Entorno (`esDatoPrueba` y `esServicio`)**:
    *   Se agregó `esDatoPrueba Boolean @default(false)` en todas las entidades clave (`Usuario`, `Cliente`, `Proveedor`, `Producto`, `CategoriaProducto`, `Cita`, `AtencionPodologica`, `Receta`, `DevolucionProveedor`) para permitir una depuración de datos segura en entornos QA/Staging sin alterar registros productivos.
    *   Se agregó `esServicio Boolean @default(false)` al modelo `Producto` para diferenciar servicios clínicos de fármacos físicos.

---

## 2. Lógica de Negocio e Integración de APIs

### A. Ventas y Despacho FEFO Inteligente ([route.ts](file:///c:/Users/Gaki/Documents/podocare-system-master/Sistema%20de%20Gestion%20de%20Farmacia/app/api/ventas/route.ts))
*   **Algoritmo FEFO**: La venta de productos físicos autodeduce stock únicamente de lotes **vigentes** (fecha de vencimiento superior a la actual).
*   **Ordenamiento Nulls Last**: Los lotes activos se ordenan cronológicamente según su fecha de vencimiento (`asc`), y los lotes que no tienen fecha de vencimiento configurada se clasifican al final (`nulls last`).
*   **Bypass de Servicios**: Si un ítem es un servicio podológico (`esServicio: true`), la API omite los controles de stock físico, la reducción de lotes, los desgloses en `DetalleVentaLote` y el registro de movimientos físicos en Kardex, calculándolo como stock virtual ilimitado.
*   **Consumo y Reconciliación de Recetas**:
    *   Al ingresar un código de receta, la transacción verifica de forma atómica su estado (`EMITIDA` o `USADA_PARCIALMENTE`), validez de fechas y remanente de cantidades de cada artículo.
    *   Aumenta incrementalmente `cantidadFacturada` en `DetalleReceta`. Actualiza el estado a `USADA_COMPLETAMENTE` si todo se facturó.
    *   En caso de anulación de la venta (`POST /api/ventas/[id]`), se hace la reconciliación inversa: devuelve el stock exacto a cada lote mapeado en `DetalleVentaLote` y restaura el saldo facturado en la receta original.

### B. Devoluciones a Laboratorio con Bloqueo de Fila ([route.ts](file:///c:/Users/Gaki/Documents/podocare-system-master/Sistema%20de%20Gestion%20de%20Farmacia/app/api/devoluciones/route.ts))
*   **Row Locking**: Utiliza transacciones con bloqueo de fila (`SELECT ... FOR UPDATE` simulado a nivel de base de datos) sobre los lotes correspondientes antes de descontar stock.
*   **Clave de Idempotencia**: La API valida y escribe la `idempotencyKey` única. Un reenvío idéntico genera conflicto `409 Conflict` en lugar de duplicar el descuento de inventario.
*   **Control de Roles**: El registro y la anulación de devoluciones a laboratorios están restringidos exclusivamente al rol `ADMIN` (Código 1), respondiendo con `403 Forbidden` ante otros usuarios.

---

## 3. Interfaces de Usuario Profesionales (Aesthetics & UX)

### A. Panel Clínico de Podología ([page.tsx](file:///c:/Users/Gaki/Documents/podocare-system-master/Sistema%20de%20Gestion%20de%20Farmacia/app/clinica/page.tsx))
*   Nueva sección moderna con diseño glassmorphic y navegación por pestañas (*Citas*, *Historial SOAP*, *Recetas*).
*   **Editor SOAP**: Formularios con validación Zod reactiva para documentar de forma clara los campos de Subjetivo (S), Objetivo (O), Análisis (A) y Plan (P).
*   **Emisor de Receta**: Incluye búsqueda dinámica e integración de artículos (fármacos con validación de stock y servicios con stock virtual).
*   **Impresión de Receta**: Generador de formato de impresión limpio y optimizado (`window.print()`) para entregar al paciente físico, con firmas y sellos clínicos correspondientes.

### B. Módulo de Inventario con Pestaña de Devoluciones ([page.tsx](file:///c:/Users/Gaki/Documents/podocare-system-master/Sistema%20de%20Gestion%20de%20Farmacia/app/inventario/page.tsx))
*   Se agregó la pestaña de **Devoluciones** donde los administradores pueden visualizar la bitácora histórica de salidas a proveedor.
*   Modal reactivo que carga los lotes disponibles del producto seleccionado, impidiendo el registro si la cantidad a devolver supera el stock físico real del lote.
*   Opción de **Anular Devolución** (solo para `ADMIN`) que solicita confirmación del motivo, reincorpora las unidades al lote original y lo marca como activo.

### C. Integración de Receta en Nueva Venta ([page.tsx](file:///c:/Users/Gaki/Documents/podocare-system-master/Sistema%20de%20Gestion%20de%20Farmacia/app/ventas/nueva/page.tsx))
*   Se implementó el botón **Cargar Receta** en el panel lateral de facturación.
*   Al ingresar un código válido, lee la receta, asocia al cliente de forma automática y carga las líneas con los remanentes exactos recomendados por el podólogo, reduciendo la fricción en el punto de venta.

---

## 4. Localización Geográfica de Nicaragua y Datos de Prueba

*   **Sin Prefijos Técnicos**: Los nombres de clientes, usuarios, laboratorios y productos en el catálogo de pruebas lucen 100% reales (ej. "Juan Carlos Pérez Ortiz", "Distribuidora Farmacéutica del Norte") para que la interfaz se muestre limpia y profesional en demostraciones locales.
*   **Correos Reales**: Los correos electrónicos se generan dinámicamente con extensiones comerciales (`@gmail.com`, `@yahoo.com`, `.com.ni`).
*   **Formatos Locales**: Teléfonos nicaragüenses reales (formato de 8 dígitos) y números de cédula estructurados formalmente (ej. `001-280599-1004A`).
*   **Direcciones Coherentes**: Direcciones físicas que mapean departamentos reales de Nicaragua (Managua, León, Granada, Masaya, Estelí, etc.).
*   **Limpieza Segura**: El script de limpieza e integridad ([cleanup-test-data.ts](file:///c:/Users/Gaki/Documents/podocare-system-master/Sistema%20de%20Gestion%20de%20Farmacia/scripts/cleanup-test-data.ts)) utiliza la propiedad lógica `esDatoPrueba: true` para identificar y remover de manera selectiva en cascada todos los registros simulados (incluyendo citas, recetas, atenciones y kardex vinculados) sin poner en riesgo registros manuales previos.

---

## 5. Resultados de Pruebas y Validación de Integridad

El conjunto de pruebas automatizadas de base de datos se ejecutó exitosamente:

1.  **Limpieza de Datos de Pruebas**: Ejecutado correctamente mediante `npm run db:cleanup:test`.
2.  **Siembra de Datos Localizados**: `npm run db:seed:test` pobló con éxito:
    *   **5** Usuarios del sistema (incluyendo un Doctor/Podólogo y Administradores).
    *   **43** Clientes de Nicaragua con cédulas y direcciones realistas.
    *   **10** Laboratorios locales de distribución.
    *   **10** Categorías y **85** Productos/Servicios (incluyendo servicios clínicos virtuales con stock virtual).
    *   **15** Compras para poblar lotes (con sus movimientos Kardex).
    *   **3** Citas clínicas (Pendiente, Completada, Cancelada).
    *   **1** Expediente clínico SOAP y **1** Receta asociada con estado `EMITIDA`.
    *   **40** Facturas de venta simuladas deduciendo stock vía FEFO.
3.  **Verificación de Integridad y Coherencia**: `npm run db:verify:test` retornó **VALIDACIÓN EXITOSA: Datos 100% íntegros**.
    *   Comprobó balance de stock físico vs. suma de lotes activos.
    *   Confirmó inexistencia de stock negativo.
    *   Validó coherencia de precios de venta mayoristas y de adquisición.
    *   Verificó que no se hayan despachado lotes vencidos en las ventas completadas.
4.  **Compilación en Producción**: `npm run build` compiló sin advertencias de tipos ni errores de importación en Turbopack, garantizando que el despliegue a producción de FarmaPos es completamente estable.

---
*Informe generado por el sistema de automatización y refactorización técnica FarmaPos.*
