import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { execSync } from "child_process"
import { registrarLog } from "@/lib/audit"
import fs from "fs"
import path from "path"

// Listas de clasificación de tablas para auditoría
const TABLAS_CLINICAS = [
  "Cita",
  "AtencionPodologica",
  "Receta",
  "DetalleReceta",
  "DatosClinicosPaciente",
  "ServicioPodologia",
  "ExamenPaciente"
]

// Tablas válidas pertenecientes a la aplicación con secuencias de ID
const APPLICATION_TABLES = [
  "Rol",
  "Usuario",
  "Cliente",
  "CategoriaProducto",
  "Producto",
  "Proveedor",
  "ProveedorProducto",
  "Compra",
  "DetalleCompra",
  "Lote",
  "MovimientoInventario",
  "Venta",
  "DetalleVenta",
  "AuditoriaLog",
  "PasswordResetToken",
  "PasswordResetRequest",
  "Auditoria",
  "DetalleVentaLote",
  "DevolucionProveedor",
  "Cita",
  "AtencionPodologica",
  "Receta",
  "DetalleReceta",
  "Laboratorio",
  "DatosClinicosPaciente",
  "ServicioPodologia",
  "Descuento",
  "ExamenPaciente"
]

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })
    if (usuarioDb?.rol.nombre !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 1. Obtener todas las tablas de la app con secuencias de ID autoincrementales
    const tables = await prisma.$queryRawUnsafe<Array<{ table_name: string; seq_name: string }>>(`
      SELECT 
        table_name,
        pg_get_serial_sequence('"' || table_name || '"', 'id') AS seq_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name IN (${APPLICATION_TABLES.map(t => `'${t}'`).join(', ')})
        AND pg_get_serial_sequence('"' || table_name || '"', 'id') IS NOT NULL
      ORDER BY table_name ASC
    `)

    const preview = []

    // 2. Por cada tabla, obtener la cantidad de filas, el ID máximo y el valor actual de la secuencia
    for (const t of tables) {
      const stats = await prisma.$queryRawUnsafe<Array<{ count: number; max_id: number; current_val: number }>>(
        `SELECT 
           COUNT(*)::integer AS count,
           COALESCE(MAX(id), 0)::integer AS max_id,
           COALESCE((
             SELECT last_value::integer 
             FROM pg_sequences 
             WHERE schemaname = 'public' 
               AND sequencename = substring('${t.seq_name}' from '[^.]+$')
           ), 0)::integer AS current_val
         FROM "${t.table_name}"`
      )

      const info = stats[0]
      preview.push({
        tabla: t.table_name,
        registros: info.count,
        maxId: info.max_id,
        valorSecuencia: info.current_val,
        proximoId: info.max_id + 1,
        modulo: TABLAS_CLINICAS.includes(t.table_name) ? "CLÍNICA" : "FARMACIA"
      })
    }

    return NextResponse.json({ success: true, preview })
  } catch (error: any) {
    console.error("Error previewing sequence reset:", error)
    return NextResponse.json({ error: error.message || "Error al obtener vista previa de secuencias" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })
    if (usuarioDb?.rol.nombre !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { confirmText } = await request.json()
    if (confirmText !== "REINICIAR SECUENCIAS") {
      return NextResponse.json({ error: "Confirmación de texto inválida. Debe escribir exactamente 'REINICIAR SECUENCIAS'" }, { status: 400 })
    }

    // 1. Ejecutar respaldo automático de base de datos
    console.log("[Secuencias] Iniciando respaldo automático de base de datos...")
    try {
      const dbUrl = process.env.DATABASE_URL
      if (!dbUrl) {
        throw new Error("DATABASE_URL no está definida en las variables de entorno.")
      }

      const backupsDir = path.join(process.cwd(), "backups")
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true })
      }

      const now = new Date()
      const pad = (n: number) => n.toString().padStart(2, '0')
      const fileName = `backup_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${now.getHours()}-${pad(now.getMinutes())}.sql`
      const outputPath = path.join(backupsDir, fileName)

      let pgDumpPath = "pg_dump"
      if (process.platform === "win32") {
        const pgCommonDir = "C:\\Program Files\\PostgreSQL"
        if (fs.existsSync(pgCommonDir)) {
          const versions = fs.readdirSync(pgCommonDir)
          versions.sort((a, b) => parseFloat(b) - parseFloat(a))
          for (const version of versions) {
            const candidatePath = path.join(pgCommonDir, version, "bin", "pg_dump.exe")
            if (fs.existsSync(candidatePath)) {
              pgDumpPath = `"${candidatePath}"`
              break
            }
          }
        }
      }

      const command = `${pgDumpPath} --dbname="${dbUrl}" --clean --no-owner --no-privileges --file="${outputPath}"`
      execSync(command, { stdio: "pipe" })
      console.log(`[Secuencias] Respaldo automático completado con éxito: ${fileName}`)
    } catch (backupError: any) {
      console.error("[Secuencias] Error crítico: El respaldo falló.", backupError)
      
      const errorMsg = backupError.message || String(backupError)
      return NextResponse.json({ 
        error: `No se pudo realizar la copia de seguridad previa de la base de datos. Detalles: ${errorMsg}` 
      }, { status: 500 })
    }

    // 2. Obtener todas las tablas de la app con secuencias de ID autoincrementales
    const tables = await prisma.$queryRawUnsafe<Array<{ table_name: string; seq_name: string }>>(`
      SELECT 
        table_name,
        pg_get_serial_sequence('"' || table_name || '"', 'id') AS seq_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name IN (${APPLICATION_TABLES.map(t => `'${t}'`).join(', ')})
        AND pg_get_serial_sequence('"' || table_name || '"', 'id') IS NOT NULL
    `)

    const resetTablesClinica: string[] = []
    const resetTablesFarmacia: string[] = []

    // 3. Ejecutar reinicio dentro de una transacción
    await prisma.$transaction(async (tx) => {
      for (const t of tables) {
        // Ejecutamos la recalibración usando setval y is_called = false
        await tx.$executeRawUnsafe(`
          SELECT setval(
            pg_get_serial_sequence('"${t.table_name}"', 'id'),
            COALESCE((SELECT MAX(id) FROM "${t.table_name}"), 0) + 1,
            false
          )
        `)

        if (TABLAS_CLINICAS.includes(t.table_name)) {
          resetTablesClinica.push(t.table_name)
        } else {
          resetTablesFarmacia.push(t.table_name)
        }
      }
    }, {
      maxWait: 15000,
      timeout: 30000,
    })

    // 4. Registrar la acción en auditoría por módulos
    if (resetTablesClinica.length > 0) {
      registrarLog({
        accion: "REINICIAR_SECUENCIAS_IDS",
        entidad: "BaseDatos",
        idUsuario: user.id,
        modulo: "CLINICA",
        detalles: { tablas: resetTablesClinica, nota: "Recalibración de secuencias autoincrementales de clínica completada." }
      })
    }

    if (resetTablesFarmacia.length > 0) {
      registrarLog({
        accion: "REINICIAR_SECUENCIAS_IDS",
        entidad: "BaseDatos",
        idUsuario: user.id,
        modulo: "FARMACIA",
        detalles: { tablas: resetTablesFarmacia, nota: "Recalibración de secuencias autoincrementales de farmacia y administración completada." }
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Secuencias de IDs reiniciadas con éxito. Se procesaron ${tables.length} tablas.` 
    })
  } catch (error: any) {
    console.error("Error resetting sequences:", error)
    return NextResponse.json({ error: error.message || "Error al reiniciar las secuencias de base de datos" }, { status: 500 })
  }
}
