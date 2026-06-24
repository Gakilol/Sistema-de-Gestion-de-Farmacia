import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Listas de clasificación de tablas para auditoría
const TABLAS_CLINICAS = [
  "Cita",
  "AtencionPodologica",
  "Receta",
  "DetalleReceta",
  "DatosClinicosPaciente",
  "ServicioPodologia",
  "ExamenPaciente"
];

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
];

// Load .env variables manually
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      process.env[key.trim()] = value;
    }
  }
}

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando herramienta administrativa: Reiniciar Secuencias de IDs (PostgreSQL)...');

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
  `);

  if (tables.length === 0) {
    console.log('⚠️ No se encontraron tablas con secuencias de ID autoincrementales en el esquema public.');
    return;
  }

  const preview = [];
  console.log('\n📊 Obteniendo vista previa del estado actual de las secuencias...');

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
    );

    const info = stats[0];
    preview.push({
      Tabla: t.table_name,
      Registros: info.count,
      'Max ID': info.max_id,
      'Secuencia Actual': info.current_val,
      'Próximo ID': info.max_id + 1,
      Módulo: TABLAS_CLINICAS.includes(t.table_name) ? 'CLÍNICA' : 'FARMACIA'
    });
  }

  console.table(preview);

  // Check if --yes or --confirm flag is passed
  const args = process.argv.slice(2);
  const autoConfirm = args.includes('--confirm') || args.includes('-y');

  if (autoConfirm) {
    console.log('⚠️ Confirmación automática detectada por argumento.');
    await runReset(tables);
  } else {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(
      '\n⚠️ ADVERTENCIA: Esta operación recalibrará las secuencias de IDs autoincrementales.\n' +
      'Se realizará una copia de seguridad automática antes de continuar.\n' +
      'Por favor, confirme la operación escribiendo exactamente "REINICIAR SECUENCIAS": ',
      async (answer) => {
        rl.close();
        if (answer.trim() === 'REINICIAR SECUENCIAS') {
          await runReset(tables);
        } else {
          console.log('❌ Confirmación cancelada. El texto ingresado no coincide.');
          process.exit(0);
        }
      }
    );
  }
}

async function runReset(tables: Array<{ table_name: string; seq_name: string }>) {
  // 1. Ejecutar respaldo automático de base de datos
  console.log('\n📦 [Respaldo] Iniciando respaldo automático de base de datos...');
  try {
    // Invoke npm run db:backup
    execSync('npm run db:backup', { stdio: 'inherit' });
    console.log('✅ [Respaldo] Respaldo completado con éxito.');
  } catch (backupError) {
    console.error('❌ [Respaldo] Error crítico: El respaldo falló. Abortando reinicio de secuencias por seguridad.');
    process.exit(1);
  }

  // 2. Ejecutar reinicio dentro de una transacción
  console.log('\n⚙️ [Procesando] Reiniciando secuencias en la base de datos...');
  const resetTablesClinica: string[] = [];
  const resetTablesFarmacia: string[] = [];

  try {
    await prisma.$transaction(async (tx) => {
      for (const t of tables) {
        await tx.$executeRawUnsafe(`
          SELECT setval(
            pg_get_serial_sequence('"${t.table_name}"', 'id'),
            COALESCE((SELECT MAX(id) FROM "${t.table_name}"), 0) + 1,
            false
          )
        `);

        if (TABLAS_CLINICAS.includes(t.table_name)) {
          resetTablesClinica.push(t.table_name);
        } else {
          resetTablesFarmacia.push(t.table_name);
        }
      }
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    console.log('✅ [Base de Datos] Secuencias reiniciadas exitosamente en PostgreSQL.');

    // 3. Registrar auditoría (se crea registro directo en base de datos ya que no estamos en contexto Next.js)
    if (resetTablesClinica.length > 0) {
      await prisma.auditoriaLog.create({
        data: {
          accion: 'REINICIAR_SECUENCIAS_IDS',
          entidad: 'BaseDatos',
          entidadId: null,
          idUsuario: null,
          detalles: JSON.stringify({ tablas: resetTablesClinica, nota: 'Recalibración de secuencias desde CLI.' }),
          modulo: 'CLINICA'
        }
      });
    }

    if (resetTablesFarmacia.length > 0) {
      await prisma.auditoriaLog.create({
        data: {
          accion: 'REINICIAR_SECUENCIAS_IDS',
          entidad: 'BaseDatos',
          entidadId: null,
          idUsuario: null,
          detalles: JSON.stringify({ tablas: resetTablesFarmacia, nota: 'Recalibración de secuencias desde CLI.' }),
          modulo: 'FARMACIA'
        }
      });
    }

    console.log('✅ [Auditoría] Registros de auditoría guardados con éxito.');
    console.log('🎉 ¡OPERACIÓN COMPLETADA CON ÉXITO! 🎉');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error durante el reinicio de secuencias:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error catastrófico:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
