import type { Prisma } from '@prisma/client';

const SEQUENCE_ID = 'global';
const START_ID = 100_000_001;
const MAX_ID = 999_999_999;

type Tx = Prisma.TransactionClient;

export async function allocateDisplayId(tx: Tx): Promise<number> {
  const row = await tx.transactionDisplayIdSequence.upsert({
    where: { id: SEQUENCE_ID },
    create: { id: SEQUENCE_ID, nextId: START_ID },
    update: {},
  });

  let nextId = row.nextId;
  if (nextId > MAX_ID) {
    throw new Error('Display ID limitine ulaşıldı');
  }

  await tx.transactionDisplayIdSequence.update({
    where: { id: SEQUENCE_ID },
    data: { nextId: nextId + 1 },
  });

  while (true) {
    const taken =
      (await tx.position.count({ where: { displayId: nextId } })) +
      (await tx.pendingOrder.count({ where: { displayId: nextId } })) +
      (await tx.trade.count({ where: { displayId: nextId } })) +
      (await tx.financeRequest.count({ where: { displayId: nextId } }));
    if (taken === 0) return nextId;
    nextId += 1;
    if (nextId > MAX_ID) {
      throw new Error('Display ID limitine ulaşıldı');
    }
  }
}

export async function backfillDisplayIds(tx: Tx) {
  const tables: Array<
    'position' | 'pendingOrder' | 'trade'
  > = ['position', 'pendingOrder', 'trade'];

  for (const table of tables) {
    const rows =
      table === 'position'
        ? await tx.position.findMany({
            where: { displayId: null },
            select: { id: true },
            orderBy: { openedAt: 'asc' },
          })
        : table === 'pendingOrder'
          ? await tx.pendingOrder.findMany({
              where: { displayId: null },
              select: { id: true },
              orderBy: { createdAt: 'asc' },
            })
          : await tx.trade.findMany({
              where: { displayId: null },
              select: { id: true },
              orderBy: { executedAt: 'asc' },
            });

    for (const row of rows) {
      const displayId = await allocateDisplayId(tx);
      if (table === 'position') {
        await tx.position.update({
          where: { id: row.id },
          data: { displayId },
        });
      } else if (table === 'pendingOrder') {
        await tx.pendingOrder.update({
          where: { id: row.id },
          data: { displayId },
        });
      } else {
        await tx.trade.update({
          where: { id: row.id },
          data: { displayId },
        });
      }
    }
  }
}
