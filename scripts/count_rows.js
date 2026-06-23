const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Counting rows in tables...');
  const tables = [
    'Rol', 'Usuario', 'Cliente', 'CategoriaProducto', 'Producto',
    'Proveedor', 'ProveedorProducto', 'Compra', 'DetalleCompra',
    'DetalleVenta', 'Lote', 'MovimientoInventario', 'Venta', 'AuditoriaLog', 'Auditoria'
  ];

  for (const table of tables) {
    try {
      const count = await prisma[table.charAt(0).toLowerCase() + table.slice(1)].count();
      console.log(`${table}: ${count} rows`);
    } catch (e) {
      // Try raw query if camelCase naming differs
      try {
        const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) FROM "${table}"`);
        console.log(`${table}: ${result[0].count} rows (raw)`);
      } catch (err) {
        console.log(`${table}: Error counting: ${err.message}`);
      }
    }
  }

  try {
    const users = await prisma.usuario.findMany({
      select: { id: true, nombreCompleto: true, correo: true, idRol: true, activo: true }
    });
    console.log('\nUsers in DB:', users);
  } catch (err) {
    console.error('Error fetching users:', err.message);
  }
}

main().finally(() => prisma.$disconnect());
