import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function splitSqlStatements(sql) {
  return sql
    .split(/;\s*\n/g)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

async function run() {
  const migrationPath = path.resolve('prisma/migrations/20260303_init_supabase/migration.sql');
  const rawSql = fs.readFileSync(migrationPath, 'utf8');
  const statements = splitSqlStatements(rawSql);

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(`${statement};`);
  }

  const tables = await prisma.$queryRawUnsafe(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
  );

  console.log('[schema] applied statements:', statements.length);
  console.log('[schema] tables:', tables.map((row) => row.table_name));
}

run()
  .catch((error) => {
    console.error('[schema] failed', error?.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
