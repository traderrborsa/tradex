import {
  BadRequestException,
  ConflictException,
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
import { UploadsService, type UploadedFilePayload } from '../uploads/uploads.service';
import { toPublicUploadUrl } from '../uploads/uploads-url';

export type CampaignApplicationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

function toNum(v: unknown): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

type CampaignRow = {
  id: string;
  businessId: string;
  title: string;
  description: string;
  terms: string;
  imagePath: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ApplicationRow = {
  id: string;
  displayId: number | null;
  campaignId: string;
  status: string;
  amount: unknown;
  createdAt: Date;
  updatedAt: Date;
  processedAt: Date | null;
  user: { id: string; email: string; fullName: string };
  campaign: { id: string; title: string; imagePath: string | null };
};

@Injectable()
export class CampaignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: PanelNotificationsService,
    private readonly verification: VerificationService,
    private readonly tradingAccounts: TradingAccountService,
    private readonly portfolioEvents: PortfolioEventsService,
    private readonly uploads: UploadsService,
  ) {}

  private serializeCampaign(row: CampaignRow, opts?: { hasApplied?: boolean }) {
    return {
      id: row.id,
      businessId: row.businessId,
      title: row.title,
      description: row.description,
      terms: row.terms,
      imageUrl: toPublicUploadUrl(row.imagePath),
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      ...(opts?.hasApplied !== undefined ? { hasApplied: opts.hasApplied } : {}),
    };
  }

  private applicationInclude() {
    return {
      user: { select: { id: true, email: true, fullName: true } },
      campaign: { select: { id: true, title: true, imagePath: true } },
    };
  }

  private serializeApplication(row: ApplicationRow) {
    return {
      id: row.id,
      displayId: row.displayId,
      campaignId: row.campaignId,
      status: row.status as CampaignApplicationStatus,
      amount: toNum(row.amount),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      processedAt: row.processedAt?.toISOString() ?? null,
      campaign: {
        id: row.campaign.id,
        title: row.campaign.title,
        imageUrl: toPublicUploadUrl(row.campaign.imagePath),
      },
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

  // --- Müşteri tarafı ---

  async listActiveForMember(userId: string, businessId?: string) {
    const resolvedBusinessId = await this.resolveBusinessId(userId, businessId);
    const rows = await this.prisma.campaign.findMany({
      where: { businessId: resolvedBusinessId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const applied = await this.prisma.campaignApplication.findMany({
      where: { userId, businessId: resolvedBusinessId },
      select: { campaignId: true },
    });
    const appliedSet = new Set(applied.map((a) => a.campaignId));

    return rows.map((row) =>
      this.serializeCampaign(row, { hasApplied: appliedSet.has(row.id) }),
    );
  }

  async getForMember(id: string, userId: string, businessId?: string) {
    const resolvedBusinessId = await this.resolveBusinessId(userId, businessId);
    const row = await this.prisma.campaign.findFirst({
      where: { id, businessId: resolvedBusinessId, isActive: true },
    });
    if (!row) throw new NotFoundException('Kampanya bulunamadı');

    const existing = await this.prisma.campaignApplication.findUnique({
      where: { campaignId_userId: { campaignId: id, userId } },
      select: { id: true },
    });

    return this.serializeCampaign(row, { hasApplied: Boolean(existing) });
  }

  async apply(userId: string, campaignId: string, businessId?: string) {
    await this.verification.assertCanTrade(userId, businessId);
    const resolvedBusinessId = await this.resolveBusinessId(userId, businessId);

    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        businessId: resolvedBusinessId,
        isActive: true,
      },
    });
    if (!campaign) throw new NotFoundException('Kampanya bulunamadı');

    const account = await this.tradingAccounts.getAccount(
      userId,
      resolvedBusinessId,
    );

    const member = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const displayId = await allocateDisplayId(tx);
        return tx.campaignApplication.create({
          data: {
            displayId,
            campaignId,
            businessId: resolvedBusinessId,
            userId,
            accountId: account.id,
            status: 'pending',
            amount: 0,
          },
          include: this.applicationInclude(),
        });
      });

      await this.notifications.create({
        type: 'campaign_application',
        title: 'Kampanya başvurusu',
        message: `${member?.fullName ?? 'Müşteri'} "${campaign.title}" kampanyasına başvurdu`,
        href: '/panel/bonus',
        data: { applicationId: row.id, userId, campaignId },
        businessId: resolvedBusinessId,
      });

      return this.serializeApplication(row);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Bu kampanyaya zaten başvurdunuz');
      }
      throw err;
    }
  }

  async listMyApplications(userId: string, businessId?: string) {
    const resolvedBusinessId = await this.resolveBusinessId(userId, businessId);
    const rows = await this.prisma.campaignApplication.findMany({
      where: { userId, businessId: resolvedBusinessId },
      include: this.applicationInclude(),
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.serializeApplication(r));
  }

  // --- Panel tarafı ---

  async listCampaignsForPanel(
    businessIds?: string[],
    includeInactive = false,
  ) {
    const rows = await this.prisma.campaign.findMany({
      where: {
        ...(businessIds?.length ? { businessId: { in: businessIds } } : {}),
        ...(includeInactive ? {} : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.serializeCampaign(row));
  }

  async getCampaignForPanel(id: string, businessIds?: string[]) {
    const row = await this.prisma.campaign.findFirst({
      where: {
        id,
        ...(businessIds?.length ? { businessId: { in: businessIds } } : {}),
      },
    });
    if (!row) throw new NotFoundException('Kampanya bulunamadı');
    return this.serializeCampaign(row);
  }

  async createCampaignForPanel(
    body: {
      businessId: string;
      title: string;
      description: string;
      terms: string;
      isActive?: boolean;
    },
    image: UploadedFilePayload,
    businessIds?: string[],
  ) {
    if (!body.businessId?.trim()) {
      throw new BadRequestException('İşletme gerekli');
    }
    if (businessIds?.length && !businessIds.includes(body.businessId)) {
      throw new BadRequestException('Bu işletme için yetkiniz yok');
    }
    const title = body.title?.trim();
    const description = body.description?.trim();
    const terms = body.terms?.trim();
    if (!title) throw new BadRequestException('Kampanya başlığı gerekli');
    if (!description) throw new BadRequestException('Açıklama gerekli');
    if (!terms) throw new BadRequestException('Kullanım koşulları gerekli');

    const imagePath = await this.uploads.saveCampaignImage(image);
    const row = await this.prisma.campaign.create({
      data: {
        businessId: body.businessId,
        title,
        description,
        terms,
        imagePath,
        isActive: body.isActive !== false,
      },
    });
    return this.serializeCampaign(row);
  }

  async updateCampaignForPanel(
    id: string,
    body: {
      title?: string;
      description?: string;
      terms?: string;
      isActive?: boolean;
    },
    image: UploadedFilePayload | undefined,
    businessIds?: string[],
  ) {
    const existing = await this.prisma.campaign.findFirst({
      where: {
        id,
        ...(businessIds?.length ? { businessId: { in: businessIds } } : {}),
      },
    });
    if (!existing) throw new NotFoundException('Kampanya bulunamadı');

    let imagePath: string | undefined;
    if (image) {
      imagePath = await this.uploads.saveCampaignImage(image);
      await this.uploads.deleteRelativePath(existing.imagePath);
    }

    const row = await this.prisma.campaign.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined
          ? { description: body.description.trim() }
          : {}),
        ...(body.terms !== undefined ? { terms: body.terms.trim() } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(imagePath ? { imagePath } : {}),
      },
    });
    return this.serializeCampaign(row);
  }

  async deleteCampaignForPanel(id: string, businessIds?: string[]) {
    const existing = await this.prisma.campaign.findFirst({
      where: {
        id,
        ...(businessIds?.length ? { businessId: { in: businessIds } } : {}),
      },
    });
    if (!existing) throw new NotFoundException('Kampanya bulunamadı');

    const pendingCount = await this.prisma.campaignApplication.count({
      where: { campaignId: id, status: 'pending' },
    });
    if (pendingCount > 0) {
      throw new BadRequestException(
        'Bekleyen başvuruları olan kampanya silinemez',
      );
    }

    await this.uploads.deleteRelativePath(existing.imagePath);
    await this.prisma.campaign.delete({ where: { id } });
    return { ok: true };
  }

  async listApplicationsForPanel(
    filters: {
      status?: CampaignApplicationStatus;
      userId?: string;
      campaignId?: string;
    },
    userWhere: Prisma.UserWhereInput,
    businessIds?: string[],
  ) {
    const rows = await this.prisma.campaignApplication.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
        user: {
          ...userWhere,
          ...(filters.userId ? { id: filters.userId } : {}),
        },
        ...(businessIds?.length ? { businessId: { in: businessIds } } : {}),
      },
      include: this.applicationInclude(),
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.serializeApplication(r));
  }

  async getApplicationForPanel(id: string, userWhere: Prisma.UserWhereInput) {
    const row = await this.prisma.campaignApplication.findFirst({
      where: { id, user: userWhere },
      include: this.applicationInclude(),
    });
    if (!row) throw new NotFoundException('Başvuru bulunamadı');
    return this.serializeApplication(row);
  }

  async updateApplicationForPanel(
    id: string,
    body: {
      status?: CampaignApplicationStatus;
      amount?: number;
    },
    operatorUserId: string,
    userWhere: Prisma.UserWhereInput,
  ) {
    const existing = await this.prisma.campaignApplication.findFirst({
      where: { id, user: userWhere },
    });
    if (!existing) throw new NotFoundException('Başvuru bulunamadı');

    if (existing.status === 'approved' && body.status === 'pending') {
      throw new BadRequestException('İşlenmiş başvuru tekrar beklemeye alınamaz');
    }

    let nextAmount: number | undefined;
    if (body.amount !== undefined) {
      nextAmount = Number(body.amount);
      if (!Number.isFinite(nextAmount) || nextAmount < 0) {
        throw new BadRequestException('Geçerli bir tutar girin');
      }
    }

    const willApprove =
      body.status === 'approved' && existing.status !== 'approved';
    const approveAmount =
      nextAmount !== undefined ? nextAmount : toNum(existing.amount);

    if (willApprove && (!Number.isFinite(approveAmount) || approveAmount <= 0)) {
      throw new BadRequestException(
        'Onay için geçerli bir kampanya tutarı belirleyin',
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
      return tx.campaignApplication.update({
        where: { id },
        data: {
          ...(body.status != null ? { status: body.status } : {}),
          ...(nextAmount !== undefined ? { amount: nextAmount } : {}),
          ...(settling
            ? { processedAt: new Date(), processedByUserId: operatorUserId }
            : {}),
        },
        include: this.applicationInclude(),
      });
    });

    if (willApprove) {
      await this.notifyPortfolioBalance(existing.accountId, existing.businessId);
    }

    return this.serializeApplication(row);
  }

  async deleteApplicationForPanel(id: string, userWhere: Prisma.UserWhereInput) {
    const existing = await this.prisma.campaignApplication.findFirst({
      where: { id, user: userWhere },
      select: { id: true, status: true },
    });
    if (!existing) throw new NotFoundException('Başvuru bulunamadı');
    if (existing.status === 'approved') {
      throw new BadRequestException('Onaylanmış başvuru silinemez');
    }
    await this.prisma.campaignApplication.delete({ where: { id } });
    return { ok: true };
  }
}
