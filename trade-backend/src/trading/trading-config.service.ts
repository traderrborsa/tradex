import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_TRADING_SETTINGS,
  type BusinessEffectiveSettings,
  type BusinessSettingsPartial,
  type EffectiveTradingSettings,
  mergeBusinessSettings,
  mergeTradingSettings,
  sanitizeBusinessSettingsInput,
  sanitizeMemberSettingsInput,
  stripBusinessOnlySettings,
  type TradingSettingsPartial,
} from './trading-config.types';

function jsonToBusinessPartial(value: unknown): BusinessSettingsPartial {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as BusinessSettingsPartial;
}

function jsonToMemberPartial(value: unknown): TradingSettingsPartial {
  const raw = jsonToBusinessPartial(value);
  return stripBusinessOnlySettings(raw);
}

@Injectable()
export class TradingConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getBusinessSettingsRaw(
    businessId: string,
  ): Promise<BusinessSettingsPartial> {
    const row = await this.prisma.businessTradingSettings.findUnique({
      where: { businessId },
    });
    return row ? jsonToBusinessPartial(row.config) : {};
  }

  async getMemberOverridesRaw(
    userId: string,
    businessId: string,
  ): Promise<TradingSettingsPartial> {
    const row = await this.prisma.memberTradingSettings.findUnique({
      where: { userId_businessId: { userId, businessId } },
    });
    return row ? jsonToMemberPartial(row.overrides) : {};
  }

  /** Müşteri işlem ayarları — başlangıç bakiyesi dahil değil. */
  async getEffectiveSettings(
    userId: string | null,
    businessId: string | null,
  ): Promise<EffectiveTradingSettings> {
    if (!businessId) return { ...DEFAULT_TRADING_SETTINGS };

    const businessTrading = stripBusinessOnlySettings(
      await this.getBusinessSettingsRaw(businessId),
    );
    if (!userId) return mergeTradingSettings(businessTrading);

    const memberLayer = await this.getMemberOverridesRaw(userId, businessId);
    return mergeTradingSettings(businessTrading, memberLayer);
  }

  /** İşletme ayarları — başlangıç bakiyesi dahil. */
  async getBusinessEffectiveSettings(
    businessId: string,
  ): Promise<BusinessEffectiveSettings> {
    const businessLayer = await this.getBusinessSettingsRaw(businessId);
    return mergeBusinessSettings(businessLayer);
  }

  async getBusinessInitialBalance(businessId: string): Promise<number> {
    const settings = await this.getBusinessEffectiveSettings(businessId);
    return settings.initialBalance;
  }

  async getSettingsBundle(
    userId: string,
    businessId: string,
  ): Promise<{
    defaults: EffectiveTradingSettings;
    business: TradingSettingsPartial;
    member: TradingSettingsPartial;
    effective: EffectiveTradingSettings;
    hasMemberOverrides: boolean;
  }> {
    const businessRaw = await this.getBusinessSettingsRaw(businessId);
    const business = stripBusinessOnlySettings(businessRaw);
    const member = await this.getMemberOverridesRaw(userId, businessId);
    const effective = mergeTradingSettings(business, member);
    return {
      defaults: { ...DEFAULT_TRADING_SETTINGS },
      business,
      member,
      effective,
      hasMemberOverrides: Object.keys(member).length > 0,
    };
  }

  async upsertBusinessSettings(
    businessId: string,
    input: BusinessSettingsPartial,
  ): Promise<BusinessEffectiveSettings> {
    const config = sanitizeBusinessSettingsInput(input);
    await this.prisma.businessTradingSettings.upsert({
      where: { businessId },
      create: { businessId, config: config as Prisma.InputJsonValue },
      update: { config: config as Prisma.InputJsonValue },
    });
    return this.getBusinessEffectiveSettings(businessId);
  }

  async upsertMemberSettings(
    userId: string,
    businessId: string,
    input: TradingSettingsPartial,
  ): Promise<EffectiveTradingSettings> {
    const overrides = sanitizeMemberSettingsInput(input);
    const hasValues = Object.keys(overrides).length > 0;

    if (!hasValues) {
      await this.prisma.memberTradingSettings.deleteMany({
        where: { userId, businessId },
      });
    } else {
      await this.prisma.memberTradingSettings.upsert({
        where: { userId_businessId: { userId, businessId } },
        create: {
          userId,
          businessId,
          overrides: overrides as Prisma.InputJsonValue,
        },
        update: { overrides: overrides as Prisma.InputJsonValue },
      });
    }

    return this.getEffectiveSettings(userId, businessId);
  }

  async clearMemberSettings(userId: string, businessId: string) {
    await this.prisma.memberTradingSettings.deleteMany({
      where: { userId, businessId },
    });
    return this.getEffectiveSettings(userId, businessId);
  }
}
