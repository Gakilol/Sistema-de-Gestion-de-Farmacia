const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rules = await prisma.$queryRawUnsafe(`
    SELECT tablename, rulename, definition 
    FROM pg_rules 
    WHERE schemaname = 'public';
  `);
  console.table(rules);
}

main().finally(() => prisma.$disconnect());
