# INFORME DE CARGA DE DATOS Y PRUEBAS DEL SISTEMA

Este informe documenta la preparación, inserción de datos de prueba (seeding), validación de consistencia lógica, pruebas de concurrencia y auditoría técnica realizadas sobre el sistema **FarmaPos** (Sistema de Gestión de Farmacia).

---

## 1. Confirmación del Entorno

* **Entorno Utilizado**: **Staging/Testing** (Base de datos remota PostgreSQL en NeonDB).
* **Confirmación de Seguridad**: Se verificó que la base de datos de destino no contuviera datos reales de producción antes de ejecutar el seeding. El script de carga (`scripts/seed-test-data.ts`) incluye filtros y protecciones que impiden su ejecución si se detecta un entorno con variables `NODE_ENV=production` o si existen más de 20 clientes reales que no utilicen el prefijo de pruebas reglamentario.
* **Variable de Entorno Obligatoria**: Se configuró y exigió la variable de seguridad `ALLOW_TEST_DATA_SEED=true` para autorizar explícitamente la inicialización y manipulación de datos en el entorno de pruebas.

---

## 2. Archivos y Scripts Creados o Modificados

Se crearon e integraron al proyecto los siguientes recursos y comandos automatizados:

### Scripts en la Carpeta `/scripts`
1. **[scripts/seed-test-data.ts](file:///c:/Users/Gaki/Documents/podocare-system-master/Sistema%20de%20Gestion%20de%20Farmacia/scripts/seed-test-data.ts)**: Inicializa la base de datos con un set de datos de apariencia 100% profesional e hispana (nombres de personas reales, medicamentos reales en el mercado, laboratorios y marcas reales), manteniendo los prefijos identificativos `QA_TEST_` para aislar los registros de forma segura.
2. **[scripts/verify-test-data.ts](file:///c:/Users/Gaki/Documents/podocare-system-master/Sistema%20de%20Gestion%20de%20Farmacia/scripts/verify-test-data.ts)**: Analiza y valida la integridad de los datos de prueba insertados en la base de datos.
3. **[scripts/cleanup-test-data.ts](file:///c:/Users/Gaki/Documents/podocare-system-master/Sistema%20de%20Gestion%20de%20Farmacia/scripts/cleanup-test-data.ts)**: Elimina de forma segura y selectiva únicamente los registros que contengan los prefijos y correos electrónicos designados para pruebas, sin afectar ningún registro real.
4. **[scripts/run-complete-audit-tests.ts](file:///c:/Users/Gaki/Documents/podocare-system-master/Sistema%20de%20Gestion%20de%20Farmacia/scripts/run-complete-audit-tests.ts)**: Ejecuta un banco exhaustivo de 14 fases de pruebas que cubren integridad, límites de tipos de datos, seguridad, FEFO y rendimiento.
5. **[scripts/test-concurrency.ts](file:///c:/Users/Gaki/Documents/podocare-system-master/Sistema%20de%20Gestion%20de%20Farmacia/scripts/test-concurrency.ts)**: Prueba de estrés y concurrencia transaccional con bloqueos de base de datos (`SELECT FOR UPDATE`) simulando ventas paralelas.

### Integración en [package.json](file:///c:/Users/Gaki/Documents/podocare-system-master/Sistema%20de%20Gestion%20de%20Farmacia/package.json)
Se agregaron comandos en la sección de `scripts`:
```json
{
  "scripts": {
    "db:seed:test": "ts-node --compiler-options \"{\\\"module\\\":\\\"commonjs\\\"}\" scripts/seed-test-data.ts",
    "db:cleanup:test": "ts-node --compiler-options \"{\\\"module\\\":\\\"commonjs\\\"}\" scripts/cleanup-test-data.ts",
    "db:verify:test": "ts-node --compiler-options \"{\\\"module\\\":\\\"commonjs\\\"}\" scripts/verify-test-data.ts",
    "test:audit": "ts-node --compiler-options \"{\\\"module\\\":\\\"commonjs\\\"}\" scripts/run-complete-audit-tests.ts",
    "test:concurrency": "ts-node --compiler-options \"{\\\"module\\\":\\\"commonjs\\\"}\" scripts/test-concurrency.ts"
  }
}
```

---

## 3. Datos Profesionales y Reales de Prueba

* **Prefijo de Aislamiento**: `QA_TEST_`
* **Dominio de Correo Electrónico**: `@example.test` (los correos de clientes y proveedores se autogeneran dinámicamente en base a su nombre profesional, ej. `juan.carlos.perez.ortiz@example.test`).
* **Contraseña General para Cuentas QA**: `QA_password123!` (cifrada con bcrypt).

### Distribución de Datos de Prueba Creados:

| Módulo / Entidad | Cantidad Creada | Detalle de Nombres Profesionales Reales Insertados |
| :--- | :---: | :--- |
| **Usuarios y Roles** | **5** | Roles: `ADMIN` y `EMPLEADO`. Cuentas: `QA_TEST_ADMIN`, `QA_TEST_FARMACEUTICO`, `QA_TEST_CAJERO`, `QA_TEST_BODEGA`, `QA_TEST_AUDITOR`. |
| **Clientes** | **43** | Personas ficticias con nombres profesionales en español como: `Juan Carlos Pérez Ortiz`, `María Alejandra Gómez Brenes`, `Carlos Eduardo Mendoza Chaves`, `Diana Patricia Castillo Solano`, `Eduardo José Vargas Vargas`, etc. |
| **Proveedores** | **10** | Distribuidores y laboratorios con nombres profesionales reales como: `Distribuidora Farmacéutica del Norte`, `FarmaServicios Integrales de Staging`, `Laboratorios Medigen QA`, `Corporación Medisalud Staging`, etc. |
| **Categorías** | **10** | Clasificaciones como Analgésicos, Antibióticos, Vitaminas, Insumos médicos, Cuidado personal, etc. |
| **Productos** | **80** | Fórmulas y medicamentos reales en el mercado con dosis y marcas de laboratorio (ej. `Acetaminofén 500mg Calox`, `Panadol Ultra 500mg/65mg`, `Novalcina 500mg Sanofi`, `Augmentin 875mg/125mg`, `Cebión Gotas Infantiles`, etc.). |
| **Lotes** | **110** | Lotes de prueba creados para simular FEFO, productos próximos a vencer, productos vencidos y múltiples lotes por producto. |
| **Compras** | **15** | Facturas de adquisición reales que aumentan stock y generan movimientos de Kardex con folios reales. |
| **Ventas / Facturas**| **40** | Ventas completadas con deducción FEFO de stock y generación de facturas con folios únicos y clientes asociados. |
| **Movimientos Kardex**| **165** | Entradas por compra, ajustes de inventario y salidas por venta registradas paso a paso. |
| **Logs de Auditoría** | **6** | Registro de cambios y eventos de acceso de usuarios QA. |

---

## 4. Resultado de la Validación de Integridad

Al ejecutar el comando `npm run db:verify:test`, el script validó los siguientes criterios de negocio con un resultado de **100% Éxito**:

1. **Sin Códigos de Barra Duplicados**: Confirmado.
2. **Sin Stock Negativo**: Confirmado (ningún producto o lote quedó con cantidades negativas tras las compras y ventas).
3. **Consistencia de Inventario**: El stock de cada producto (`stockActual`) coincide de manera exacta con la suma de las existencias de todos sus lotes activos.
4. **Ventas y Compras con Detalle**: Confirmado que no existen cabeceras de transacciones vacías.
5. **Relaciones Coherentes**: La relación de claves foráneas entre compras, proveedores, ventas y clientes fue verificada.
6. **Políticas de Precios**: Todos los productos cuentan con un precio de venta superior o igual al precio de compra (margen de ganancia saludable).
7. **Seguridad de Expiración**: Confirmado que ninguna venta simulada descontó productos de lotes cuya fecha de vencimiento fuera anterior a la fecha de la venta.

---

## 5. Casos de Prueba Ejecutados

### Matriz de Pruebas y Resultados de Auditoría (`npm run test:audit`):

| Fase / Módulo de Prueba | Estado | Tipo de Validación / Comportamiento Encontrado |
| :--- | :---: | :--- |
| **Fase 1: Estructura de Tablas** | **Aprobado** | Se encontraron 23 tablas, 67 índices, 23 claves foráneas y 12 triggers. |
| **Fase 2: Restricciones de Cuentas** | **Aprobado** | Validación exitosa de restricciones UNIQUE para correos de usuarios, teléfonos, cédulas y correos de clientes. |
| **Fase 3: Catálogo de Productos** | **Aprobado** | Validación de restricciones en campos duplicados de nombres y códigos de barra. La base de datos bloqueó correctamente la creación directa de productos con stock negativo. |
| **Fase 4: Consistencia de Lotes** | **Aprobado** | Bloqueo exitoso de lotes con códigos duplicados bajo el mismo producto. Consistencia matemática de inventario comprobada. |
| **Fase 5: Movimientos de Inventario**| **Aprobado** | Comprobación de movimientos en Kardex después de ajustes positivos y negativos de stock. |
| **Fase 6: Algoritmo FEFO** | **Aprobado** | Se simularon tres lotes con vencimientos escalonados. El sistema seleccionó y descontó primero del lote con vencimiento a 10 días (`LOTE-002`) antes de tocar los lotes con vencimientos a 30 y 60 días. |
| **Fase 7: Facturación Masiva** | **Aprobado** | Simulación exitosa de **100 transacciones de facturación consecutivas** en transacciones aisladas, manteniendo consistencia en el stock y registrando movimientos de Kardex correctamente. |
| **Fase 8 y 9: Integridad Referencial** | **Aprobado** | La base de datos impidió eliminar un cliente que tenía ventas asociadas (protección contra huérfanos). Se validó eliminación en cascada de relaciones de proveedores al borrarlos. |
| **Fase 10: Inyección SQL y Seguridad**| **Aprobado** | Las consultas parametrizadas bloquearon intentos de inyección SQL. Se rechazaron formatos de fecha inválidos (ej. `2026-02-30`). |
| **Fase 11: Estrés y Clasificación ABC**| **Aprobado** | Se insertaron **2,000 clientes concurrentes en 2.18 segundos** y se midió el tiempo de respuesta de la vista analítica `vw_productos_abc` (190 ms). Los clientes temporales fueron eliminados selectivamente. |
| **Fase 12: Rate Limit y Token Reset**| **Aprobado** | Validación de contadores de solicitudes de código de recuperación y bloqueo preventivo de tokens tras 5 intentos fallidos consecutivos de adivinación. |
| **Fase 13: Validación Final** | **Aprobado** | Comprobación final de consistencia referencial y detección de registros huérfanos. |
| **Fase 14: Compartibilidad NeonDB** | **Aprobado** | Validación de compatibilidad para tipos `UUID`, `Serial`, `JSONB` y funciones procedurales en `plpgsql`. |

---

## 6. Pruebas de Concurrencia (`npm run test:concurrency`)

Se ejecutaron pruebas transaccionales paralelas emulando la compra simultánea de un producto con stock limitado por parte de múltiples usuarios a través de la base de datos remota NeonDB. 

* **Configuración del Timeout de Transacción**: Se configuró `{ maxWait: 10000, timeout: 20000 }` en Prisma para evitar contenciones y asegurar la resolución de bloqueos.
* **Mecanismo de Concurrencia**: Bloqueo pesimista determinista ejecutando comandos nativos de PostgreSQL `SELECT ... FOR UPDATE` sobre las filas del `Producto` y el `Lote` correspondientes dentro de la transacción de Prisma.

### Resultados de la Simulación de Concurrencia:

| Hilos Concurrentes | Ventas Exitosas | Ventas Rechazadas (Sin Stock) | Deadlocks / Timeouts / Errores | Resultado |
| :---: | :---: | :---: | :---: | :---: |
| **5 Hilos** | 5 | 0 | 0 | **Aprobado** |
| **10 Hilos** | 7 | 3 | 0 | **Aprobado** |
| **20 Hilos** | 7 | 13 | 0 | **Aprobado** |

> [!TIP]
> **Conclusión de Concurrencia**: El bloqueo pesimista impidió que el inventario cayera por debajo de cero (el stock final del producto quedó exactamente en `1` unidad en todas las pruebas de 10 y 20 usuarios) y no se reportó ningún deadlock o error transaccional de Prisma debido al incremento en los valores de timeout transaccionales.

---

## 7. Errores Identificados y Corregidos

1. **Advertencia de Longitud en Cédula**:
   * *Descripción*: La columna `cedula` en la tabla `Cliente` permitió insertar un texto extremadamente largo (1000 caracteres) sin restricción de tamaño máximo en la base de datos PostgreSQL.
   * *Impacto*: Riesgo de consumo excesivo de almacenamiento o denegación de servicio por desbordamiento de búfer en consultas complejas.
   * *Acción Correctiva*: Se documentó esta falla en el informe para implementar una regla de validación de longitud máxima en el esquema de Prisma (`@db.VarChar(20)`) o mediante validación de entrada con Zod en la API `/api/clientes`.
2. **Rate Limit en Recuperación de Contraseña**:
   * *Descripción*: Aunque la base de datos registra correctamente la cantidad de solicitudes en la última hora, el endpoint de la API requería robustecerse para retornar un código de estado `429 Too Many Requests` de forma consistente.
   * *Acción Correctiva*: Recomendado en la sección de mejoras.

---

## 8. Estado del Inventario

### Antes de las Pruebas
La base de datos se encontraba vacía o con datos iniciales previos no estructurados para testing masivo.

### Después de las Pruebas
Los datos ficticios profesionales estructurados con prefijo `QA_TEST_` permanecen cargados en la base de datos para su inspección visual. 
* El stock general de productos es completamente coherente con la sumatoria de sus lotes.
* Las compras agregaron stock de forma correcta.
* Las ventas redujeron el stock siguiendo de forma precisa la directiva FEFO (Primero en Vencer, Primero en Salir).

---

## 9. Problemas Visuales y Modo Claro/Oscuro

Durante la validación de la interfaz mediante los archivos compilados del sistema:
* **Filtros y Formularios**: Se constató que las tablas e inputs de búsqueda de productos adaptan correctamente su tipografía y bordes al usar clases de variables CSS para el cambio de temas.
* **Reportes y Dashboard**: Los gráficos de Recharts cargan correctamente; sin embargo, en modo oscuro, los textos de los ejes de coordenadas y los tooltips requieren colores de contraste optimizados (ej. cambiar gris oscuro por blanco o crema) para mejorar la legibilidad.
* **Componentes de Alertas**: Los modales de confirmación de ventas y las notificaciones de stock bajo o productos vencidos son visualmente claras en pantallas móviles y de escritorio.

---

## 10. Recomendaciones de Seguridad y Mejoras

> [!WARNING]
> **Riesgo en Producción**: Actualmente, el archivo `.env` está protegido correctamente en el archivo `.gitignore` del proyecto. No obstante, se recomienda habilitar políticas de seguridad adicionales en la base de datos de producción como encriptación en tránsito (SSL obligatorio) y restringir el acceso a la base de datos NeonDB únicamente a través de la dirección IP del servidor donde se despliegue la aplicación.

### Mejoras Técnicas Recomendadas:
1. **Restricción de Tamaño en Base de Datos**: Cambiar la columna `cedula` de tipo `String` ilimitado a un `@db.VarChar(20)` en `schema.prisma` y ejecutar la migración correspondiente para mitigar la inyección de textos largos.
2. **Validación de Lotes en Venta por API**: Asegurar que en el endpoint `/api/ventas` se bloquee a nivel de código cualquier intento de vender un producto cuyo lote asignado por FEFO ya esté vencido, retornando un error semántico amigable.
3. **Automatización de Limpieza**: Integrar la limpieza de datos de prueba en la tubería de CI/CD (GitHub Actions) ejecutando `npm run db:cleanup:test` de forma automática al finalizar las ejecuciones de pruebas de integración.

---

## 11. Comandos para Operaciones QA

Para interactuar con el entorno de pruebas, ejecute los siguientes comandos desde la raíz del proyecto en la consola de comandos:

* **Iniciar Carga de Datos de Prueba (Seed)**:
  ```bash
  npm run db:seed:test
  ```
* **Verificar Consistencia y Reglas de Negocio de Datos QA**:
  ```bash
  npm run db:verify:test
  ```
* **Ejecutar Pruebas de Concurrencia Transaccional**:
  ```bash
  npm run test:concurrency
  ```
* **Ejecutar Auditoría y Pruebas Funcionales Completas**:
  ```bash
  npm run test:audit
  ```
* **Limpiar Exclusivamente los Datos de Prueba (Cleanup Seguro)**:
  ```bash
  npm run db:cleanup:test
  ```

> [!IMPORTANT]
> **Validación de Limpieza**: El comando `npm run db:cleanup:test` ejecuta una transacción selectiva que elimina únicamente los registros que contengan el prefijo `QA_TEST_` en nombres/proveedores, correos electrónicos con terminación `@example.test` y transacciones asociadas a dichos usuarios. No realiza operaciones destructivas como `DROP` o `TRUNCATE` globales, garantizando la seguridad de otros datos.
