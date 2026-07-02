import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { totpEnabled: true },
    select: {
      id: true,
      totpSecret: true,
      totpSetupSecret: true,
      twoFactorOfferDismissed: true,
      memberships: {
        orderBy: { joinedAt: 'asc' },
        select: { businessId: true },
      },
    },
  });

  for (const user of users) {
    const primaryBusinessId = user.memberships[0]?.businessId;
    if (!primaryBusinessId) continue;

    for (const membership of user.memberships) {
      const isPrimary = membership.businessId === primaryBusinessId;
      await prisma.memberTwoFactorSettings.upsert({
        where: {
          userId_businessId: {
            userId: user.id,
            businessId: membership.businessId,
          },
        },
        create: {
          userId: user.id,
          businessId: membership.businessId,
          totpSecret: isPrimary ? user.totpSecret : null,
          totpSetupSecret: isPrimary ? user.totpSetupSecret : null,
          totpEnabled: isPrimary,
          twoFactorOfferDismissed: isPrimary
            ? user.twoFactorOfferDismissed
            : false,
        },
        update: {
          ...(isPrimary
            ? {
                totpSecret: user.totpSecret,
                totpSetupSecret: user.totpSetupSecret,
                totpEnabled: true,
                twoFactorOfferDismissed: user.twoFactorOfferDismissed,
              }
            : {}),
        },
      });
    }
  }

  const memberships = await prisma.businessMembership.findMany({
    select: { userId: true, businessId: true },
  });
  for (const m of memberships) {
    await prisma.memberTwoFactorSettings.upsert({
      where: {
        userId_businessId: { userId: m.userId, businessId: m.businessId },
      },
      create: { userId: m.userId, businessId: m.businessId },
      update: {},
    });
  }

  console.log('İşletme bazlı 2FA ayarları hazır.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
