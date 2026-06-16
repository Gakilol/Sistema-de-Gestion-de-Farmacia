# UNIVERSIDAD NACIONAL DE INGENIERÍA (UNI)
### FACULTAD DE ELECTROTECNIA Y COMPUTACIÓN (FEC)
### INGENIERÍA DE SISTEMAS

---

# INFORME TÉCNICO Y DISEÑO DE ARQUITECTURA DE DATOS
## Proyecto de Fin de Curso: Sistema de Gestión de Farmacia y Clínica de Podología (Podocare)
**Clínica del Pie — Managua / Ciudad Sandino**

**Autores:**
* Justin Flores
* Kevin Gabriel Duarte
* Ariel Escoto

**Tutor:**
* Ing. Euclides Ramírez

**Fecha:** Junio de 2026  
**Managua, Nicaragua**

---

## ÍNDICE DE CONTENIDOS
1. [Introducción y Objetivos](#1-introducción-y-objetivos)
2. [Justificación de la Migración Tecnológica](#2-justificación-de-la-migración-tecnológica)
3. [Modelado de Datos Completo (MER, MR, MOO)](#3-modelado-de-datos-completo-mer-mr-moo)
4. [Diccionario de Datos Extendido (DED)](#4-diccionario-de-datos-extendido-ded)
5. [Capa Servidor: Tablespaces, pgAgent y Triggers](#5-capa-servidor-tablespaces-pgagent-y-triggers)
6. [Cumplimiento de la Normativa 004 del MINSA](#6-cumplimiento-de-la-normativa-004-del-minsa)
7. [Conclusiones y Recomendaciones](#7-conclusiones-y-recomendaciones)

---

## 1. INTRODUCCIÓN Y OBJETIVOS

### 1.1 Introducción
El presente informe detalla el diseño de la arquitectura de base de datos del **Sistema de Gestión de Farmacia y Clínica de Podología (Podocare)**, anteriormente denominado *ClinicPos*. Este sistema fue diseñado específicamente para la empresa **"Clínica del Pie"**, ubicada en Managua/Ciudad Sandino, respondiendo a la necesidad crítica de controlar sus flujos de inventarios farmacéuticos y el registro de consultas clínicas y recetas de pacientes en un único ecosistema integrado.

### 1.2 Objetivos
* **Objetivo General:** Desarrollar e implementar una arquitectura de base de datos relacional robusta en PostgreSQL que centralice la gestión de inventario, compras, facturación y el registro clínico de consultas de podología, garantizando la inalterabilidad e integridad de los datos.
* **Objetivos Específicos:**
  1. Diseñar el modelo conceptual (MER), lógico (MR) y físico orientado a objetos (MOO) de la base de datos con relaciones íntegras.
  2. Implementar disparadores (triggers) y procedimientos almacenados que automaticen las reglas del negocio.
  3. Establecer políticas de resiliencia de datos mediante copias de seguridad automatizadas con pgAgent.
  4. Garantizar el cumplimiento legal con la Normativa 004 del Ministerio de Salud (MINSA) de Nicaragua.

---

## 2. JUSTIFICACIÓN DE LA MIGRACIÓN TECNOLÓGICA
La Clínica del Pie operaba históricamente mediante controles manuales basados en hojas de cálculo de Microsoft Excel. Esta aproximación acarreaba graves deficiencias:
1. **Descuadre y Pérdida de Inventario:** Excel carece de mecanismos de control transaccional simultáneo, permitiendo que varios usuarios editen el mismo archivo a la vez sin validaciones lógicas, lo que provocaba inconsistencias insalvables en el stock de medicamentos.
2. **Caídas de Datos Operativos:** El almacenamiento en archivos planos es propenso a corromperse ante pérdidas de alimentación eléctrica o fallos del sistema operativo en el servidor local.
3. **Pérdida del Historial Financiero y de Precios:** Los costos de compra y venta se modificaban sobreescribiendo el registro anterior, imposibilitando calcular el Costo de Ventas (COGS) histórico o realizar auditorías retroactivas.

La migración a **PostgreSQL** y **Prisma ORM** proporciona transacciones con propiedades **ACID (Atomicidad, Consistencia, Aislamiento, Durabilidad)**, asegurando la inmutabilidad de los registros ante cortes eléctricos y una estructura relacional auditable.

---

## 3. MODELADO DE DATOS COMPLETO (MER, MR, MOO)

### 3.1 Modelo Entidad-Relación Conceptual (MER - Chen)
El modelo conceptual representa el dominio del negocio a través de Entidades (rectángulos), Relaciones (rombos) y Atributos (óvalos), expresando las cardinalidades y asociaciones sin restricciones de implementación física.

![Modelo Entidad-Relación Conceptual (MER)](./modelo_entidad_relacion_conceptual.png)

---

### 3.2 Modelo Relacional Lógico (MR - Crow's Foot)
El modelo relacional detalla la implementación lógica en tablas con tipos de datos concretos, llaves primarias (`PK`), llaves foráneas (`FK`), valores por defecto y relaciones cardinales en formato de patas de gallo.

![Modelo Relacional (MR)](./modelo_relacional.png)

---

### 3.3 Modelo Orientado a Objetos (MOO - Diagrama de Clases UML)
Muestra el mapeo objeto-relacional (ORM) implementado en la capa de persistencia del backend, detallando atributos de clase, métodos CRUD y las operaciones automatizadas por los triggers en base de datos representadas como clases.

![Modelo Orientado a Objetos (MOO)](./modelo_orientado_objetos.png)

---

### 3.4 Esquema Lógico Relacional (Matemático)
* **Rol** (<u>id</u> [PK], nombre [UQ])
* **Usuario** (<u>id</u> [PK], nombreCompleto, correo [UQ], passwordHash, idRol [FK $\rightarrow$ Rol(id)], activo, createdAt, updatedAt)
* **Cliente** (<u>id</u> [PK], nombreCompleto, telefono [UQ], correo [UQ], cedula [UQ], ruc [UQ], direccion, activo, createdAt, updatedAt)
* **CategoriaProducto** (<u>id</u> [PK], nombre [UQ], descripcion, createdAt, updatedAt)
* **Producto** (<u>id</u> [PK], nombre [UQ], codigoBarras [UQ], descripcion, fechaVencimiento, idCategoria [FK $\rightarrow$ CategoriaProducto(id)], precioCompra, precioVenta, precioBlister, precioCaja, unidadesPorBlister, unidadesPorCaja, stockActual, stockMinimo, activo, createdAt, updatedAt)
* **Proveedor** (<u>id</u> [PK], nombre [UQ], telefono, correo, direccion, createdAt, updatedAt)
* **ProveedorProducto** (<u>id</u> [PK], idProveedor [FK $\rightarrow$ Proveedor(id) ON DELETE CASCADE], idProducto [FK $\rightarrow$ Producto(id) ON DELETE CASCADE], precioCompra, createdAt, *Unique(idProveedor, idProducto)*)
* **Compra** (<u>id</u> [PK], fecha, fechaCompra, numeroFactura, idProveedor [FK $\rightarrow$ Proveedor(id)], total, idUsuario [FK $\rightarrow$ Usuario(id)], createdAt, updatedAt)
* **DetalleCompra** (<u>id</u> [PK], idCompra [FK $\rightarrow$ Compra(id) ON DELETE CASCADE], idProducto [FK $\rightarrow$ Producto(id)], cantidad, precioUnitario, subtotal, lote, fechaVencimiento, createdAt, updatedAt)
* **Lote** (<u>id</u> [PK], idProducto [FK $\rightarrow$ Producto(id) ON DELETE CASCADE], codigoLote, fechaVencimiento, stockInicial, stockActual, costoCompra, idDetalleCompra [FK $\rightarrow$ DetalleCompra(id) ON DELETE SET NULL], activo, createdAt, updatedAt, *Index(idProducto)*)
* **MovimientoInventario** (<u>id</u> [PK], idProducto [FK $\rightarrow$ Producto(id) ON DELETE CASCADE], idLote [FK $\rightarrow$ Lote(id) ON DELETE SET NULL], tipo, cantidad, stockResultante, costoUnitario, referencia, idUsuario [FK $\rightarrow$ Usuario(id) ON DELETE SET NULL], createdAt, *Index(idProducto)*, *Index(createdAt)*)
* **Venta** (<u>id</u> [PK], fecha, idCliente [FK $\rightarrow$ Cliente(id) ON DELETE SET NULL], total, metodoPago, nombrePodologo, numeroReceta, idUsuario [FK $\rightarrow$ Usuario(id)], tipoComprobante, estado, montoRecibido, cambio, rucCliente, createdAt, updatedAt)
* **DetalleVenta** (<u>id</u> [PK], idVenta [FK $\rightarrow$ Venta(id) ON DELETE CASCADE], idProducto [FK $\rightarrow$ Producto(id)], cantidad, precioUnitario, subtotal, tipoUnidad, createdAt, updatedAt)
* **ClienteProductoStats** (<u>id</u> [PK], idCliente [FK $\rightarrow$ Cliente(id) ON DELETE CASCADE], idProducto [FK $\rightarrow$ Producto(id) ON DELETE CASCADE], totalComprado, vecesComprado, ultimaCompra, *Unique(idCliente, idProducto)*)
* **ProductoVentaStats** (<u>id</u> [PK], idProducto [FK $\rightarrow$ Producto(id) ON DELETE CASCADE], totalUnidadesVendidas, totalVecesVendido, ingresoTotal, ultimaVenta, *Unique(idProducto)*)
* **AlertaStockBajo** (<u>id</u> [PK], idProducto [FK $\rightarrow$ Producto(id) ON DELETE CASCADE], nombreProducto, stockActual, stockMinimo, fechaAlerta, resuelta)
* **HistorialPrecios** (<u>id</u> [PK], idProducto [FK $\rightarrow$ Producto(id) ON DELETE CASCADE], nombreProducto, precioVentaAnterior, precioVentaNuevo, precioCompraAnterior, precioCompraNuevo, fechaCambio)
* **PasswordResetToken** (<u>id</u> [PK], correo, tokenHash [UQ], expiracion, usado, createdAt, *Index(correo)*, *Index(tokenHash)*)

---

## 4. DICCIONARIO DE DATOS EXTENDIDO (DED)

### 4.1 Tablas de Administración y Accesos

#### TABLA: Rol
| Nombre de Columna | Tipo de Datos PostgreSQL | Nulo | Llave | Valores / Restricciones | Descripción |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `INTEGER` (SERIAL) | NO | PK | Auto-increment | Identificador único del rol. |
| `nombre` | `VARCHAR(100)` | NO | - | UNIQUE | Nombre del perfil (ADMIN, EMPLEADO). |

#### TABLA: Usuario
| Nombre de Columna | Tipo de Datos PostgreSQL | Nulo | Llave | Valores / Restricciones | Descripción |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `INTEGER` (SERIAL) | NO | PK | Auto-increment | Identificador único del usuario. |
| `nombreCompleto` | `VARCHAR(255)` | NO | - | - | Nombre y apellido del operador. |
| `correo` | `VARCHAR(255)` | NO | - | UNIQUE | Correo electrónico de inicio de sesión. |
| `passwordHash` | `VARCHAR(255)` | NO | - | - | Hash criptográfico de contraseña. |
| `idRol` | `INTEGER` | NO | FK | REFERENCES `Rol`(id) | Relación de nivel de permisos del usuario. |
| `activo` | `BOOLEAN` | NO | - | Default: TRUE | Estado habilitado en el sistema. |
| `createdAt` | `TIMESTAMP(3)` | NO | - | Default: NOW() | Fecha de registro de la cuenta. |
| `updatedAt` | `TIMESTAMP(3)` | NO | - | - | Fecha de última edición. |

#### TABLA: Cliente
| Nombre de Columna | Tipo de Datos PostgreSQL | Nulo | Llave | Valores / Restricciones | Descripción |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `INTEGER` (SERIAL) | NO | PK | Auto-increment | Identificador único del cliente/paciente. |
| `nombreCompleto` | `VARCHAR(255)` | NO | - | - | Nombre completo del paciente. |
| `telefono` | `VARCHAR(50)` | SÍ | - | UNIQUE | Teléfono nicaragüense de contacto. |
| `correo` | `VARCHAR(255)` | SÍ | - | UNIQUE | Correo electrónico del paciente. |
| `cedula` | `VARCHAR(20)` | SÍ | - | UNIQUE | Cédula oficial de Nicaragua. |
| `ruc` | `VARCHAR(20)` | SÍ | - | UNIQUE | Registro Único de Contribuyentes si aplica. |
| `direccion` | `TEXT` | SÍ | - | - | Dirección física residencial de paciente. |
| `activo` | `BOOLEAN` | NO | - | Default: TRUE | Indica si el paciente sigue de alta. |

---

### 4.2 Tablas de Inventario y Catálogos

#### TABLA: CategoriaProducto
| Nombre de Columna | Tipo de Datos PostgreSQL | Nulo | Llave | Valores / Restricciones | Descripción |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `INTEGER` (SERIAL) | NO | PK | Auto-increment | Identificador de categoría. |
| `nombre` | `VARCHAR(150)` | NO | - | UNIQUE | Nombre (Analgésicos, Material de Curación). |
| `descripcion` | `TEXT` | SÍ | - | - | Detalle explicativo de la categoría. |

#### TABLA: Producto
| Nombre de Columna | Tipo de Datos PostgreSQL | Nulo | Llave | Valores / Restricciones | Descripción |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `INTEGER` (SERIAL) | NO | PK | Auto-increment | Identificador de catálogo. |
| `nombre` | `VARCHAR(255)` | NO | - | UNIQUE | Nombre comercial y genérico del producto. |
| `codigoBarras` | `VARCHAR(100)` | SÍ | - | UNIQUE | Código de barras del empaque. |
| `descripcion` | `TEXT` | SÍ | - | - | Especificaciones de presentación del fármaco. |
| `idCategoria` | `INTEGER` | NO | FK | REFERENCES `Categoria` | Vínculo de grupo de producto. |
| `precioCompra` | `NUMERIC(10,2)` | NO | - | > 0 | Promedio ponderado del costo. |
| `precioVenta` | `NUMERIC(10,2)` | NO | - | > 0 | Precio base al público. |
| `precioBlister` | `NUMERIC(10,2)` | SÍ | - | - | Precio por fracción blíster. |
| `precioCaja` | `NUMERIC(10,2)` | SÍ | - | - | Precio por empaque completo. |
| `unidadesPorBlister` | `INTEGER` | SÍ | - | > 0 | Pastillas/unidades contenidas por blíster. |
| `unidadesPorCaja` | `INTEGER` | SÍ | - | > 0 | Unidades totales contenidas por caja. |
| `stockActual` | `INTEGER` | NO | - | Default: 0 | Cantidad actual consolidada en almacén. |
| `stockMinimo` | `INTEGER` | SÍ | - | >= 0 | Límite mínimo para reorden. |
| `activo` | `BOOLEAN` | NO | - | Default: TRUE | Disponibilidad comercial del producto. |

#### TABLA: Proveedor
| Nombre de Columna | Tipo de Datos PostgreSQL | Nulo | Llave | Valores / Restricciones | Descripción |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `INTEGER` (SERIAL) | NO | PK | Auto-increment | Identificador de proveedor. |
| `nombre` | `VARCHAR(255)` | NO | - | UNIQUE | Nombre comercial del laboratorio/distribuidora. |
| `telefono` | `VARCHAR(50)` | SÍ | - | - | Teléfono de ejecutivo/prevendedor. |
| `correo` | `VARCHAR(255)` | SÍ | - | - | Correo corporativo de ventas. |
| `direccion` | `TEXT` | SÍ | - | - | Ubicación de oficinas/bodegas principales. |

---

### 4.3 Tablas Transaccionales y Kardex

#### TABLA: Lote (Trazabilidad)
| Nombre de Columna | Tipo de Datos PostgreSQL | Nulo | Llave | Valores / Restricciones | Descripción |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `INTEGER` (SERIAL) | NO | PK | Auto-increment | Código interno del lote. |
| `idProducto` | `INTEGER` | NO | FK | REFERENCES `Producto` | Producto correspondiente al lote. |
| `codigoLote` | `VARCHAR(100)` | NO | - | - | Código grabado por laboratorio. |
| `fechaVencimiento` | `TIMESTAMP(3)` | SÍ | - | - | Límite de expiración de lote. |
| `stockInicial` | `INTEGER` | NO | - | >= 0 | Cantidad ingresada al comprar. |
| `stockActual` | `INTEGER` | NO | - | >= 0 | Inventario actual de este lote específico. |
| `costoCompra` | `NUMERIC(10,2)` | NO | - | Default: 0 | Costo de adquisición por unidad de lote. |
| `idDetalleCompra` | `INTEGER` | SÍ | FK | ON DELETE SET NULL | Compra que originó el lote. |
| `activo` | `BOOLEAN` | NO | - | Default: TRUE | Bloqueado a la venta si expira. |

#### TABLA: MovimientoInventario (Kardex)
| Nombre de Columna | Tipo de Datos PostgreSQL | Nulo | Llave | Valores / Restricciones | Descripción |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `INTEGER` (SERIAL) | NO | PK | Auto-increment | Código de movimiento. |
| `idProducto` | `INTEGER` | NO | FK | REFERENCES `Producto` | Producto afectado en el almacén. |
| `idLote` | `INTEGER` | SÍ | FK | ON DELETE SET NULL | Lote específico que sale/entra. |
| `tipo` | `VARCHAR(50)` | NO | - | ENTRADA_COMPRA, SALIDA_VENTA, etc. | Tipo de transacción Kardex. |
| `cantidad` | `INTEGER` | NO | - | != 0 | Unidades afectadas. |
| `stockResultante` | `INTEGER` | NO | - | >= 0 | Saldo final de inventario tras registrar. |
| `costoUnitario` | `NUMERIC(10,2)` | SÍ | - | - | Costo real unitario al momento del movimiento. |
| `referencia` | `VARCHAR(255)` | SÍ | - | - | Número de factura o ajuste origen. |
| `idUsuario` | `INTEGER` | SÍ | FK | ON DELETE SET NULL | Operador de la transacción. |
| `createdAt` | `TIMESTAMP(3)` | NO | - | Default: NOW() | Fecha exacta de registro físico. |

#### TABLA: Venta
| Nombre de Columna | Tipo de Datos PostgreSQL | Nulo | Llave | Valores / Restricciones | Descripción |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `INTEGER` (SERIAL) | NO | PK | Auto-increment | Folio único de venta. |
| `fecha` | `TIMESTAMP(3)` | NO | - | Default: NOW() | Fecha y hora de cobro. |
| `idCliente` | `INTEGER` | SÍ | FK | REFERENCES `Cliente` | Paciente que compra (Opcional). |
| `total` | `NUMERIC(10,2)` | NO | - | > 0 | Importe total pagado. |
| `metodoPago` | `VARCHAR(50)` | NO | - | EFECTIVO, TARJETA, TRANSFERENCIA | Forma de recepción de dinero. |
| `nombrePodologo` | `VARCHAR(255)` | SÍ | - | - | Podólogo que atendió la consulta. |
| `numeroReceta` | `VARCHAR(100)` | SÍ | - | - | Código correlativo de receta (MINSA). |
| `idUsuario` | `INTEGER` | NO | FK | REFERENCES `Usuario` | Cajero que operó la transacción. |
| `tipoComprobante` | `VARCHAR(50)` | NO | - | Default: 'RECIBO' | Documento de salida. |
| `estado` | `VARCHAR(50)` | NO | - | Default: 'COMPLETADA' | Estado actual (COMPLETADA, ANULADA). |
| `montoRecibido` | `NUMERIC(10,2)` | SÍ | - | - | Importe de pago recibido del cliente. |
| `cambio` | `NUMERIC(10,2)` | SÍ | - | - | Cambio entregado al cliente. |
| `rucCliente` | `VARCHAR(20)` | SÍ | - | - | RUC en caso de factura oficial. |

#### TABLA: DetalleVenta
| Nombre de Columna | Tipo de Datos PostgreSQL | Nulo | Llave | Valores / Restricciones | Descripción |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `INTEGER` (SERIAL) | NO | PK | Auto-increment | Código de detalle. |
| `idVenta` | `INTEGER` | NO | FK | REFERENCES `Venta` ON DELETE CASCADE | Venta asociada. |
| `idProducto` | `INTEGER` | NO | FK | REFERENCES `Producto` | Producto vendido. |
| `cantidad` | `INTEGER` | NO | - | > 0 | Cantidad vendida. |
| `precioUnitario` | `NUMERIC(10,2)` | NO | - | > 0 | Precio unitario cobrado. |
| `subtotal` | `NUMERIC(10,2)` | NO | - | = precio * cantidad | Subtotal monetario de línea. |
| `tipoUnidad` | `VARCHAR(50)` | NO | - | UNIDAD, BLISTER, CAJA | Nivel de fraccionamiento vendido. |

---

## 5. CAPA SERVIDOR: TABLESPACES, PGAGENT Y TRIGGERS

### 5.1 Rendimiento por Tablespaces
Para optimizar la velocidad del lector de códigos de barras (procesado en <40ms) y la escritura recurrente del Kardex, PostgreSQL permite el uso de **Tablespaces** asignados a dispositivos físicos dedicados.
```sql
CREATE TABLESPACE farmacia_data LOCATION 'C:\farmacia\data';
```
Esta asignación en el servidor de producción segrega las lecturas y escrituras transaccionales de la carga del sistema operativo, aumentando el rendimiento general de I/O de la base de datos de la clínica.

### 5.2 Planificación de Continuidad con pgAgent
La automatización de respaldos se programa a través del agente **pgAgent** a nivel de servidor:
* **Frecuencia y Programación:** Cada 24 horas a las **21:00 (9:00 PM)**.
* **Justificación de Horario:** La ejecución a las 9 PM ocurre después del cierre de operaciones de la clínica y farmacia, eliminando bloqueos de tablas durante las horas pico comerciales y garantizando un respaldo consistente de las cajas cuadradas al final del día.
* **Mapeo:** Un script batch `.bat` ejecuta `pg_dump.exe` respaldando la base de datos a `C:\farmacia\backups`.

### 5.3 Resiliencia a través de Triggers en PostgreSQL
La base de datos cuenta con lógica procedimental inalterable y persistente basada en disparadores:

1. **`tr_alerta_stock_bajo`:** Al actualizarse el `stockActual` en `Producto`, verifica si este se encuentra por debajo del `stockMinimo`. De ser así, inserta un registro en la tabla `AlertaStockBajo` para visibilizar el estado en el dashboard de compras. Si se reabastece y supera el mínimo, marca la alerta como resuelta automáticamente.
2. **`tr_actualizar_stats_producto`:** Tras cada inserción en `DetalleVenta`, actualiza incrementalmente la tabla `ProductoVentaStats` sumando las cantidades, visitas y montos facturados del producto de forma atómica.
3. **`tr_historial_precios`:** Al modificarse los campos `precioVenta` o `precioCompra` en la tabla `Producto`, registra de forma instantánea el valor previo, el nuevo y la marca de tiempo exacta en la tabla `HistorialPrecios` para efectos de auditorías financieras.

---

## 6. CUMPLIMIENTO DE LA NORMATIVA 004 DEL MINSA
El Ministerio de Salud de Nicaragua, bajo la **Normativa 004 (Expediente Clínico)**, regula estrictamente la confidencialidad, trazabilidad e integridad de los datos de salud de los pacientes. El sistema cumple con estos pilares mediante:

### 6.1 Control de Acceso y Trazabilidad (RBAC)
* **Roles Definidos:** La base de datos asocia permisos diferenciados mediante las tablas `Rol` y `Usuario`. El perfil `Podologo` posee permisos de lectura y escritura de notas clínicas, diagnósticos e historial de atenciones. El rol `Cajero` tiene acceso exclusivo al módulo de cobros e inventarios, teniendo estrictamente prohibido el acceso a datos médicos privados del paciente.
* **Sesiones Seguras:** Autenticación protegida mediante JSON Web Tokens (JWT) guardados en cookies HTTP-Only de corta duración y tokens de recuperación cifrados mediante **SHA-256**, evitando fugas de identidad.

### 6.2 Auditoría Forense de Expedientes
* **`AuditoriaLog`:** Registra de forma inalterable las acciones críticas sobre los expedientes clínicos y compras (creaciones, modificaciones o borrados de recetas), asociando el `idUsuario` responsable de la modificación.

### 6.3 Modelo Relacional SOAP para la Consulta Podológica
La Normativa 004 exige un registro ordenado y estructurado de la evolución clínica del paciente. El sistema modela e integra esta evolución a través del formato clínico **SOAP**:
* **S (Subjetivo):** Motivo de consulta y síntomas referidos por el paciente guardados en texto enriquecido.
* **O (Objetivo):** Exploración física clínica podológica realizada por el especialista (hiperqueratosis, pie diabético, onicocriptosis, etc.).
* **A (Análisis/Diagnóstico):** Juicio clínico codificado (CIE-10 de patologías podológicas).
* **P (Plan/Receta):** Tratamiento indicado. La base de datos conecta la prescripción médica directamente a la facturación de farmacia. El podólogo genera la receta médica con un folio único; cuando el paciente acude a ventanilla, el cajero digita la clave asociando la venta en la tabla `Venta` bajo las llaves `numeroReceta` y `nombrePodologo`, logrando una trazabilidad integral desde la clínica al inventario de farmacia.

---

## 7. CONCLUSIONES Y RECOMENDACIONES

### 7.1 Conclusiones
La arquitectura e implementación de la base de datos del **Sistema Podocare** representa una evolución tecnológica robusta para la Clínica del Pie. Se ha erradicado el descuadre financiero y físico de inventarios gracias al control transaccional por lotes (COGS) en PostgreSQL. Asimismo, la automatización a nivel de servidor garantiza la seguridad jurídica y operativa de la información clínica y de caja en total apego a la legislación de salud nicaragüense.

### 7.2 Recomendaciones
1. **Infraestructura Dedicada:** Implementar discos SSD físicos mapeados al Tablespace `farmacia_data` para resguardar la fluidez del escaneo por hardware y cámara.
2. **Seguridad de Backups:** Respaldar el directorio `C:\farmacia\backups` generado por pgAgent mediante servicios automáticos de replicación en la nube en tiempo real.
3. **Capacitación:** Instruir al personal médico y administrativo sobre la separación de roles para preservar la integridad de los datos y el secreto profesional regulado por el MINSA.
