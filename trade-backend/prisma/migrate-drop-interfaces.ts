import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function dropFk(table: string, column: string) {
  const rows = await prisma.$queryRawUnsafe<
    { CONSTRAINT_NAME: string }[]
  >(
    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    table,
    column,
  );
  for (const row of rows) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``,
    );
  }
}

async function dropColumnIfExists(table: string, column: string) {
  const rows = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string }[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    table,
    column,
  );
  if (rows.length === 0) return;
  await dropFk(table, column);
  await prisma.$executeRawUnsafe(
    `ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``,
  );
}

async function main() {
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS `UserInterfaceAccess`');

  await prisma.$executeRawUnsafe(
    'UPDATE `BusinessMembership` SET `registeredViaInterfaceId` = NULL WHERE `registeredViaInterfaceId` IS NOT NULL',
  );
  await dropColumnIfExists('BusinessMembership', 'registeredViaInterfaceId');
  await dropColumnIfExists('PendingOrder', 'openedViaInterfaceId');
  await dropColumnIfExists('Position', 'openedViaInterfaceId');
  await dropColumnIfExists('Trade', 'openedViaInterfaceId');

  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS `TradeInterface`');
  console.log('Arayüz tabloları ve sütunları kaldırıldı.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
