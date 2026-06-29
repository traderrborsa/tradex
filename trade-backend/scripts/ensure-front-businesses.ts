import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureBusinessVerificationSettings(businessId: string) {
  const platform = await prisma.platformSettings.findUnique({
    where: { id: 'default' },
  });
  await prisma.businessVerificationSettings.upsert({
    where: { businessId },
    create: {
      businessId,
      verificationEnabled: platform?.verificationEnabled ?? true,
      emailVerificationEnabled: platform?.emailVerificationEnabled ?? true,
      smsVerificationEnabled: platform?.smsVerificationEnabled ?? false,
      identityVerificationRequired:
        platform?.identityVerificationRequired ?? true,
      twoFactorRequired: platform?.twoFactorEnabled ?? false,
    },
    update: {},
  });
}

async function main() {
  const tradexPro = await prisma.business.upsert({
    where: { name: 'tradex-pro' },
    create: {
      name: 'tradex-pro',
      displayName: 'TRADEX Pro',
      slug: 'tradex-pro',
      isActive: true,
    },
    update: {
      displayName: 'TRADEX Pro',
      isActive: true,
    },
  });

  await ensureBusinessVerificationSettings(tradexPro.id);

  const tradexPrime = await prisma.business.upsert({
    where: { name: 'tradex-prime' },
    create: {
      name: 'tradex-prime',
      displayName: 'PrimeFX',
      slug: 'tradex-prime',
      isActive: true,
    },
    update: {
      displayName: 'PrimeFX',
      isActive: true,
    },
  });

  await ensureBusinessVerificationSettings(tradexPrime.id);

  const tradex = await prisma.business.findUnique({
    where: { name: 'tradex' },
    select: { id: true, displayName: true },
  });

  if (!tradex) {
    throw new Error('tradex işletmesi bulunamadı');
  }

  console.log(`trade-front: ${tradex.id}`);
  console.log(`trade-front-alt: ${tradexPro.id}`);
  console.log(`trade-front-alt-1: ${tradexPrime.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
