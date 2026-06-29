import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TradingAccountService } from '../trading/trading-account.service';
import { PortfolioEventsService } from '../trading/portfolio-events.service';
import { allocateDisplayId } from '../trading/transaction-display-id';
import { PanelNotificationsService } from '../panel/notifications/notifications.service';
import { VerificationService } from '../verification/verification.service';

export type BonusRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

function toNum(v: unknown): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

type BonusRow = {
  id: string;
  displayId: number | null;
  status: string;
  amount: unknown;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  processedAt: Date | null;
  user: { id: string; email: string; fullName: string };
};

@Injectable()
export class BonusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: PanelNotificationsService,
    private readonly verification: VerificationService,
    private readonly tradingAccounts: TradingAccountService,
    private readonly portfolioEvents: PortfolioEventsService,
  ) {}

  private rowInclude() {
    return {
      user: { select: { id: true, email: true, fullName: true } },
    };
  }

  private serializeRow(row: BonusRow) {
    return {
      id: row.id,
      displayId: row.displayId,
      status: row.status as BonusRequestStatus,
      amount: toNum(row.amount),
      description: row.description,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      processedAt: row.processedAt?.toISOString() ?? null,
      user: {
        id: row.user.id,
        email: row.user.email,
        fullName: row.user.fullName,
        label: `${row.displayId ?? row.id.slice(-8)} ${row.user.fullName}`,
      },
    };
  }

  private async resolveBusinessId(
    userId: string,
    businessId?: string,
  ): Promise<string> {
    const ctx = await this.verification.resolveRequirementsContext(
      userId,
      businessId,
    );
    if (!ctx.businessId) {
      throw new BadRequestException('Geçerli işletme bağlamı gerekli');
    }
    return ctx.businessId;
  }

  private async notifyPortfolioBalance(accountId: string, businessId: string) {
    const account = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
      select: { userId: true, balance: true },
    });
    if (!account) return;
    this.portfolioEvents.notifyUser(
      account.userId,
      businessId,
      toNum(account.balance),
    );
  }

  // --- Müşteri (member) tarafı ---

  async createRequest(
    userId: string,
    body: { description?: string; businessId?: string },
  ) {
    // Yalnızca doğrulaması tamamlanmış (onaylı) hesaplar bonus talep edebilir.
    await this.verification.assertCanTrade(userId, body.businessId);
    const businessId = await this.resolveBusinessId(userId, body.businessId);
    const account = await this.tradingAccounts.getAccount(userId, businessId);

    const member = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });

    const row = await this.prisma.$transaction(async (tx) => {
      const displayId = await allocateDisplayId(tx);
      return tx.bonusRequest.create({
        data: {
          displayId,
          businessId,
          userId,
          accountId: account.id,
          status: 'pending',
          amount: 0,
          description: body.description?.trim() || null,
        },
        include: this.rowInclude(),
      });
    });

    await this.notifications.create({
      type: 'bonus_request',
      title: 'Bonus talebi',
      message: `${member?.fullName ?? 'Müşteri'} yeni bir bonus talebi oluşturdu`,
      href: '/panel/bonus',
      data: { requestId: row.id, userId },
      businessId,
    });

    return this.serializeRow(row);
  }

  async listMine(userId: string, businessId?: string) {
    const resolvedBusinessId = await this.resolveBusinessId(userId, businessId);
    const rows = await this.prisma.bonusRequest.findMany({
      where: { userId, businessId: resolvedBusinessId },
      include: this.rowInclude(),
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.serializeRow(r));
  }

  // --- Panel (yönetici) tarafı ---

  async listForPanel(
    filters: { status?: BonusRequestStatus; userId?: string },
    userWhere: Prisma.UserWhereInput,
    businessIds?: string[],
  ) {
    const rows = await this.prisma.bonusRequest.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        user: {
          ...userWhere,
          ...(filters.userId ? { id: filters.userId } : {}),
        },
        ...(businessIds?.length ? { businessId: { in: businessIds } } : {}),
      },
      include: this.rowInclude(),
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.serializeRow(r));
  }

  async getForPanel(id: string, userWhere: Prisma.UserWhereInput) {
    const row = await this.prisma.bonusRequest.findFirst({
      where: { id, user: userWhere },
      include: this.rowInclude(),
    });
    if (!row) throw new NotFoundException('Kayıt bulunamadı');
    return this.serializeRow(row);
  }

  /** Panelden doğrudan bonus girişi: müşteriye anında tanımlanır ve bakiyeye eklenir. */
  async createForPanel(
    body: {
      userId: string;
      businessId: string;
      amount: number;
      description?: string;
    },
    operatorUserId: string,
    userWhere: Prisma.UserWhereInput,
  ) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Geçerli bir bonus tutarı girin');
    }
    if (!body.userId || !body.businessId) {
      throw new BadRequestException('Müşteri ve işletme gerekli');
    }

    const member = await this.prisma.user.findFirst({
      where: { id: body.userId, ...userWhere },
      select: { id: true, fullName: true },
    });
    if (!member) throw new NotFoundException('Müşteri bulunamadı');

    const account = await this.tradingAccounts.getAccount(
      body.userId,
      body.businessId,
    );

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.tradingAccount.update({
        where: { id: account.id },
        data: { balance: { increment: amount } },
      });
      const displayId = await allocateDisplayId(tx);
      return tx.bonusRequest.create({
        data: {
          displayId,
          businessId: body.businessId,
          userId: body.userId,
          accountId: account.id,
          status: 'approved',
          amount,
          description: body.description?.trim() || null,
          processedAt: new Date(),
          processedByUserId: operatorUserId,
        },
        include: this.rowInclude(),
      });
    });

    await this.notifyPortfolioBalance(account.id, body.businessId);

    return this.serializeRow(row);
  }

  async updateForPanel(
    id: string,
    body: {
      status?: BonusRequestStatus;
      amount?: number;
      description?: string | null;
    },
    operatorUserId: string,
    userWhere: Prisma.UserWhereInput,
  ) {
    const existing = await this.prisma.bonusRequest.findFirst({
      where: { id, user: userWhere },
    });
    if (!existing) throw new NotFoundException('Kayıt bulunamadı');

    if (existing.status === 'approved' && body.status === 'pending') {
      throw new BadRequestException('İşlenmiş talep tekrar beklemeye alınamaz');
    }

    let nextAmount: number | undefined;
    if (body.amount !== undefined) {
      nextAmount = Number(body.amount);
      if (!Number.isFinite(nextAmount) || nextAmount < 0) {
        throw new BadRequestException('Geçerli bir bonus tutarı girin');
      }
    }

    const willApprove =
      body.status === 'approved' && existing.status !== 'approved';
    const approveAmount =
      nextAmount !== undefined ? nextAmount : toNum(existing.amount);

    if (willApprove && (!Number.isFinite(approveAmount) || approveAmount <= 0)) {
      throw new BadRequestException(
        'Onay için geçerli bir bonus tutarı belirleyin',
      );
    }

    const settling =
      body.status === 'approved' ||
      body.status === 'rejected' ||
      body.status === 'cancelled';

    const row = await this.prisma.$transaction(async (tx) => {
      if (willApprove) {
        await tx.tradingAccount.update({
          where: { id: existing.accountId },
          data: { balance: { increment: approveAmount } },
        });
      }
      return tx.bonusRequest.update({
        where: { id },
        data: {
          ...(body.status != null ? { status: body.status } : {}),
          ...(nextAmount !== undefined ? { amount: nextAmount } : {}),
          ...(body.description !== undefined
            ? { description: body.description }
            : {}),
          ...(settling
            ? { processedAt: new Date(), processedByUserId: operatorUserId }
            : {}),
        },
        include: this.rowInclude(),
      });
    });

    if (willApprove) {
      await this.notifyPortfolioBalance(existing.accountId, existing.businessId);
    }

    return this.serializeRow(row);
  }

  async deleteForPanel(id: string, userWhere: Prisma.UserWhereInput) {
    const existing = await this.prisma.bonusRequest.findFirst({
      where: { id, user: userWhere },
      select: { id: true, status: true },
    });
    if (!existing) throw new NotFoundException('Kayıt bulunamadı');
    if (existing.status === 'approved') {
      throw new BadRequestException('Onaylanmış bonus silinemez');
    }
    await this.prisma.bonusRequest.delete({ where: { id } });
    return { ok: true };
  }
}
