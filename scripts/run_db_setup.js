const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function splitStatements(sql) {
  const statements = [];
  let currentStatement = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inDollarQuote = false;
  let inSingleLineComment = false;
  let inMultiLineComment = false;
  let i = 0;

  while (i < sql.length) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    if (inSingleLineComment) {
      if (char === '\n' || char === '\r') {
        inSingleLineComment = false;
        currentStatement += char;
      }
    } else if (inMultiLineComment) {
      if (char === '*' && nextChar === '/') {
        inMultiLineComment = false;
        currentStatement += '*/';
        i++;
      }
    } else if (inSingleQuote) {
      if (char === "'" && sql[i - 1] !== '\\') {
        inSingleQuote = false;
      }
      currentStatement += char;
    } else if (inDoubleQuote) {
      if (char === '"' && sql[i - 1] !== '\\') {
        inDoubleQuote = false;
      }
      currentStatement += char;
    } else if (inDollarQuote) {
      if (char === '$' && nextChar === '$') {
        inDollarQuote = false;
        currentStatement += '$$';
        i++;
      } else {
        currentStatement += char;
      }
    } else {
      if (char === '-' && nextChar === '-') {
        inSingleLineComment = true;
        currentStatement += '--';
        i++;
      } else if (char === '/' && nextChar === '*') {
        inMultiLineComment = true;
        currentStatement += '/*';
        i++;
      } else if (char === "'") {
        inSingleQuote = true;
        currentStatement += char;
      } else if (char === '"') {
        inDoubleQuote = true;
        currentStatement += char;
      } else if (char === '$' && nextChar === '$') {
        inDollarQuote = true;
        currentStatement += '$$';
        i++;
      } else if (char === ';') {
        currentStatement += char;
        const trimmed = currentStatement.trim();
        if (trimmed) {
          statements.push(trimmed);
        }
        currentStatement = '';
      } else {
        currentStatement += char;
      }
    }
    i++;
  }
  const trimmed = currentStatement.trim();
  if (trimmed) {
    statements.push(trimmed);
  }
  return statements;
}

async function runSqlFile(filePath) {
  console.log(`Reading SQL file: ${filePath}`);
  let sql = fs.readFileSync(filePath, 'utf8');
  
  // Comment out top-level RAISE NOTICE statements which are invalid in raw SQL executions
  sql = sql.replace(/^RAISE NOTICE/gm, '-- RAISE NOTICE');
  
  const statements = splitStatements(sql);
  console.log(`Split file into ${statements.length} statements.`);

  for (let idx = 0; idx < statements.length; idx++) {
    const stmt = statements[idx];
    try {
      await prisma.$executeRawUnsafe(stmt);
    } catch (error) {
      console.error(`Error executing statement #${idx + 1}:`);
      console.error(stmt);
      console.error(error);
      throw error;
    }
  }
  console.log(`Successfully executed all statements in ${filePath}`);
}

async function main() {
  const rootDir = path.join(__dirname, '..');
  const triggersFarmaciaPath = path.join(rootDir, 'prisma', 'triggers_farmacia.sql');
  const auditCompletePath = path.join(rootDir, 'prisma', 'audit_complete.sql');

  console.log('--- STARTING DATABASE SCHEMA RESTORATION ---');
  
  if (fs.existsSync(triggersFarmaciaPath)) {
    await runSqlFile(triggersFarmaciaPath);
  } else {
    console.error(`File not found: ${triggersFarmaciaPath}`);
  }

  if (fs.existsSync(auditCompletePath)) {
    await runSqlFile(auditCompletePath);
  } else {
    console.error(`File not found: ${auditCompletePath}`);
  }

  console.log('--- DATABASE SCHEMA RESTORATION COMPLETE ---');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
