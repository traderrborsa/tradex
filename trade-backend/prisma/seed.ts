import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLES,
  MEMBER_ROLE_NAME,
} from '../src/rbac/permissions.constants';
import { backfillDisplayIds } from '../src/trading/transaction-display-id';

const prisma = new PrismaClient();

async function migratePhase2BusinessScope(defaultBusinessId: string) {
  const memberships = await prisma.businessMembership.findMany({
    select: { userId: true, businessId: true },
  });
  for (const m of memberships) {
    await prisma.tradingAccount.upsert({
      where: {
        userId_businessId: { userId: m.userId, businessId: m.businessId },
      },
      create: { userId: m.userId, businessId: m.businessId, balance: 0 },
      update: {},
    });
  }

  const accounts = await prisma.tradingAccount.findMany({
    select: { id: true, businessId: true },
  });
  for (const acc of accounts) {
    await prisma.financeRequest.updateMany({
      where: { accountId: acc.id },
      data: { businessId: acc.businessId },
    });
  }

  const legacyPolicies = await prisma.memberVerificationPolicy.findMany();
  const byUser = new Map<string, typeof legacyPolicies>();
  for (const p of legacyPolicies) {
    const list = byUser.get(p.userId) ?? [];
    list.push(p);
    byUser.set(p.userId, list);
  }
  for (const [userId, policies] of byUser) {
    if (policies.length !== 1) continue;
    const policy = policies[0]!;
    if (policy.businessId !== defaultBusinessId) continue;
    const userMemberships = memberships.filter((m) => m.userId === userId);
    for (const m of userMemberships) {
      if (m.businessId === policy.businessId) continue;
      await prisma.memberVerificationPolicy.upsert({
        where: {
          userId_businessId: { userId, businessId: m.businessId },
        },
        create: {
          userId,
          businessId: m.businessId,
          verificationExempt: policy.verificationExempt,
          skipEmailVerification: policy.skipEmailVerification,
          skipSmsVerification: policy.skipSmsVerification,
          skipIdentityVerification: policy.skipIdentityVerification,
          twoFactorExempt: policy.twoFactorExempt,
          skipTwoFactor: policy.skipTwoFactor,
        },
        update: {},
      });
    }
  }
}

async function ensureBusinessVerificationSettings(businessId: string) {
  const platform = await prisma.platformSettings.findUnique({
    where: { id: 'default' },
  });
  if (platform) {
    await prisma.businessVerificationSettings.upsert({
      where: { businessId },
      create: {
        businessId,
        verificationEnabled: platform.verificationEnabled,
        emailVerificationEnabled: platform.emailVerificationEnabled,
        smsVerificationEnabled: platform.smsVerificationEnabled,
        identityVerificationRequired: platform.identityVerificationRequired,
        twoFactorRequired: platform.twoFactorEnabled,
      },
      update: {
        verificationEnabled: platform.verificationEnabled,
        emailVerificationEnabled: platform.emailVerificationEnabled,
        smsVerificationEnabled: platform.smsVerificationEnabled,
        identityVerificationRequired: platform.identityVerificationRequired,
        twoFactorRequired: platform.twoFactorEnabled,
      },
    });
  } else {
    await prisma.businessVerificationSettings.upsert({
      where: { businessId },
      create: { businessId },
      update: {},
    });
  }
}

async function migrateBusinessScopedData(defaultBusinessId: string) {
  await prisma.panelNotification.updateMany({
    where: { businessId: null },
    data: { businessId: defaultBusinessId },
  });

  await ensureBusinessVerificationSettings(defaultBusinessId);
}

async function cleanPanelUsersCustomerData() {
  const staffRows = await prisma.businessStaff.findMany({
    select: { userId: true },
    distinct: ['userId'],
  });
  const memberRole = await prisma.role.findFirst({
    where: { name: MEMBER_ROLE_NAME, businessId: null },
    select: { id: true },
  });

  for (const { userId } of staffRows) {
    await prisma.businessMembership.deleteMany({ where: { userId } });
    if (memberRole) {
      await prisma.userRoleAssignment.deleteMany({
        where: { userId, roleId: memberRole.id },
      });
    }
  }
}

async function migratePanelStaffFromMemberships() {
  const panelUsers = await prisma.user.findMany({
    where: {
      roles: { some: { role: { name: { not: MEMBER_ROLE_NAME } } } },
    },
    select: {
      id: true,
      memberships: { select: { businessId: true } },
      businessStaff: { select: { businessId: true } },
    },
  });

  for (const user of panelUsers) {
    const existingStaff = new Set(user.businessStaff.map((s) => s.businessId));
    for (const membership of user.memberships) {
      if (existingStaff.has(membership.businessId)) continue;
      await prisma.businessStaff.create({
        data: { userId: user.id, businessId: membership.businessId },
      });
    }
  }
}

async function main() {
  const permissionMap = new Map<string, string>();

  for (const perm of ALL_PERMISSIONS) {
    const row = await prisma.permission.upsert({
      where: { key: perm.key },
      create: perm,
      update: {
        displayName: perm.displayName,
        description: perm.description,
        adminOnly: perm.adminOnly,
      },
    });
    permissionMap.set(perm.key, row.id);
  }

  for (const roleDef of DEFAULT_ROLES) {
    const existingRole = await prisma.role.findFirst({
      where: { name: roleDef.name, businessId: null },
    });

    const role = existingRole
      ? await prisma.role.update({
          where: { id: existingRole.id },
          data: {
            displayName: roleDef.displayName,
            description: roleDef.description,
            isActive: roleDef.isActive,
            isHidden: roleDef.isHidden,
            isSystem: roleDef.isSystem,
          },
        })
      : await prisma.role.create({
          data: {
            businessId: null,
            name: roleDef.name,
            displayName: roleDef.displayName,
            description: roleDef.description,
            isActive: roleDef.isActive,
            isHidden: roleDef.isHidden,
            isSystem: roleDef.isSystem,
          },
        });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const permKey of roleDef.permissions) {
      const permissionId = permissionMap.get(permKey);
      if (!permissionId) continue;
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId },
      });
    }
  }

  const adminEmail = (
    process.env.PANEL_ADMIN_EMAIL ?? 'admin@tradex.local'
  ).toLowerCase();
  const adminPassword = process.env.PANEL_ADMIN_PASSWORD ?? 'admin123';
  const adminRole = await prisma.role.findFirst({
    where: { name: 'admin', businessId: null },
  });
  if (!adminRole) return;

  const tradexBusiness = await prisma.business.upsert({
    where: { name: 'tradex' },
    create: {
      name: 'tradex',
      displayName: 'TRADEX',
      slug: 'tradex',
      isActive: true,
    },
    update: {
      displayName: 'TRADEX',
      isActive: true,
    },
  });

  const tradexProBusiness = await prisma.business.upsert({
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

  const tradexPrimeBusiness = await prisma.business.upsert({
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

  await migrateBusinessScopedData(tradexBusiness.id);
  await ensureBusinessVerificationSettings(tradexProBusiness.id);
  await ensureBusinessVerificationSettings(tradexPrimeBusiness.id);
  await migratePhase2BusinessScope(tradexBusiness.id);
  await migratePanelStaffFromMemberships();
  await cleanPanelUsersCustomerData();

  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser) {
    const hash = await bcrypt.hash(adminPassword, 10);
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hash,
        fullName: 'Panel Yöneticisi',
        tcKimlikNo: '60412347018',
        phone: '5550000001',
        accounts: {
          create: { businessId: tradexBusiness.id, balance: 10000 },
        },
      },
    });
    console.log(`Admin kullanıcı oluşturuldu: ${adminEmail}`);
  } else {
    await prisma.tradingAccount.upsert({
      where: {
        userId_businessId: {
          userId: adminUser.id,
          businessId: tradexBusiness.id,
        },
      },
      create: {
        userId: adminUser.id,
        businessId: tradexBusiness.id,
        balance: 10000,
      },
      update: {},
    });
  }

  await prisma.userRoleAssignment.upsert({
    where: {
      userId_roleId: { userId: adminUser.id, roleId: adminRole.id },
    },
    create: { userId: adminUser.id, roleId: adminRole.id },
    update: {},
  });

  console.log('RBAC seed tamamlandı.');
  console.log(`Panel giriş: ${adminEmail} / ${adminPassword}`);
  console.log(`TRADEX işletme ID: ${tradexBusiness.id}`);
  console.log(`TRADEX Pro işletme ID: ${tradexProBusiness.id}`);
  console.log(`trade-front .env: NEXT_PUBLIC_BUSINESS_ID=${tradexBusiness.id}`);
  console.log(
    `trade-front-alt .env: NEXT_PUBLIC_BUSINESS_ID=${tradexProBusiness.id}`,
  );
  console.log(
    `trade-front-alt-1 .env: NEXT_PUBLIC_BUSINESS_ID=${tradexPrimeBusiness.id}`,
  );

  await prisma.platformSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default' },
    update: {},
  });

  await prisma.$transaction(async (tx) => {
    await backfillDisplayIds(tx);
  });
  console.log('İşlem display ID backfill tamamlandı.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
