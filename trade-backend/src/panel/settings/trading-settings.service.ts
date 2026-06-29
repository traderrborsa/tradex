import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from '../../rbac/rbac.service';
import { TradingConfigService } from '../../trading/trading-config.service';
import { PortfolioEventsService } from '../../trading/portfolio-events.service';
import type {
  BusinessSettingsPartial,
  TradingSettingsPartial,
} from '../../trading/trading-config.types';

@Injectable()
export class PanelTradingSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
    private readonly tradingConfig: TradingConfigService,
    private readonly portfolioEvents: PortfolioEventsService,
  ) {}

  private async assertBusinessAccess(
    viewerId: string,
    businessId: string,
    viewerIsAdmin: boolean,
  ) {
    const canAccess = await this.rbac.canAccessBusiness(
      viewerId,
      businessId,
      viewerIsAdmin,
    );
    if (!canAccess) throw new ForbiddenException('Bu işletmeye erişim yok');
  }

  async getBusinessSettings(
    businessId: string,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    await this.assertBusinessAccess(viewerId, businessId, viewerIsAdmin);
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, displayName: true },
    });
    if (!business) throw new NotFoundException('İşletme bulunamadı');

    const businessSettings =
      await this.tradingConfig.getBusinessSettingsRaw(businessId);
    const effective =
      await this.tradingConfig.getBusinessEffectiveSettings(businessId);

    return {
      businessId: business.id,
      businessName: business.displayName,
      business: businessSettings,
      effective,
    };
  }

  async updateBusinessSettings(
    businessId: string,
    settings: BusinessSettingsPartial,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    await this.assertBusinessAccess(viewerId, businessId, viewerIsAdmin);
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('İşletme bulunamadı');

    const effective = await this.tradingConfig.upsertBusinessSettings(
      businessId,
      settings,
    );

    // İşletme ayarı değişince bu işletmedeki tüm müşterilerin config'i değişir.
    const members = await this.prisma.businessMembership.findMany({
      where: { businessId },
      select: { userId: true },
    });
    for (const m of members) {
      const bundle = await this.tradingConfig.getSettingsBundle(m.userId, businessId);
      this.portfolioEvents.notifyConfig(
        m.userId,
        businessId,
        bundle.effective as unknown as Record<string, unknown>,
        bundle.hasMemberOverrides,
      );
    }

    return {
      businessId,
      business: await this.tradingConfig.getBusinessSettingsRaw(businessId),
      effective,
    };
  }

  async getMemberSettings(
    userId: string,
    businessId: string,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    if (!businessId) {
      throw new BadRequestException('businessId gerekli');
    }
    await this.assertBusinessAccess(viewerId, businessId, viewerIsAdmin);
    await this.rbac.assertCustomerAccess(userId, viewerId, viewerIsAdmin);

    const membership = await this.prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId, businessId } },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        business: { select: { id: true, displayName: true } },
      },
    });
    if (!membership) {
      throw new NotFoundException('Müşteri bu işletmeye üye değil');
    }

    const bundle = await this.tradingConfig.getSettingsBundle(userId, businessId);
    return {
      userId,
      businessId,
      user: membership.user,
      businessInfo: membership.business,
      defaults: bundle.defaults,
      business: bundle.business,
      member: bundle.member,
      effective: bundle.effective,
    };
  }

  async updateMemberSettings(
    userId: string,
    businessId: string,
    settings: TradingSettingsPartial,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    if (!businessId) {
      throw new BadRequestException('businessId gerekli');
    }
    await this.assertBusinessAccess(viewerId, businessId, viewerIsAdmin);
    await this.rbac.assertCustomerAccess(userId, viewerId, viewerIsAdmin);

    const membership = await this.prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId, businessId } },
    });
    if (!membership) {
      throw new NotFoundException('Müşteri bu işletmeye üye değil');
    }

    const effective = await this.tradingConfig.upsertMemberSettings(
      userId,
      businessId,
      settings,
    );
    const member = await this.tradingConfig.getMemberOverridesRaw(
      userId,
      businessId,
    );
    const business = await this.tradingConfig.getBusinessSettingsRaw(businessId);

    const bundle = await this.tradingConfig.getSettingsBundle(userId, businessId);
    this.portfolioEvents.notifyConfig(
      userId,
      businessId,
      bundle.effective as unknown as Record<string, unknown>,
      bundle.hasMemberOverrides,
    );

    return { userId, businessId, business, member, effective };
  }

  async clearMemberSettings(
    userId: string,
    businessId: string,
    viewerId: string,
    viewerIsAdmin: boolean,
  ) {
    if (!businessId) {
      throw new BadRequestException('businessId gerekli');
    }
    await this.assertBusinessAccess(viewerId, businessId, viewerIsAdmin);
    await this.rbac.assertCustomerAccess(userId, viewerId, viewerIsAdmin);

    const effective = await this.tradingConfig.clearMemberSettings(
      userId,
      businessId,
    );
    const bundle = await this.tradingConfig.getSettingsBundle(userId, businessId);
    this.portfolioEvents.notifyConfig(
      userId,
      businessId,
      bundle.effective as unknown as Record<string, unknown>,
      bundle.hasMemberOverrides,
    );
    return { userId, businessId, member: {}, effective };
  }
}
