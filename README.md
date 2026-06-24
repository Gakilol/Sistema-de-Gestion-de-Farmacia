# Farmacia Podología - Sistema de Gestión e Inventario Inteligente (v2.0)

Un sistema de gestión de farmacia empresarial diseñado a medida para clínicas podológicas en Nicaragua. Cuenta con control estricto de inventario por lotes, reportes financieros avanzados, sistema de escaneo de código de barras híbrido y seguridad criptográfica de grado empresarial.

---

## 🚀 Características Principales y Mejoras Recientes

### 🛒 1. Módulo de Ventas e Integración de Escáner Híbrido
* **Escaneo Físico Ultra Rápido**: Detección inteligente por hardware de lectores USB en menos de `40ms` mediante análisis de buffer continuo, permitiendo agregar productos al carrito al instante sin interferir con las entradas normales de texto ni requerir que el usuario haga clic en un campo específico.
* **Escaneo por Cámara Web / Móvil**: Lector de código de barras y códigos QR integrado utilizando la cámara del dispositivo (`html5-qrcode`). Incluye selector de cámara activa, feedback visual en tiempo real (línea guía de escaneo láser y área activa) y control de linterna.
* **Control y Bloqueo de Lotes Vencidos**: Validación estricta en Frontend y en Backend (API) que impide vender productos expirados, mostrando alertas visuales en rojo y rechazando transacciones a nivel de servidor (Código HTTP 422: `LOTE_VENCIDO`).
* **Registro Rápido de Clientes**: Modal interactivo para registrar nuevos clientes directamente en la pantalla de ventas sin interrumpir ni perder el estado del carrito actual.

### 💳 2. Validación de Cédula Nicaragüense
* **Algoritmo de Validación Estricto**: Validador algorítmico integrado (suma ponderada con módulo 23 y letra verificadora) que valida la estructura y autenticidad de las cédulas de identidad de Nicaragua en tiempo real para evitar registros erróneos.

### 📦 3. Módulo de Compras y Reabastecimiento Inteligente
* **Smart Restock Widget**: Panel inteligente que analiza el inventario actual y sugiere la compra de productos por debajo de su stock mínimo.
* **Cálculo de Cantidad Óptima**: Sugiere la cantidad ideal de compra mediante la fórmula:
  $$\text{Cantidad Óptima} = (\text{Stock Mínimo} \times 2) - \text{Stock Actual}$$

### 📊 4. Reportes Financieros y Ganancias Netas Exactas (COGS)
* **Ganancia Neta Exacta (Costo de Ventas)**: Cálculo de ganancias reales basado en el **COGS (Cost of Goods Sold)** restando del ingreso el costo de adquisición unitario del lote vendido.
* **Auditoría de Expiración Correcta**: Evaluación granular por `Lote.fechaVencimiento` para anticipar mermas reales del almacén.

### 🔑 5. Recuperación Criptográfica de Contraseñas
* **Seguridad de Grado Bancario**: Enlaces seguros temporales (15 min) cifrados en base de datos mediante hashing **SHA-256**.
* **Protección contra Fuerza Bruta**: Límite de tasa de solicitudes (Rate Limiting) por IP y correo.

### 🔬 6. Módulo de Exámenes Clínicos (Historial Clínico)
* **Gestión Integral de Exámenes**: Registro estructurado de exámenes clínicos al momento de registrar un nuevo paciente (exámenes iniciales opcionales) o retrospectivamente desde su historial clínico.
* **Trazabilidad y Campos**: Permite almacenar nombre del examen, tipo (Laboratorio, Imagen, Funcional, Biopsia, Otro), fecha del examen, resultado, interpretación clínica, observaciones y adjuntar archivos opcionales.
* **Archivos Adjuntos Protegidos**: Los archivos (PDF, imágenes) se suben y almacenan en un directorio local seguro en el servidor (`uploads/examenes/{idPaciente}/`) fuera del acceso público. La descarga y visualización se realiza a través de un endpoint API protegido que valida cookies de sesión y roles, asegurando la confidencialidad médica.
* **Auditoría Forense y Eliminación Lógica**: Cada acción sobre los exámenes (crear, editar, subir/descargar archivo, eliminar) se audita bajo el módulo `CLINICA`. Las eliminaciones de registros son estrictamente lógicas (`activo: false`, `deletedAt`).

### 🛡️ 7. Control de Acceso por Roles (RBAC) - Doctor
* **Rol Doctor**: Incorporación del perfil `DOCTOR` con permisos exclusivos para el ámbito clínico.
* **Seguridad Dual (Frontend & Backend)**:
  * **Frontend**: Hiding dinámico en la barra lateral de los módulos de farmacia (Ventas, Compras, Inventario, Proveedores, Reportes, Usuarios) y redirección automática a la página `/acceso-denegado` si se intenta ingresar por URL.
  * **Backend**: Validación centralizada en `middleware.ts` a nivel de peticiones API y páginas utilizando tokens JWT cifrados, garantizando que el rol `DOCTOR` no pueda interactuar con endpoints de farmacia, y el rol `EMPLEADO` (cajero) no pueda acceder a endpoints clínicos.
* **Auditoría Personalizada**: El Doctor solo puede visualizar la bitácora de auditoría del módulo `CLINICA` y únicamente para los registros generados por su propio usuario.

### 👟 8. Servicios de Podología Reubicados
* **Reubicación de Módulo**: Los servicios podológicos fueron trasladados del panel de Administración general a `Clínica Podológica > Servicios` para mejorar la coherencia de la interfaz de usuario para el personal clínico.
* **Permisos de Gestión**: El rol `DOCTOR` tiene plenos permisos para **crear** y **editar** tratamientos y servicios clínicos en la base de datos (compartiendo esta potestad con el rol `ADMIN`). Sin embargo, el permiso para **eliminar** servicios (física o lógicamente) queda estrictamente restringido al rol `ADMINISTRADOR`.

---

## 🛠️ Stack Tecnológico
* **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS + Radix UI / Shadcn UI
* **Backend**: Next.js API Routes (Serverless ready)
* **Base de Datos**: PostgreSQL (Neon Database / Local)
* **ORM**: Prisma Client v6.2.1
* **Seguridad**: JWT en cookies HTTP-Only, encriptación bcrypt para contraseñas, hashing SHA-256 para tokens de recuperación
* **Lectura**: html5-qrcode para cámara web y hooks de captura de buffer de teclado para escáneres USB

---

## 📊 Arquitectura y Diseño de Base de Datos (UNI - Académico)

### 1. Justificación de la Migración Técnica (Excel a RDBMS PostgreSQL)
El uso histórico de hojas de cálculo de Excel para la administración de la Clínica del Pie introducía múltiples vulnerabilidades operativas y financieras que este sistema mitiga por completo:
* **Descuadre de Inventario:** Resuelto mediante restricciones a nivel de motor de datos y transacciones seguras que aseguran la consistencia física del Kardex.
* **Pérdida de Información:** La base de datos cuenta con transacciones ACID operando bajo el motor PostgreSQL, evitando corrupción de fichas de pacientes y ventas.
* **Falta de Historial de Precios:** Los cambios de costos se registran automáticamente en tablas de auditoría dedicadas mediante triggers a nivel de servidor.
* **Seguridad RBAC:** Control estricto de acceso basado en roles para asegurar la confidencialidad médica e impedir modificaciones no autorizadas.

---

### 2. Modelado de Datos Completo

#### 2.1 Modelo Entidad-Relación Conceptual (MER - Notación de Chen)
Representa de forma lógica-conceptual las entidades (rectángulos), relaciones (rombos) y los atributos clave (óvalos) con sus correspondientes cardinalidades.

![Modelo Entidad-Relación Conceptual (MER)](./modelo_entidad_relacion_conceptual.png)

#### 2.2 Modelo Relacional (MR - Esquema de Tablas Físico)
Estructura física de las tablas del sistema, llaves primarias [PK], foráneas [FK], tipos de datos e índices utilizando notación Crow's Foot.

![Modelo Relacional (MR)](./modelo_relacional.png)

#### 2.3 Modelo Orientado a Objetos (MOO - Diagrama de Clases)
Clases de persistencia mapeadas en el backend con sus respectivos atributos de tipo, métodos de operación lógica y triggers representados como servicios de la base de datos.

![Modelo Orientado a Objetos (MOO)](./modelo_orientado_objetos.png)

#### 2.4 Esquema Relacional de Base de Datos (Notación Matemática)
1. **Rol** (<u>id</u> [PK], nombre [UQ])
2. **Usuario** (<u>id</u> [PK], nombreCompleto, correo [UQ], passwordHash, idRol [FK $\rightarrow$ Rol(id)], activo, createdAt, updatedAt)
3. **Cliente** (<u>id</u> [PK], nombreCompleto, telefono [UQ], correo [UQ], cedula [UQ], ruc [UQ], direccion, activo, createdAt, updatedAt)
4. **CategoriaProducto** (<u>id</u> [PK], nombre [UQ], descripcion, createdAt, updatedAt)
5. **Producto** (<u>id</u> [PK], nombre [UQ], codigoBarras [UQ], descripcion, fechaVencimiento, idCategoria [FK $\rightarrow$ CategoriaProducto(id)], precioCompra, precioVenta, precioBlister, precioCaja, unidadesPorBlister, unidadesPorCaja, stockActual, stockMinimo, activo, createdAt, updatedAt)
6. **Proveedor** (<u>id</u> [PK], nombre [UQ], telefono, correo, direccion, createdAt, updatedAt)
7. **ProveedorProducto** (<u>id</u> [PK], idProveedor [FK $\rightarrow$ Proveedor(id) ON DELETE CASCADE], idProducto [FK $\rightarrow$ Producto(id) ON DELETE CASCADE], precioCompra, createdAt, *Unique(idProveedor, idProducto)*)
8. **Compra** (<u>id</u> [PK], fecha, fechaCompra, numeroFactura, idProveedor [FK $\rightarrow$ Proveedor(id)], total, idUsuario [FK $\rightarrow$ Usuario(id)], createdAt, updatedAt)
9. **DetalleCompra** (<u>id</u> [PK], idCompra [FK $\rightarrow$ Compra(id) ON DELETE CASCADE], idProducto [FK $\rightarrow$ Producto(id)], cantidad, precioUnitario, subtotal, lote, fechaVencimiento, createdAt, updatedAt)
10. **Lote** (<u>id</u> [PK], idProducto [FK $\rightarrow$ Producto(id) ON DELETE CASCADE], codigoLote, fechaVencimiento, stockInicial, stockActual, costoCompra, idDetalleCompra [FK $\rightarrow$ DetalleCompra(id) ON DELETE SET NULL], activo, createdAt, updatedAt, *Index(idProducto)*)
11. **MovimientoInventario** (<u>id</u> [PK], idProducto [FK $\rightarrow$ Producto(id) ON DELETE CASCADE], idLote [FK $\rightarrow$ Lote(id) ON DELETE SET NULL], tipo, cantidad, stockResultante, costoUnitario, referencia, idUsuario [FK $\rightarrow$ Usuario(id) ON DELETE SET NULL], createdAt, *Index(idProducto)*, *Index(createdAt)*)
12. **Venta** (<u>id</u> [PK], fecha, idCliente [FK $\rightarrow$ Cliente(id) ON DELETE SET NULL], total, metodoPago, nombrePodologo, numeroReceta, idUsuario [FK $\rightarrow$ Usuario(id)], tipoComprobante, estado, montoRecibido, cambio, rucCliente, createdAt, updatedAt)
13. **DetalleVenta** (<u>id</u> [PK], idVenta [FK $\rightarrow$ Venta(id) ON DELETE CASCADE], idProducto [FK $\rightarrow$ Producto(id)], cantidad, precioUnitario, subtotal, tipoUnidad, createdAt, updatedAt)
14. **ClienteProductoStats** (<u>id</u> [PK], idCliente [FK $\rightarrow$ Cliente(id) ON DELETE CASCADE], idProducto [FK $\rightarrow$ Producto(id) ON DELETE CASCADE], totalComprado, vecesComprado, ultimaCompra, *Unique(idCliente, idProducto)*)
15. **ProductoVentaStats** (<u>id</u> [PK], idProducto [FK $\rightarrow$ Producto(id) ON DELETE CASCADE], totalUnidadesVendidas, totalVecesVendido, ingresoTotal, ultimaVenta, *Unique(idProducto)*)
16. **AlertaStockBajo** (<u>id</u> [PK], idProducto [FK $\rightarrow$ Producto(id) ON DELETE CASCADE], nombreProducto, stockActual, stockMinimo, fechaAlerta, resuelta)
17. **HistorialPrecios** (<u>id</u> [PK], idProducto [FK $\rightarrow$ Producto(id) ON DELETE CASCADE], nombreProducto, precioVentaAnterior, precioVentaNuevo, precioCompraAnterior, precioCompraNuevo, fechaCambio)
18. **ExamenPaciente** (<u>id</u> [PK], idPaciente [FK $\rightarrow$ Cliente(id) ON DELETE CASCADE], nombre, tipo, fechaExamen, resultado, interpretacion, observaciones, archivoUrl, archivoNombre, archivoTipo, registradoPor [FK $\rightarrow$ Usuario(id)], activo, createdAt, updatedAt, deletedAt)

---

### 3. Diccionario de Datos de las Tablas Críticas

#### TABLA: Producto (Catálogo con Fraccionamiento)
| Nombre de Columna | Tipo de Datos | Nulo | Llave | Restricciones / Índices | Descripción |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `INTEGER` (SERIAL) | NO | PK | - | Identificador único del producto. |
| `nombre` | `VARCHAR(255)` | NO | - | UNIQUE | Nombre comercial o genérico del fármaco. |
| `codigoBarras` | `VARCHAR(100)` | SÍ | - | UNIQUE | Código de barras del empaque. |
| `precioCompra` | `NUMERIC(10,2)` | NO | - | - | Costo promedio calculado automáticamente. |
| `precioVenta` | `NUMERIC(10,2)` | NO | - | - | Precio de venta por unidad suelta. |
| `precioBlister` | `NUMERIC(10,2)` | SÍ | - | - | Precio de venta por blíster completo. |
| `precioCaja` | `NUMERIC(10,2)` | SÍ | - | - | Precio de venta por caja completa. |
| `stockActual` | `INTEGER` | NO | - | Default: 0 | Suma calculada de todos los lotes activos. |
| `stockMinimo` | `INTEGER` | SÍ | - | >= 0 | Umbral de inventario para disparar alertas. |

#### TABLA: Lote (Trazabilidad y Vencimiento)
| Nombre de Columna | Tipo de Datos | Nulo | Llave | Restricciones / Índices | Descripción |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `INTEGER` (SERIAL) | NO | PK | - | Identificador único del lote. |
| `idProducto` | `INTEGER` | NO | FK | REFERENCES `Producto`(id) | Producto asociado (Indexado). |
| `codigoLote` | `VARCHAR(100)` | NO | - | - | Código impreso por el laboratorio fabricante. |
| `fechaVencimiento` | `TIMESTAMP` | SÍ | - | - | Fecha límite de comercialización segura. |
| `stockActual` | `INTEGER` | NO | - | >= 0 | Inventario disponible actualmente en este lote. |
| `costoCompra` | `NUMERIC(10,2)` | NO | - | - | Costo unitario de adquisición del lote. |

---

### 4. Optimización de I/O mediante Tablespaces en PostgreSQL
El sistema permite optimizar el rendimiento de entrada/salida (I/O) físicos separando datos de índices.
```sql
CREATE TABLESPACE farmacia_data LOCATION 'C:\farmacia\data';
```
Esta asignación permite ubicar físicamente el tablespace `farmacia_data` en un disco de estado sólido dedicado (SSD NVMe) separado del sistema operativo, aumentando las velocidades de escaneo en caja (<40ms) y la escritura concurrente de auditorías y movimientos.

---

### 5. Continuidad de Datos y Capa Servidor

#### 5.1 pgAgent Backups
* **Tarea:** `Backup_farmacia_diario` programado diariamente a las **21:00 (9:00 PM)**.
* **Justificación de Horario:** Ejecutarse tras el cierre de operaciones evita la contención de bloqueos de tablas durante la atención de clientes y asegura la consistencia de los datos del día con bajo impacto en el rendimiento.
* **Procesamiento:** Ejecuta un script por lotes `.bat` que invoca `pg_dump.exe` hacia `C:\farmacia\backups`.

#### 5.2 Triggers de Resiliencia en Servidor
Los triggers y constraints están definidos directamente en el motor de base de datos PostgreSQL, garantizando la inmutabilidad de la lógica y la consistencia sin importar qué cliente (web, script o consola pgAdmin4) se conecte:
1. `tr_alerta_stock_bajo`: Registra alertas inmediatas al alcanzar límites mínimos de stock.
2. `tr_actualizar_stats_producto`: Sincroniza estadísticas de movimiento tras cada venta de forma incremental.
3. `tr_historial_precios`: Mantiene un rastro de auditoría de los cambios de precios históricos de adquisición y venta.

---

### 6. Cumplimiento Legal (Normativa 004 - MINSA, Nicaragua)
* **RBAC (Role-Based Access Control):** Separación lógica de cuentas en el sistema. El podólogo prescribe recetas y llena los campos clínicos, mientras que el cajero realiza cobros sin poder acceder al historial del expediente del paciente.
* **Auditoría e Inalterabilidad:** Registros forenses en `AuditoriaLog` e historial de variaciones de precios que aseguran el cumplimiento de regulaciones sobre el expediente de salud.
* **Estructura SOAP (Subjetivo, Objetivo, Análisis, Plan):** Formato estandarizado en base de datos para la consulta del paciente. El plan podológico del médico genera una receta cuyo identificador (`numeroReceta`) y emisor (`nombrePodologo`) se enlazan directamente con la tabla `Venta` en farmacia, asegurando trazabilidad de extremo a extremo.

---

## ⚙️ Configuración de Variables de Entorno (`.env`)
Crea un archivo `.env` en la raíz del proyecto con la siguiente estructura:

```env
# URL de conexión de la Base de Datos PostgreSQL
DATABASE_URL="postgresql://usuario:contraseña@servidor:5432/db_farmacia?sslmode=require"

# Secreto para firmas JWT
JWT_SECRET="tu_secreto_super_seguro_jwt"

# Configuración del servidor de correo SMTP (Opcional, fallback automático a consola del servidor)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tu-correo@gmail.com"
SMTP_PASS="tu-contraseña-de-aplicacion-gmail"
SMTP_FROM="no-reply@tuclinica.com"

# URL base para los enlaces de recuperación de contraseña
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 🚀 Guía de Instalación y Ejecución Local

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/Gakilol/Sistema-de-Gestion-de-Farmacia.git
   cd "Sistema de Gestion de Farmacia"
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Ejecutar Base de Datos**:
   * Para importar la base de datos completa con estructura, triggers, procedimientos y datos iniciales en pgAdmin4 o tu servidor PostgreSQL, ejecuta el script unificado:
     [script_completo_farmacia.sql](./script_completo_farmacia.sql)
   * Alternativamente, si deseas sincronizar el esquema mediante Prisma:
     ```bash
     npx prisma db push
     npx prisma generate
     ```

4. **Iniciar el servidor en desarrollo**:
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:3000`.

---

## 🔒 Auditoría de Seguridad Aplicada
* **Prevención de SQL Injections**: Parametrización nativa en todas las consultas del ORM Prisma.
* **Cifrado de Contraseñas**: Hash `bcrypt` con factor de coste de 10 rondas.
* **Sesiones Seguras**: Cookies seguras HTTP-Only con tokens JWT de corta duración.
* **Manejo de Tokens de Recuperación**: Tokens encriptados bajo algoritmo SHA-256 de un solo uso.
