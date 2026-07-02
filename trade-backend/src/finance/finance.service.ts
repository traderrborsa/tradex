import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TradingAccountService } from '../trading/trading-account.service';
import { allocateDisplayId } from '../trading/transaction-display-id';
import { PanelNotificationsService } from '../panel/notifications/notifications.service';
import { MemberNotificationsService } from '../member-notifications/member-notifications.service';
import { FinanceEventsService } from '../panel/finance/finance-events.service';
import { UploadsService, type UploadedFilePayload } from '../uploads/uploads.service';
import { toPublicUploadUrl } from '../uploads/uploads-url';
import { VerificationService } from '../verification/verification.service';
import { PortfolioEventsService } from '../trading/portfolio-events.service';
import { getBankName, isValidBankCode } from './turkish-banks';

export type FinanceRequestType = 'withdrawal' | 'deposit';
export type FinanceRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

function toNum(v: unknown): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

function normalizeIban(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase();
}

function isValidTrIban(iban: string): boolean {
  return /^TR\d{24}$/.test(iban);
}

function normalizeAccountHolderName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: PanelNotificationsService,
    private readonly memberNotifications: MemberNotificationsService,
    private readonly uploads: UploadsService,
    private readonly verification: VerificationService,
    private readonly financeEvents: FinanceEventsService,
    private readonly tradingAccounts: TradingAccountService,
    private readonly portfolioEvents: PortfolioEventsService,
  ) {}

  private async accountBalance(accountId: string): Promise<number> {
    const account = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
      select: { balance: true },
    });
    if (!account) throw new NotFoundException('Trading hesabı bulunamadı');
    return toNum(account.balance);
  }

  private async notifyPortfolioBalance(
    accountId: string,
    businessId: string,
    balance?: number,
  ) {
    const account = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
      select: { userId: true, balance: true },
    });
    if (!account) return;
    this.portfolioEvents.notifyUser(
      account.userId,
      businessId,
      balance ?? toNum(account.balance),
    );
  }

  private serializeRow(row: {
    id: string;
    displayId: number | null;
    type: string;
    status: string;
    amount: unknown;
    iban: string | null;
    bankId: string | null;
    bankCode: string | null;
    accountHolderName: string | null;
    receiptPath: string | null;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    user: { id: string; email: string; fullName: string };
    bank?: { id: string; name: string; logoPath: string } | null;
  }) {
    return {
      id: row.id,
      displayId: row.displayId,
      type: row.type as FinanceRequestType,
      status: row.status as FinanceRequestStatus,
      amount: toNum(row.amount),
      iban: row.iban,
      bankId: row.bankId,
      bankCode: row.bankCode,
      bankName: row.bank?.name ?? getBankName(row.bankCode),
      bankLogoUrl: toPublicUploadUrl(row.bank?.logoPath ?? null),
      accountHolderName: row.accountHolderName,
      receiptPath: row.receiptPath,
      receiptUrl: toPublicUploadUrl(row.receiptPath),
      description: row.description,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      user: {
        id: row.user.id,
        email: row.user.email,
        fullName: row.user.fullName,
        label: `${row.displayId ?? row.id.slice(-8)} ${row.user.fullName}`,
      },
    };
  }

  private rowInclude() {
    return {
      user: { select: { id: true, email: true, fullName: true } },
      bank: { select: { id: true, name: true, logoPath: true } },
    };
  }

  async listActiveBanks(userId: string, businessId?: string) {
    const resolvedBusinessId = await this.verification
      .resolveRequirementsContext(userId, businessId)
      .then((ctx) => ctx.businessId);
    if (!resolvedBusinessId) return [];

    const rows = await this.prisma.bank.findMany({
      where: { businessId: resolvedBusinessId, isActive: true },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      logoUrl: toPublicUploadUrl(row.logoPath),
    }));
  }

  async createWithdrawal(
    userId: string,
    body: {
      iban: string;
      amount: number;
      bankId: string;
      accountHolderName: string;
      description?: string;
      businessId?: string;
    },
  ) {
    await this.verification.assertCanTrade(userId, body.businessId);
    const iban = normalizeIban(body.iban);
    if (!isValidTrIban(iban)) {
      throw new BadRequestException('Geçerli bir TR IBAN girin (TR + 24 rakam)');
    }

    const bank = await this.prisma.bank.findFirst({
      where: {
        id: body.bankId.trim(),
        isActive: true,
        businessId: (
          await this.verification.resolveRequirementsContext(
            userId,
            body.businessId,
          )
        ).businessId ?? undefined,
      },
    });
    if (!bank) {
      throw new BadRequestException('Geçerli bir banka seçin');
    }

    const accountHolderName = normalizeAccountHolderName(body.accountHolderName);
    if (accountHolderName.length < 3) {
      throw new BadRequestException('Alıcı adı en az 3 karakter olmalı');
    }

    const amount = body.amount;
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Geçerli bir tutar girin');
    }

    const ctx = await this.verification.resolveRequirementsContext(
      userId,
      body.businessId,
    );
    if (!ctx.businessId) {
      throw new BadRequestException('Geçerli işletme bağlamı gerekli');
    }

    const account = await this.tradingAccounts.getAccount(
      userId,
      ctx.businessId,
    );

    const member = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });

    const balance = await this.accountBalance(account.id);
    if (amount > balance) {
      throw new BadRequestException(
        `Yetersiz bakiye. Kullanılabilir: ${balance.toFixed(2)} ₺`,
      );
    }

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.tradingAccount.update({
        where: { id: account.id },
        data: { balance: { decrement: amount } },
      });

      const displayId = await allocateDisplayId(tx);
      return tx.financeRequest.create({
        data: {
          displayId,
          businessId: ctx.businessId!,
          userId,
          accountId: account.id,
          type: 'withdrawal',
          status: 'pending',
          amount,
          iban,
          bankId: bank.id,
          accountHolderName,
          description: body.description?.trim() || null,
        },
        include: this.rowInclude(),
      });
    });

    await this.notifications.create({
      type: 'finance_withdrawal',
      title: 'Para çekme talebi',
      message: `${member?.fullName ?? 'Müşteri'} — ${amount.toLocaleString('tr-TR')} ₺ · ${bank.name} · ${accountHolderName}`,
      href: '/panel/finance',
      data: { requestId: row.id, userId },
      businessId: ctx.businessId,
    });

    this.financeEvents.notifyFinanceChanged();
    await this.notifyPortfolioBalance(account.id, ctx.businessId!);

    return this.serializeRow(row);
  }

  async listActiveDepositBanks(userId: string, businessId?: string) {
    await this.verification.assertCanTrade(userId, businessId);
    const ctx = await this.verification.resolveRequirementsContext(
      userId,
      businessId,
    );
    if (!ctx.businessId) return [];

    const rows = await this.prisma.depositBankAccount.findMany({
      where: { businessId: ctx.businessId, isActive: true },
      include: { bank: true },
      orderBy: [{ bank: { name: 'asc' } }, { createdAt: 'asc' }],
    });
    return rows.map((row) => ({
      id: row.id,
      bankId: row.bankId,
      bankName: row.bank.name,
      bankLogoUrl: toPublicUploadUrl(row.bank.logoPath),
      accountHolderName: row.accountHolderName,
      iban: row.iban,
      description: row.description,
    }));
  }

  async createDeposit(
    userId: string,
    body: {
      amount: number;
      description?: string;
      depositBankAccountId: string;
      businessId?: string;
    },
    file: UploadedFilePayload,
  ) {
    await this.verification.assertCanTrade(userId, body.businessId);
    const amount = body.amount;
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Geçerli bir tutar girin');
    }

    const ctx = await this.verification.resolveRequirementsContext(
      userId,
      body.businessId,
    );
    if (!ctx.businessId) {
      throw new BadRequestException('Geçerli işletme bağlamı gerekli');
    }

    const pendingDeposit = await this.prisma.financeRequest.findFirst({
      where: {
        userId,
        businessId: ctx.businessId,
        type: 'deposit',
        status: 'pending',
      },
      select: { id: true },
    });
    if (pendingDeposit) {
      throw new BadRequestException(
        'Bekleyen bir para yatırma talebiniz var. Yeni talep oluşturmadan önce mevcut talebinizin onaylanmasını bekleyin.',
      );
    }

    const bankAccount = await this.prisma.depositBankAccount.findFirst({
      where: {
        id: body.depositBankAccountId,
        businessId: ctx.businessId,
        isActive: true,
      },
      include: { bank: true },
    });
    if (!bankAccount) {
      throw new BadRequestException('Geçerli bir banka hesabı seçin');
    }

    const account = await this.tradingAccounts.getAccount(userId, ctx.businessId);

    const member = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });

    const receiptPath = await this.uploads.saveFinanceReceipt(file);

    const row = await this.prisma.$transaction(async (tx) => {
      const displayId = await allocateDisplayId(tx);
      return tx.financeRequest.create({
        data: {
          displayId,
          businessId: ctx.businessId!,
          userId,
          accountId: account.id,
          type: 'deposit',
          status: 'pending',
          amount,
          depositBankAccountId: bankAccount.id,
          bankId: bankAccount.bankId,
          accountHolderName: bankAccount.accountHolderName,
          iban: bankAccount.iban,
          receiptPath,
          description: body.description?.trim() || null,
        },
        include: this.rowInclude(),
      });
    });

    await this.notifications.create({
      type: 'finance_deposit',
      title: 'Para yatırma talebi',
      message: `${member?.fullName ?? 'Müşteri'} — ${amount.toLocaleString('tr-TR')} ₺ yatırım talebi`,
      href: '/panel/finance',
      data: { requestId: row.id, userId },
      businessId: ctx.businessId,
    });

    this.financeEvents.notifyFinanceChanged();

    return this.serializeRow(row);
  }

  async listForMember(userId: string, businessId?: string) {
    const ctx = await this.verification.resolveRequirementsContext(
      userId,
      businessId,
    );
    const rows = await this.prisma.financeRequest.findMany({
      where: {
        userId,
        ...(ctx.businessId ? { businessId: ctx.businessId } : {}),
      },
      include: this.rowInclude(),
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.serializeRow(r));
  }

  async listForPanel(
    filters: {
      type?: FinanceRequestType;
      status?: FinanceRequestStatus;
      userId?: string;
    },
    userWhere: Prisma.UserWhereInput,
    businessIds?: string[],
  ) {
    const rows = await this.prisma.financeRequest.findMany({
      where: {
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        user: {
          ...userWhere,
          ...(filters.userId ? { id: filters.userId } : {}),
        },
        ...(businessIds?.length
          ? { businessId: { in: businessIds } }
          : {}),
      },
      include: this.rowInclude(),
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.serializeRow(r));
  }

  async getForPanel(id: string, userWhere: Prisma.UserWhereInput) {
    const row = await this.prisma.financeRequest.findFirst({
      where: { id, user: userWhere },
      include: this.rowInclude(),
    });
    if (!row) throw new NotFoundException('Kayıt bulunamadı');
    return this.serializeRow(row);
  }

  async updateForPanel(
    id: string,
    body: {
      status?: FinanceRequestStatus;
      amount?: number;
      iban?: string;
      bankId?: string;
      accountHolderName?: string;
      description?: string | null;
    },
    operatorUserId: string,
    userWhere: Prisma.UserWhereInput,
  ) {
    const existing = await this.prisma.financeRequest.findFirst({
      where: { id, user: userWhere },
      include: { account: { select: { id: true, balance: true } } },
    });
    if (!existing) throw new NotFoundException('Kayıt bulunamadı');

    if (existing.status !== 'pending' && body.status === 'pending') {
      throw new BadRequestException('İşlenmiş talep tekrar beklemeye alınamaz');
    }

    const nextStatus = body.status ?? (existing.status as FinanceRequestStatus);
    const nextAmount =
      body.amount != null ? body.amount : toNum(existing.amount);

    if (body.amount != null && (!Number.isFinite(nextAmount) || nextAmount <= 0)) {
      throw new BadRequestException('Geçerli bir tutar girin');
    }

    let nextIban = existing.iban;
    if (body.iban != null) {
      const iban = normalizeIban(body.iban);
      if (!isValidTrIban(iban)) {
        throw new BadRequestException('Geçerli bir TR IBAN girin');
      }
      nextIban = iban;
    }

    let nextBankId = existing.bankId;
    if (body.bankId != null) {
      const bank = await this.prisma.bank.findFirst({
        where: { id: body.bankId.trim(), isActive: true },
      });
      if (!bank) {
        throw new BadRequestException('Geçerli bir banka seçin');
      }
      nextBankId = bank.id;
    }

    let nextAccountHolderName = existing.accountHolderName;
    if (body.accountHolderName != null) {
      const name = normalizeAccountHolderName(body.accountHolderName);
      if (name.length < 3) {
        throw new BadRequestException('Alıcı adı en az 3 karakter olmalı');
      }
      nextAccountHolderName = name;
    }

    const wasPending = existing.status === 'pending';
    const willApprove = nextStatus === 'approved' && existing.status !== 'approved';
    const willReject =
      wasPending &&
      (nextStatus === 'rejected' || nextStatus === 'cancelled');
    const isWithdrawal = existing.type === 'withdrawal';
    const isDeposit = existing.type === 'deposit';
    const existingAmount = toNum(existing.amount);

    const row = await this.prisma.$transaction(async (tx) => {
      if (
        wasPending &&
        isWithdrawal &&
        body.amount != null &&
        nextAmount !== existingAmount
      ) {
        const delta = nextAmount - existingAmount;
        if (delta > 0) {
          const account = await tx.tradingAccount.findUnique({
            where: { id: existing.accountId },
            select: { balance: true },
          });
          if (!account || toNum(account.balance) < delta) {
            throw new BadRequestException('Hesap bakiyesi yetersiz');
          }
          await tx.tradingAccount.update({
            where: { id: existing.accountId },
            data: { balance: { decrement: delta } },
          });
        } else if (delta < 0) {
          await tx.tradingAccount.update({
            where: { id: existing.accountId },
            data: { balance: { increment: -delta } },
          });
        }
      }

      if (willApprove && isDeposit) {
        await tx.tradingAccount.update({
          where: { id: existing.accountId },
          data: { balance: { increment: nextAmount } },
        });
      }

      if (willReject && isWithdrawal) {
        await tx.tradingAccount.update({
          where: { id: existing.accountId },
          data: { balance: { increment: nextAmount } },
        });
      }

      return tx.financeRequest.update({
        where: { id },
        data: {
          ...(body.status != null ? { status: body.status } : {}),
          ...(body.amount != null ? { amount: nextAmount } : {}),
          ...(body.iban != null ? { iban: nextIban } : {}),
          ...(body.bankId != null ? { bankId: nextBankId } : {}),
          ...(body.accountHolderName != null
            ? { accountHolderName: nextAccountHolderName }
            : {}),
          ...(body.description !== undefined
            ? { description: body.description }
            : {}),
          ...(body.status != null && body.status !== 'pending'
            ? {
                processedAt: new Date(),
                processedByUserId: operatorUserId,
              }
            : {}),
        },
        include: this.rowInclude(),
      });
    });

    this.financeEvents.notifyFinanceChanged();

    const balanceAffected =
      (willApprove && isDeposit) ||
      (willReject && isWithdrawal) ||
      (wasPending && isWithdrawal && body.amount != null && nextAmount !== existingAmount);
    if (balanceAffected) {
      await this.notifyPortfolioBalance(
        existing.accountId,
        existing.businessId,
      );
    }

    if (body.status != null && body.status !== existing.status) {
      await this.notifyMemberFinanceStatus(existing, body.status, nextAmount);
    }

    return this.serializeRow(row);
  }

  private async notifyMemberFinanceStatus(
    existing: {
      id: string;
      userId: string;
      businessId: string;
      type: string;
      amount: unknown;
    },
    status: FinanceRequestStatus,
    amount: number,
  ) {
    if (status === 'pending') return;

    const formatted = amount.toLocaleString('tr-TR');
    const isDeposit = existing.type === 'deposit';
    const isWithdrawal = existing.type === 'withdrawal';

    if (status === 'approved' && isDeposit) {
      await this.memberNotifications.create({
        userId: existing.userId,
        businessId: existing.businessId,
        type: 'finance_deposit_approved',
        title: 'Para yatırma onaylandı',
        message: `${formatted} ₺ yatırım talebiniz onaylandı ve hesabınıza eklendi.`,
        href: '/requests',
        data: { requestId: existing.id, amount },
      });
      return;
    }

    if (status === 'rejected' && isDeposit) {
      await this.memberNotifications.create({
        userId: existing.userId,
        businessId: existing.businessId,
        type: 'finance_deposit_rejected',
        title: 'Para yatırma reddedildi',
        message: `${formatted} ₺ yatırım talebiniz reddedildi.`,
        href: '/requests',
        data: { requestId: existing.id, amount },
      });
      return;
    }

    if (status === 'approved' && isWithdrawal) {
      await this.memberNotifications.create({
        userId: existing.userId,
        businessId: existing.businessId,
        type: 'finance_withdrawal_approved',
        title: 'Para çekme onaylandı',
        message: `${formatted} ₺ çekim talebiniz onaylandı.`,
        href: '/requests',
        data: { requestId: existing.id, amount },
      });
      return;
    }

    if (
      (status === 'rejected' || status === 'cancelled') &&
      isWithdrawal
    ) {
      await this.memberNotifications.create({
        userId: existing.userId,
        businessId: existing.businessId,
        type: 'finance_withdrawal_rejected',
        title: 'Para çekme reddedildi',
        message: `${formatted} ₺ çekim talebiniz reddedildi.`,
        href: '/requests',
        data: { requestId: existing.id, amount },
      });
    }
  }

  async deleteForPanel(id: string, userWhere: Prisma.UserWhereInput) {
    const existing = await this.prisma.financeRequest.findFirst({
      where: { id, user: userWhere },
      select: {
        id: true,
        status: true,
        type: true,
        amount: true,
        accountId: true,
        businessId: true,
      },
    });
    if (!existing) throw new NotFoundException('Kayıt bulunamadı');
    if (existing.status === 'approved') {
      throw new BadRequestException('Onaylanmış talep silinemez');
    }

    await this.prisma.$transaction(async (tx) => {
      if (existing.status === 'pending' && existing.type === 'withdrawal') {
        await tx.tradingAccount.update({
          where: { id: existing.accountId },
          data: { balance: { increment: toNum(existing.amount) } },
        });
      }
      await tx.financeRequest.delete({ where: { id } });
    });

    this.financeEvents.notifyFinanceChanged();
    if (existing.status === 'pending' && existing.type === 'withdrawal') {
      await this.notifyPortfolioBalance(existing.accountId, existing.businessId);
    }

    return { ok: true };
  }
}
