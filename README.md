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
* **Algoritmo de Validación Estricto**: Validador algorítmico integrado (suma ponderada con módulo 23 y mapeo de letra verificadora) que valida el formato y la autenticidad de las cédulas de identidad de Nicaragua en tiempo real para prevenir registros erróneos o ficticios.

### 📦 3. Módulo de Compras y Reabastecimiento Inteligente
* **Smart Restock Widget**: Panel inteligente que analiza el inventario actual y sugiere la compra de productos que se encuentren por debajo de su stock mínimo de alerta.
* **Cálculo de Cantidad Óptima**: Sugiere automáticamente la cantidad ideal a comprar basándose en la fórmula matemática:
  $$\text{Cantidad Óptima} = (\text{Stock Mínimo} \times 2) - \text{Stock Actual}$$
* **Llenado Automático (Autofill)**: Botón de acción rápida para llenar el formulario de compras sugeridas con un solo clic, agilizando el flujo de reabastecimiento con los proveedores.

### 📊 4. Reportes Financieros y Ganancias Netas Exactas (COGS)
* **Ganancia Neta Exacta (Costo de Ventas)**: Cálculo de ganancias corregido para basarse en el **COGS (Cost of Goods Sold)** real. Resta de los ingresos brutos el costo histórico real de adquisición de los lotes vendidos (`MovimientoInventario` de tipo `SALIDA_VENTA`), en lugar de aplicar un margen porcentual fijo o simple.
* **Auditoría de Expiración Correcta**: Corregido el bug en reportes que evaluaba la fecha de vencimiento de la tabla general `Producto`. Ahora evalúa de forma granular cada `Lote.fechaVencimiento`, permitiendo anticipar mermas reales.

### 🔑 5. Recuperación Criptográfica de Contraseñas (Password Recovery)
* **Asistente de Recuperación de 4 Estados**: Interfaz intuitiva paso a paso para el usuario (Solicitud de token -> Envío -> Verificación en servidor -> Cambio exitoso de contraseña).
* **Seguridad de Grado Bancario**: Generación de tokens seguros y de un solo uso con expiración a los 15 minutos, almacenados en la base de datos utilizando hashing **SHA-256** para evitar que sean legibles en caso de fugas de datos.
* **Protección contra Fuerza Bruta (Rate Limiting)**: Control de tasa de solicitudes por IP y correo electrónico para mitigar ataques de denegación de servicio o intentos repetidos de adivinación de tokens.
* **Mailing Resiliente con Fallback en Consola**: Integración nativa con Nodemailer para envíos de correo real (SMTP configurado en producción). Si las variables de correo no están presentes (entorno de desarrollo local), el sistema imprime de forma segura el enlace y el token de restablecimiento directamente en la terminal.

---

## 🛠️ Stack Tecnológico
* **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS + Radix UI / Shadcn UI
* **Backend**: Next.js API Routes (Serverless ready)
* **Base de Datos**: PostgreSQL (Neon Database / Local)
* **ORM**: Prisma Client v6.2.1
* **Seguridad**: JWT en cookies HTTP-Only, encriptación bcrypt para contraseñas, hashing SHA-256 para tokens de recuperación
* **Lectura**: html5-qrcode para cámara web y hooks de captura de buffer de teclado para escáneres USB

---

## 📂 Componentes y Archivos Clave del Sistema
* [lib/cedulaValidator.ts](file:///c:/Users/Gaki/Documents/podocare-system-master/Sistema%20de%20Gestion%20de%20Farmacia/lib/cedulaValidator.ts) - Algoritmo de validación de cédulas de identidad nicaragüenses.
* [lib/email.ts](file:///c:/Users/Gaki/Documents/podocare-system-master/Sistema%20de%20Gestion%20de%20Farmacia/lib/email.ts) - Lógica de envío de correos con fallback automático en consola.
* [hooks/useBarcodeScanner.ts](file:///c:/Users/Gaki/Documents/podocare-system-master/Sistema%20de%20Gestion%20de%20Farmacia/hooks/useBarcodeScanner.ts) - Hook reactivo de alto rendimiento para escáneres de código de barras USB (< 40ms).
* [components/scanner-modal.tsx](file:///c:/Users/Gaki/Documents/podocare-system-master/Sistema%20de%20Gestion%20de%20Farmacia/components/scanner-modal.tsx) - Ventana modal de escáner híbrido (Cámara Web / QR + Lector manual).
* [app/api/auth/reset-password/](file:///c:/Users/Gaki/Documents/podocare-system-master/Sistema%20de%20Gestion%20de%20Farmacia/app/api/auth/reset-password) - Endpoints seguros para el procesamiento del restablecimiento de contraseñas.
* [prisma/schema.prisma](file:///c:/Users/Gaki/Documents/podocare-system-master/Sistema%20de%20Gestion%20de%20Farmacia/prisma/schema.prisma) - Esquema de la base de datos con el modelo `PasswordResetToken`.
* [prisma/migrations/neondb_migration_password_reset_token.sql](file:///c:/Users/Gaki/Documents/podocare-system-master/Sistema%20de%20Gestion%20de%20Farmacia/prisma/migrations/neondb_migration_password_reset_token.sql) - Script SQL optimizado para aplicar el modelo `PasswordResetToken` directamente en NeonDB u otro servidor PostgreSQL en producción.

---

## ⚙️ Configuración de Variables de Entorno (`.env`)
Crea un archivo `.env` en la raíz del proyecto (este archivo se encuentra ignorado en Git para tu seguridad) con las siguientes variables:

```env
# URL de conexión de la Base de Datos PostgreSQL (NeonDB o Local)
DATABASE_URL="postgresql://usuario:contraseña@servidor:5432/db_farmacia?sslmode=require"

# Secreto para firmas JWT
JWT_SECRET="tu_secreto_super_seguro_jwt"

# Configuración del servidor de correo SMTP (Opcional, fallback automático a consola del servidor si no se especifican)
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

3. **Ejecutar migraciones en la Base de Datos local**:
   ```bash
   npx prisma db push
   ```
   *Nota para producción: Si utilizas NeonDB en producción y prefieres ejecutar SQL crudo directamente en la consola de Neon, utiliza el archivo SQL proporcionado en `prisma/migrations/neondb_migration_password_reset_token.sql`.*

4. **Generar el Cliente de Prisma**:
   ```bash
   npx prisma generate
   ```

5. **Iniciar el servidor en entorno de desarrollo**:
   ```bash
   npm run dev
   ```
   La aplicación estará disponible para interactuar en `http://localhost:3000`.

---

## 🔒 Auditoría de Seguridad Aplicada
* **Prevención de SQL Injections**: Toda interacción con la base de datos se realiza a través de Prisma ORM, el cual parametriza de manera nativa todas las consultas SQL.
* **Cifrado de Contraseñas**: Cifrado criptográfico con `bcrypt` y factor de costo de 10 rondas para todas las contraseñas de los usuarios.
* **Sesiones Seguras**: Manejo de autenticación por cookies HTTP-Only de corta duración, evitando el robo de credenciales a través de ataques XSS.
* **Gestión Segura de Tokens**: Los tokens de reinicio se encriptan con `SHA-256` en base de datos. Una vez utilizados, son destruidos para evitar su reutilización.

---


