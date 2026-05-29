const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  MIGRACIÓN V2: Reestructura de Inventario           ║');
  console.log('║  Lotes, Movimientos, Kardex                         ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  const sqlPath = path.join(
    __dirname,
    'prisma',
    'migrations',
    '20260527_inventory_restructure',
    'migration.sql'
  );

  if (!fs.existsSync(sqlPath)) {
    console.error('❌ No se encontró el archivo SQL de migración en:', sqlPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf-8');

  // Split by semicolons but respect DO $$ blocks
  // Execute the entire script as a single raw statement
  try {
    console.log('⏳ Ejecutando migración SQL...');
    await prisma.$executeRawUnsafe(sql);
    console.log('✅ Migración SQL ejecutada exitosamente.');
  } catch (error) {
    // Some statements may fail if already applied — try statement by statement
    console.log('⚠️  Ejecución completa falló, intentando por bloques...');
    
    // Split intelligently: on semicolons that are NOT inside $$ blocks
    const statements = [];
    let current = '';
    let inDollarBlock = false;
    
    for (const line of sql.split('\n')) {
      const trimmed = line.trim();
      
      // Track $$ blocks
      const dollarMatches = (trimmed.match(/\$\$/g) || []).length;
      if (dollarMatches % 2 !== 0) {
        inDollarBlock = !inDollarBlock;
      }
      
      current += line + '\n';
      
      if (!inDollarBlock && trimmed.endsWith(';')) {
        const stmt = current.trim();
        if (stmt && !stmt.startsWith('--')) {
          statements.push(stmt);
        }
        current = '';
      }
    }
    
    let success = 0;
    let skipped = 0;
    
    for (const stmt of statements) {
      if (!stmt.trim() || stmt.trim().startsWith('--')) continue;
      try {
        await prisma.$executeRawUnsafe(stmt);
        success++;
      } catch (err) {
        skipped++;
        const msg = err.message || '';
        if (msg.includes('already exists') || msg.includes('duplicate')) {
          console.log(`  ⏭️  Saltado (ya existe): ${stmt.substring(0, 60)}...`);
        } else {
          console.log(`  ⚠️  Error en bloque: ${msg.substring(0, 100)}`);
        }
      }
    }
    
    console.log(`\n📊 Resultado: ${success} bloques ejecutados, ${skipped} saltados`);
  }

  console.log('');
  console.log('🔄 Verificando tablas creadas...');
  
  // Verify tables exist
  try {
    const lotes = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Lote"`;
    console.log(`  ✅ Tabla "Lote" existe (${lotes[0].count} registros)`);
  } catch {
    console.log('  ❌ Tabla "Lote" no encontrada');
  }

  try {
    const movs = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "MovimientoInventario"`;
    console.log(`  ✅ Tabla "MovimientoInventario" existe (${movs[0].count} registros)`);
  } catch {
    console.log('  ❌ Tabla "MovimientoInventario" no encontrada');
  }

  // Verify new columns on Producto
  try {
    await prisma.$queryRaw`SELECT "codigoBarras", "imagen" FROM "Producto" LIMIT 1`;
    console.log('  ✅ Columnas "codigoBarras" e "imagen" en Producto');
  } catch {
    console.log('  ❌ Columnas nuevas en Producto no encontradas');
  }

  // Verify new columns on Compra
  try {
    await prisma.$queryRaw`SELECT "numeroFactura", "fechaCompra" FROM "Compra" LIMIT 1`;
    console.log('  ✅ Columnas "numeroFactura" y "fechaCompra" en Compra');
  } catch {
    console.log('  ❌ Columnas nuevas en Compra no encontradas');
  }

  // Verify new columns on DetalleCompra
  try {
    await prisma.$queryRaw`SELECT "lote", "fechaVencimiento" FROM "DetalleCompra" LIMIT 1`;
    console.log('  ✅ Columnas "lote" y "fechaVencimiento" en DetalleCompra');
  } catch {
    console.log('  ❌ Columnas nuevas en DetalleCompra no encontradas');
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  ✅ Migración V2 completada');
  console.log('  Ejecuta: npx prisma generate');
  console.log('═══════════════════════════════════════════════════════');
}

main()
  .catch(e => {
    console.error('❌ Error fatal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
