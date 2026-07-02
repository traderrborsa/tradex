import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    table,
    column,
  );
  return Number(rows[0]?.cnt ?? 0) > 0;
}

async function addColumnIfMissing(
  table: string,
  column: string,
  definition: string,
) {
  if (await columnExists(table, column)) return;
  await prisma.$executeRawUnsafe(
    `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`,
  );
}

async function main() {
  const defaultBusiness =
    (await prisma.business.findFirst({ where: { name: 'tradex' } })) ??
    (await prisma.business.findFirst({ orderBy: { createdAt: 'asc' } }));
  if (!defaultBusiness) {
    throw new Error('Varsayılan işletme bulunamadı — önce business seed çalıştırın');
  }
  const fallbackBusinessId = defaultBusiness.id;

  await addColumnIfMissing('TradingAccount', 'businessId', 'VARCHAR(191) NULL');
  await prisma.$executeRawUnsafe(`
    UPDATE TradingAccount ta
    LEFT JOIN (
      SELECT userId, MIN(businessId) AS businessId
      FROM BusinessMembership
      GROUP BY userId
    ) bm ON ta.userId = bm.userId
    SET ta.businessId = COALESCE(bm.businessId, ?)
    WHERE ta.businessId IS NULL
  `, fallbackBusinessId);

  await addColumnIfMissing('FinanceRequest', 'businessId', 'VARCHAR(191) NULL');
  await prisma.$executeRawUnsafe(`
    UPDATE FinanceRequest fr
    INNER JOIN TradingAccount ta ON fr.accountId = ta.id
    SET fr.businessId = ta.businessId
    WHERE fr.businessId IS NULL
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE FinanceRequest
    SET businessId = ?
    WHERE businessId IS NULL
  `, fallbackBusinessId);

  await addColumnIfMissing(
    'MemberVerificationPolicy',
    'businessId',
    'VARCHAR(191) NULL',
  );
  await prisma.$executeRawUnsafe(`
    UPDATE MemberVerificationPolicy mvp
    LEFT JOIN (
      SELECT userId, MIN(businessId) AS businessId
      FROM BusinessMembership
      GROUP BY userId
    ) bm ON mvp.userId = bm.userId
    SET mvp.businessId = COALESCE(bm.businessId, ?)
    WHERE mvp.businessId IS NULL
  `, fallbackBusinessId);

  console.log('Phase 2 kolon backfill tamamlandı.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
