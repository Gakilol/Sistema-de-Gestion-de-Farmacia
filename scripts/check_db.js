const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('--- TABLES IN DATABASE ---');
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log(tables.map(t => t.table_name).join(', '));

  console.log('\n--- VIEWS IN DATABASE ---');
  const views = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.views 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log(views.map(v => v.table_name).join(', '));

  console.log('\n--- TRIGGERS IN DATABASE ---');
  const triggers = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT trigger_name, event_object_table 
    FROM information_schema.triggers 
    ORDER BY trigger_name;
  `);
  console.table(triggers);

  console.log('\n--- FUNCTIONS/PROCEDURES IN DATABASE ---');
  const functions = await prisma.$queryRawUnsafe(`
    SELECT routine_name, routine_type 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_type IN ('FUNCTION', 'PROCEDURE')
    ORDER BY routine_name;
  `);
  console.table(functions);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
