const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = [
    'Cliente',
    'Usuario',
    'Rol',
    'CategoriaProducto',
    'Producto',
    'Proveedor',
    'Compra',
    'DetalleCompra',
    'Lote',
    'MovimientoInventario',
    'Venta',
    'DetalleVenta',
    'AuditoriaLog',
    'Auditoria',
    'PasswordResetToken'
  ];

  console.log('Resetting database auto-increment sequences...');
  for (const table of tables) {
    try {
      // Get maximum id in the table
      const maxIdRes = await prisma.$queryRawUnsafe(`SELECT MAX(id) as max_id FROM "${table}"`);
      const maxId = maxIdRes[0]?.max_id || 0;
      
      // Reset the sequence
      // pg_get_serial_sequence takes table name (with schema optionally) and column name
      // e.g. pg_get_serial_sequence('Cliente', 'id')
      // If maxId is 0, we can reset it to start at 1
      // If maxId is 0, we set the sequence to 1 with is_called = false
      const setValValue = maxId > 0 ? maxId : 1;
      const isCalledValue = maxId > 0 ? 'true' : 'false';
      await prisma.$executeRawUnsafe(`
        SELECT setval(
          pg_get_serial_sequence('"${table}"', 'id'),
          ${setValValue},
          ${isCalledValue}
        )
      `);
      console.log(`Success: Sequence for "${table}" reset to ${setValValue} (is_called: ${isCalledValue})`);
    } catch (e) {
      console.log(`Error resetting sequence for "${table}": ${e.message}`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
