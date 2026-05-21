const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const p = await prisma.producto.findFirst();
    console.log("First product:", p);
  } catch (e) {
    console.error("Error querying product:", e);
  }
}
main().finally(() => prisma.$disconnect());
