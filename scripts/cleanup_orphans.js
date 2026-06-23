const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up orphan test clients...');
  const result = await prisma.cliente.deleteMany({
    where: {
      OR: [
        { nombreCompleto: 'Test Largo' },
        { cedula: { startsWith: 'AAAA' } }
      ]
    }
  });
  console.log(`Deleted ${result.count} orphan clients.`);
}

main().finally(() => prisma.$disconnect());
