const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find client IDs of orphaned clients
  const orphanedClients = await prisma.cliente.findMany({
    where: {
      OR: [
        { nombreCompleto: { startsWith: 'Cliente de Prueba' } },
        { correo: { endsWith: '@testing.com' } }
      ]
    },
    select: { id: true }
  });
  const clientIds = orphanedClients.map(c => c.id);

  if (clientIds.length > 0) {
    // Delete Details of Sales referencing these clients
    const sales = await prisma.venta.findMany({
      where: { idCliente: { in: clientIds } },
      select: { id: true }
    });
    const saleIds = sales.map(s => s.id);

    if (saleIds.length > 0) {
      await prisma.detalleVenta.deleteMany({
        where: { idVenta: { in: saleIds } }
      });
      const deletedSales = await prisma.venta.deleteMany({
        where: { id: { in: saleIds } }
      });
      console.log(`Deleted ${deletedSales.count} orphaned sales.`);
    }

    const deletedClients = await prisma.cliente.deleteMany({
      where: { id: { in: clientIds } }
    });
    console.log(`Deleted ${deletedClients.count} orphaned clients.`);
  } else {
    console.log('No orphaned clients found.');
  }
}

main().finally(() => prisma.$disconnect());
