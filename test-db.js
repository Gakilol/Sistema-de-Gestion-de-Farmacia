const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const counts = await prisma.cliente.count();
    console.log("Clientes count:", counts);
  } catch (e) {
    console.error("DB Error:", e);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
