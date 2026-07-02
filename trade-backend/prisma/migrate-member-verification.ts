import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      emailVerified: true,
      emailVerifiedAt: true,
      phoneVerified: true,
      phoneVerifiedAt: true,
      identityVerified: true,
      identityVerifiedAt: true,
      idCardFrontPath: true,
      idCardBackPath: true,
      selfiePath: true,
      memberships: {
        orderBy: { joinedAt: 'asc' },
        select: { businessId: true },
      },
    },
  });

  for (const user of users) {
    const primaryBusinessId = user.memberships[0]?.businessId;

    for (const membership of user.memberships) {
      const isPrimary = membership.businessId === primaryBusinessId;
      await prisma.memberVerificationStatus.upsert({
        where: {
          userId_businessId: {
            userId: user.id,
            businessId: membership.businessId,
          },
        },
        create: {
          userId: user.id,
          businessId: membership.businessId,
          emailVerified: isPrimary ? user.emailVerified : false,
          emailVerifiedAt: isPrimary ? user.emailVerifiedAt : null,
          phoneVerified: isPrimary ? user.phoneVerified : false,
          phoneVerifiedAt: isPrimary ? user.phoneVerifiedAt : null,
          identityVerified: isPrimary ? user.identityVerified : false,
          identityVerifiedAt: isPrimary ? user.identityVerifiedAt : null,
          idCardFrontPath: isPrimary ? user.idCardFrontPath : null,
          idCardBackPath: isPrimary ? user.idCardBackPath : null,
          selfiePath: isPrimary ? user.selfiePath : null,
        },
        update: {
          ...(isPrimary
            ? {
                emailVerified: user.emailVerified,
                emailVerifiedAt: user.emailVerifiedAt,
                phoneVerified: user.phoneVerified,
                phoneVerifiedAt: user.phoneVerifiedAt,
                identityVerified: user.identityVerified,
                identityVerifiedAt: user.identityVerifiedAt,
                idCardFrontPath: user.idCardFrontPath,
                idCardBackPath: user.idCardBackPath,
                selfiePath: user.selfiePath,
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
    await prisma.memberVerificationStatus.upsert({
      where: {
        userId_businessId: { userId: m.userId, businessId: m.businessId },
      },
      create: { userId: m.userId, businessId: m.businessId },
      update: {},
    });
  }

  console.log('İşletme bazlı doğrulama durumları hazır.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
