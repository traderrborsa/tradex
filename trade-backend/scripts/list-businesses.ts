import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.business.findMany({
    select: { id: true, name: true, slug: true, displayName: true },
    orderBy: { name: 'asc' },
  });
  console.log(JSON.stringify(rows, null, 2));
}

main()
  .finally(() => prisma.$disconnect());
