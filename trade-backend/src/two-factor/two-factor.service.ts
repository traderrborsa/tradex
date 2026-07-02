import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { generateSecret, generateURI, verifySync } from 'otplib';
import { PrismaService } from '../prisma/prisma.service';

const APP_NAME = process.env.TOTP_ISSUER?.trim() || 'TRADEX';

export interface BusinessTwoFactorSettingsDto {
  verificationEnabled: boolean;
  twoFactorRequired: boolean;
}

export interface MemberTwoFactorPolicyDto {
  verificationExempt: boolean;
  twoFactorExempt: boolean;
  skipTwoFactor: boolean;
}

export interface EffectiveTwoFactorRequirements {
  twoFactorRequired: boolean;
}

export interface TwoFactorRequirementsContext {
  platform: {
    verificationEnabled: boolean;
    twoFactorEnabled: boolean;
  };
  business: BusinessTwoFactorSettingsDto;
  memberPolicy: MemberTwoFactorPolicyDto;
  effective: EffectiveTwoFactorRequirements;
  businessId: string | null;
}

export interface UserTwoFactorState {
  totpEnabled: boolean;
  canDisable: boolean;
  required: boolean;
  available: boolean;
  canOfferSetup: boolean;
  requirements: EffectiveTwoFactorRequirements;
  requirementsContext: TwoFactorRequirementsContext;
}

export interface TwoFactorLoginChallenge {
  requiresTwoFactor: true;
  pendingToken: string;
  mode: 'verify' | 'setup' | 'offer';
}

interface PendingTokenPayload {
  sub: string;
  purpose: '2fa_pending';
  businessId?: string;
  panel?: boolean;
}

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private defaultMemberPolicy(): MemberTwoFactorPolicyDto {
    return {
      verificationExempt: false,
      twoFactorExempt: false,
      skipTwoFactor: false,
    };
  }

  private resolveField(
    platformOn: boolean,
    businessOn: boolean,
    memberSkip: boolean,
    platformEnabled: boolean,
    businessEnabled: boolean,
    memberExempt: boolean,
  ): boolean {
    if (!platformEnabled || !businessEnabled || memberExempt || memberSkip) {
      return false;
    }
    return platformOn && businessOn;
  }

  private isMemberTwoFactorExempt(policy: MemberTwoFactorPolicyDto): boolean {
    return (
      policy.verificationExempt ||
      policy.twoFactorExempt ||
      policy.skipTwoFactor
    );
  }

  private isTwoFactorApplicable(ctx: TwoFactorRequirementsContext): boolean {
    return (
      ctx.platform.verificationEnabled &&
      ctx.platform.twoFactorEnabled &&
      ctx.business.verificationEnabled &&
      ctx.business.twoFactorRequired &&
      !this.isMemberTwoFactorExempt(ctx.memberPolicy)
    );
  }

  async resolveRequirementsContext(
    userId: string,
    businessId?: string,
  ): Promise<TwoFactorRequirementsContext> {
    const resolvedBusinessId = await this.resolveBusinessId(userId, businessId);

    const [platformRow, businessRow, memberRow] = await Promise.all([
      this.prisma.platformSettings.upsert({
        where: { id: 'default' },
        create: { id: 'default' },
        update: {},
      }),
      resolvedBusinessId
        ? this.prisma.businessVerificationSettings.upsert({
            where: { businessId: resolvedBusinessId },
            create: {
              businessId: resolvedBusinessId,
              verificationEnabled: true,
              emailVerificationEnabled: true,
              smsVerificationEnabled: false,
              identityVerificationRequired: true,
              twoFactorRequired: false,
            },
            update: {},
          })
        : Promise.resolve(null),
      resolvedBusinessId
        ? this.prisma.memberVerificationPolicy.findUnique({
            where: {
              userId_businessId: {
                userId,
                businessId: resolvedBusinessId,
              },
            },
          })
        : Promise.resolve(null),
    ]);

    const platform = {
      verificationEnabled: platformRow.verificationEnabled,
      twoFactorEnabled: platformRow.twoFactorEnabled,
    };

    const business: BusinessTwoFactorSettingsDto = businessRow
      ? {
          verificationEnabled: businessRow.verificationEnabled,
          twoFactorRequired: businessRow.twoFactorRequired,
        }
      : {
          verificationEnabled: true,
          twoFactorRequired: false,
        };

    const memberPolicy: MemberTwoFactorPolicyDto = memberRow
      ? {
          verificationExempt: memberRow.verificationExempt,
          twoFactorExempt: memberRow.twoFactorExempt,
          skipTwoFactor: memberRow.skipTwoFactor,
        }
      : this.defaultMemberPolicy();

    const memberExempt =
      memberPolicy.verificationExempt || memberPolicy.twoFactorExempt;

    const effective: EffectiveTwoFactorRequirements = {
      twoFactorRequired: this.resolveField(
        platform.twoFactorEnabled,
        business.twoFactorRequired,
        memberPolicy.skipTwoFactor,
        platform.verificationEnabled,
        business.verificationEnabled,
        memberExempt,
      ),
    };

    return {
      platform,
      business,
      memberPolicy,
      effective,
      businessId: resolvedBusinessId,
    };
  }

  private async resolveBusinessId(
    userId: string,
    businessId?: string,
  ): Promise<string | null> {
    const id = businessId?.trim();
    if (id) {
      const membership = await this.prisma.businessMembership.findUnique({
        where: { userId_businessId: { userId, businessId: id } },
      });
      return membership ? id : null;
    }
    const first = await this.prisma.businessMembership.findFirst({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
      select: { businessId: true },
    });
    return first?.businessId ?? null;
  }

  private isPanelScope(businessId?: string, panel = false) {
    return panel || !businessId?.trim();
  }

  async ensureMemberTwoFactorSettings(userId: string, businessId: string) {
    await this.prisma.memberTwoFactorSettings.upsert({
      where: { userId_businessId: { userId, businessId } },
      create: { userId, businessId },
      update: {},
    });
  }

  private async readTotpFlags(
    userId: string,
    businessId?: string,
    panel = false,
  ) {
    if (this.isPanelScope(businessId, panel)) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { totpEnabled: true, twoFactorOfferDismissed: true },
      });
      if (!user) throw new BadRequestException('Kullanıcı bulunamadı');
      return {
        totpEnabled: user.totpEnabled,
        twoFactorOfferDismissed: user.twoFactorOfferDismissed,
      };
    }

    const resolved = await this.resolveBusinessId(userId, businessId);
    if (!resolved) {
      throw new BadRequestException('Geçersiz işletme bağlamı');
    }

    const row = await this.prisma.memberTwoFactorSettings.upsert({
      where: { userId_businessId: { userId, businessId: resolved } },
      create: { userId, businessId: resolved },
      update: {},
      select: { totpEnabled: true, twoFactorOfferDismissed: true },
    });

    return {
      totpEnabled: row.totpEnabled,
      twoFactorOfferDismissed: row.twoFactorOfferDismissed,
    };
  }

  private async readTotpSecrets(userId: string, businessId?: string, panel = false) {
    if (this.isPanelScope(businessId, panel)) {
      return this.prisma.user.findUnique({
        where: { id: userId },
        select: { totpSecret: true, totpSetupSecret: true, totpEnabled: true },
      });
    }

    const resolved = await this.resolveBusinessId(userId, businessId);
    if (!resolved) return null;

    return this.prisma.memberTwoFactorSettings.findUnique({
      where: { userId_businessId: { userId, businessId: resolved } },
      select: { totpSecret: true, totpSetupSecret: true, totpEnabled: true },
    });
  }

  private async saveSetupSecret(
    userId: string,
    secret: string,
    businessId?: string,
    panel = false,
  ) {
    if (this.isPanelScope(businessId, panel)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { totpSetupSecret: secret },
      });
      return;
    }

    const resolved = await this.resolveBusinessId(userId, businessId);
    if (!resolved) throw new BadRequestException('Geçersiz işletme bağlamı');

    await this.prisma.memberTwoFactorSettings.upsert({
      where: { userId_businessId: { userId, businessId: resolved } },
      create: { userId, businessId: resolved, totpSetupSecret: secret },
      update: { totpSetupSecret: secret },
    });
  }

  private async activateTotp(
    userId: string,
    secret: string,
    businessId?: string,
    panel = false,
  ) {
    if (this.isPanelScope(businessId, panel)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          totpSecret: secret,
          totpSetupSecret: null,
          totpEnabled: true,
        },
      });
      return;
    }

    const resolved = await this.resolveBusinessId(userId, businessId);
    if (!resolved) throw new BadRequestException('Geçersiz işletme bağlamı');

    await this.prisma.memberTwoFactorSettings.upsert({
      where: { userId_businessId: { userId, businessId: resolved } },
      create: {
        userId,
        businessId: resolved,
        totpSecret: secret,
        totpEnabled: true,
      },
      update: {
        totpSecret: secret,
        totpSetupSecret: null,
        totpEnabled: true,
      },
    });
  }

  private async clearTotp(
    userId: string,
    businessId?: string,
    panel = false,
  ) {
    if (this.isPanelScope(businessId, panel)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          totpEnabled: false,
          totpSecret: null,
          totpSetupSecret: null,
        },
      });
      return;
    }

    const resolved = await this.resolveBusinessId(userId, businessId);
    if (!resolved) throw new BadRequestException('Geçersiz işletme bağlamı');

    await this.prisma.memberTwoFactorSettings.upsert({
      where: { userId_businessId: { userId, businessId: resolved } },
      create: { userId, businessId: resolved },
      update: {
        totpEnabled: false,
        totpSecret: null,
        totpSetupSecret: null,
      },
    });
  }

  private async dismissOfferForScope(
    userId: string,
    businessId?: string,
    panel = false,
  ) {
    if (this.isPanelScope(businessId, panel)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorOfferDismissed: true },
      });
      return;
    }

    const resolved = await this.resolveBusinessId(userId, businessId);
    if (!resolved) throw new BadRequestException('Geçersiz işletme bağlamı');

    await this.prisma.memberTwoFactorSettings.upsert({
      where: { userId_businessId: { userId, businessId: resolved } },
      create: { userId, businessId: resolved, twoFactorOfferDismissed: true },
      update: { twoFactorOfferDismissed: true },
    });
  }

  async getUserTwoFactorState(
    userId: string,
    businessId?: string,
  ): Promise<UserTwoFactorState> {
    const panel = this.isPanelScope(businessId);
    const [totp, ctx] = await Promise.all([
      this.readTotpFlags(userId, businessId, panel),
      this.resolveRequirementsContext(userId, businessId),
    ]);

    const required = ctx.effective.twoFactorRequired;
    const available = this.isTwoFactorApplicable(ctx);
    const canDisable = totp.totpEnabled;
    const canOfferSetup =
      available &&
      !totp.totpEnabled &&
      !totp.twoFactorOfferDismissed &&
      !required;

    return {
      totpEnabled: totp.totpEnabled,
      canDisable,
      required,
      available,
      canOfferSetup,
      requirements: ctx.effective,
      requirementsContext: ctx,
    };
  }

  async evaluateLogin(
    userId: string,
    businessId?: string,
    panel = false,
  ): Promise<TwoFactorLoginChallenge | null> {
    const totp = await this.readTotpFlags(
      userId,
      panel ? undefined : businessId,
      panel,
    );

    const ctx = await this.resolveRequirementsContext(
      userId,
      panel ? undefined : businessId,
    );

    if (!this.isTwoFactorApplicable(ctx)) {
      return null;
    }

    if (totp.totpEnabled) {
      return {
        requiresTwoFactor: true,
        pendingToken: this.createPendingToken(userId, businessId, panel),
        mode: 'verify',
      };
    }

    if (ctx.effective.twoFactorRequired) {
      return {
        requiresTwoFactor: true,
        pendingToken: this.createPendingToken(userId, businessId, panel),
        mode: 'setup',
      };
    }

    if (!totp.twoFactorOfferDismissed) {
      return {
        requiresTwoFactor: true,
        pendingToken: this.createPendingToken(userId, businessId, panel),
        mode: 'offer',
      };
    }

    return null;
  }

  createPendingToken(
    userId: string,
    businessId?: string,
    panel = false,
  ): string {
    const payload: PendingTokenPayload = {
      sub: userId,
      purpose: '2fa_pending',
      ...(businessId ? { businessId } : {}),
      ...(panel ? { panel: true } : {}),
    };
    return this.jwt.sign(payload, { expiresIn: '10m' });
  }

  verifyPendingToken(token: string): PendingTokenPayload {
    let payload: PendingTokenPayload;
    try {
      payload = this.jwt.verify(token) as PendingTokenPayload;
    } catch {
      throw new Unauthorized2FA('Oturum süresi doldu, tekrar giriş yapın');
    }
    if (payload.purpose !== '2fa_pending' || !payload.sub) {
      throw new Unauthorized2FA('Geçersiz doğrulama oturumu');
    }
    return payload;
  }

  async beginSetup(
    userId: string,
    email: string,
    opts?: { pendingToken?: string; businessId?: string },
  ) {
    let businessId = opts?.businessId;
    let panel = false;

    if (opts?.pendingToken) {
      const payload = this.verifyPendingToken(opts.pendingToken);
      if (payload.sub !== userId) {
        throw new ForbiddenException('Geçersiz doğrulama oturumu');
      }
      businessId = payload.businessId;
      panel = Boolean(payload.panel);
    }

    const ctx = await this.resolveRequirementsContext(
      userId,
      panel ? undefined : businessId,
    );
    if (!ctx.platform.verificationEnabled) {
      throw new BadRequestException('Doğrulama sistemi kapalı');
    }
    if (!ctx.business.verificationEnabled) {
      throw new BadRequestException('Doğrulama bu işletmede kapalı');
    }
    if (!ctx.platform.twoFactorEnabled || !ctx.business.twoFactorRequired) {
      throw new BadRequestException('2FA kapalı');
    }
    if (!this.isTwoFactorApplicable(ctx)) {
      throw new ForbiddenException('Bu müşteri için 2FA devre dışı');
    }

    const secret = generateSecret();
    await this.saveSetupSecret(userId, secret, businessId, panel);

    const otpauthUrl = generateURI({
      issuer: APP_NAME,
      label: email,
      secret,
    });
    return { secret, otpauthUrl };
  }

  async enableTotp(userId: string, code: string, businessId?: string, panel = false) {
    const row = await this.readTotpSecrets(userId, businessId, panel);
    if (!row?.totpSetupSecret) {
      throw new BadRequestException('Önce 2FA kurulumunu başlatın');
    }
    if (!this.verifyCode(row.totpSetupSecret, code)) {
      throw new BadRequestException('Doğrulama kodu hatalı');
    }

    await this.activateTotp(userId, row.totpSetupSecret, businessId, panel);
    return { ok: true };
  }

  async verifyUserCode(
    userId: string,
    code: string,
    businessId?: string,
    panel = false,
  ) {
    const row = await this.readTotpSecrets(userId, businessId, panel);
    if (!row?.totpEnabled || !row.totpSecret) {
      throw new BadRequestException('2FA etkin değil');
    }
    if (!this.verifyCode(row.totpSecret, code)) {
      throw new BadRequestException('Doğrulama kodu hatalı');
    }
    return { ok: true };
  }

  async disableTotp(userId: string, code: string, businessId?: string) {
    const panel = this.isPanelScope(businessId);
    const state = await this.getUserTwoFactorState(userId, businessId);
    if (!state.totpEnabled) {
      throw new BadRequestException('2FA zaten kapalı');
    }
    await this.verifyUserCode(userId, code, businessId, panel);
    await this.clearTotp(userId, businessId, panel);
    return { ok: true };
  }

  async completeLoginWithCode(
    pendingToken: string,
    code: string,
  ): Promise<{ userId: string; businessId?: string; panel: boolean }> {
    const payload = this.verifyPendingToken(pendingToken);
    await this.verifyUserCode(
      payload.sub,
      code,
      payload.businessId,
      Boolean(payload.panel),
    );
    return {
      userId: payload.sub,
      businessId: payload.businessId,
      panel: Boolean(payload.panel),
    };
  }

  async completeLoginSetup(
    pendingToken: string,
    code: string,
  ): Promise<{ userId: string; businessId?: string; panel: boolean }> {
    const payload = this.verifyPendingToken(pendingToken);
    await this.enableTotp(
      payload.sub,
      code,
      payload.businessId,
      Boolean(payload.panel),
    );
    return {
      userId: payload.sub,
      businessId: payload.businessId,
      panel: Boolean(payload.panel),
    };
  }

  async skipOffer(pendingToken: string) {
    const payload = this.verifyPendingToken(pendingToken);
    await this.dismissOfferForScope(
      payload.sub,
      payload.businessId,
      Boolean(payload.panel),
    );
    return {
      userId: payload.sub,
      businessId: payload.businessId,
      panel: Boolean(payload.panel),
    };
  }

  async dismissOffer(userId: string, businessId?: string) {
    const panel = this.isPanelScope(businessId);
    await this.dismissOfferForScope(userId, businessId, panel);
    return { ok: true };
  }

  private verifyCode(secret: string, code: string): boolean {
    const normalized = code.replace(/\s+/g, '');
    return verifySync({ token: normalized, secret }).valid;
  }

  /** @deprecated İşletme bazlı ayarlar kullanın — getBusinessSettings */
  async getPlatformSettings(): Promise<BusinessTwoFactorSettingsDto> {
    const row = await this.prisma.platformSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });
    return {
      verificationEnabled: row.verificationEnabled,
      twoFactorRequired: row.twoFactorEnabled,
    };
  }

  /** @deprecated İşletme bazlı ayarlar kullanın — updateBusinessSettings */
  async updatePlatformSettings(body: Partial<BusinessTwoFactorSettingsDto>) {
    await this.getPlatformSettings();
    const row = await this.prisma.platformSettings.update({
      where: { id: 'default' },
      data: {
        ...(body.verificationEnabled !== undefined && {
          verificationEnabled: body.verificationEnabled,
        }),
        ...(body.twoFactorRequired !== undefined && {
          twoFactorEnabled: body.twoFactorRequired,
        }),
      },
    });
    return {
      verificationEnabled: row.verificationEnabled,
      twoFactorRequired: row.twoFactorEnabled,
    };
  }

  async getBusinessSettings(
    businessId: string,
  ): Promise<BusinessTwoFactorSettingsDto> {
    const row = await this.prisma.businessVerificationSettings.upsert({
      where: { businessId },
      create: {
        businessId,
        verificationEnabled: true,
        emailVerificationEnabled: true,
        smsVerificationEnabled: false,
        identityVerificationRequired: true,
        twoFactorRequired: false,
      },
      update: {},
    });
    return {
      verificationEnabled: row.verificationEnabled,
      twoFactorRequired: row.twoFactorRequired,
    };
  }

  async updateBusinessSettings(
    businessId: string,
    body: Partial<BusinessTwoFactorSettingsDto>,
  ) {
    await this.getBusinessSettings(businessId);
    const row = await this.prisma.businessVerificationSettings.update({
      where: { businessId },
      data: {
        ...(body.verificationEnabled !== undefined && {
          verificationEnabled: body.verificationEnabled,
        }),
        ...(body.twoFactorRequired !== undefined && {
          twoFactorRequired: body.twoFactorRequired,
        }),
      },
    });
    return {
      verificationEnabled: row.verificationEnabled,
      twoFactorRequired: row.twoFactorRequired,
    };
  }

  async getMemberPolicy(
    userId: string,
    businessId?: string,
  ): Promise<MemberTwoFactorPolicyDto> {
    const resolved = await this.resolveBusinessId(userId, businessId);
    if (!resolved) return this.defaultMemberPolicy();
    const row = await this.prisma.memberVerificationPolicy.findUnique({
      where: { userId_businessId: { userId, businessId: resolved } },
    });
    if (!row) return this.defaultMemberPolicy();
    return {
      verificationExempt: row.verificationExempt,
      twoFactorExempt: row.twoFactorExempt,
      skipTwoFactor: row.skipTwoFactor,
    };
  }

  async updateMemberPolicy(
    userId: string,
    body: Partial<MemberTwoFactorPolicyDto>,
    businessId?: string,
  ) {
    const resolved = await this.resolveBusinessId(userId, businessId);
    if (!resolved) {
      throw new BadRequestException('İşletme bağlamı gerekli');
    }
    const row = await this.prisma.memberVerificationPolicy.upsert({
      where: { userId_businessId: { userId, businessId: resolved } },
      create: {
        userId,
        businessId: resolved,
        twoFactorExempt: body.twoFactorExempt ?? false,
        skipTwoFactor: body.skipTwoFactor ?? false,
      },
      update: {
        ...(body.twoFactorExempt !== undefined && {
          twoFactorExempt: body.twoFactorExempt,
        }),
        ...(body.skipTwoFactor !== undefined && {
          skipTwoFactor: body.skipTwoFactor,
        }),
      },
    });
    return {
      twoFactorExempt: row.twoFactorExempt,
      skipTwoFactor: row.skipTwoFactor,
    };
  }
}

export class Unauthorized2FA extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}
