import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UploadsService,
  type IdentityDocumentKind,
} from '../uploads/uploads.service';
import { toPublicUploadUrl } from '../uploads/uploads-url';
import {
  docKindsForType,
  IDENTITY_DOC_TYPE_LABELS,
  IDENTITY_DOC_TYPES,
  identityDocumentField,
  isDocTypeComplete,
  memberDocumentPaths,
  resolveApprovalDocType,
  type IdentityDocType,
} from './identity-documents';
import { VerificationEventsService } from './verification-events.service';
import {
  PanelVerificationEventsService,
  type PanelVerificationChange,
} from '../panel/verification/panel-verification-events.service';

export interface PlatformVerificationSettings {
  verificationEnabled: boolean;
  emailVerificationEnabled: boolean;
  smsVerificationEnabled: boolean;
  identityVerificationRequired: boolean;
  twoFactorEnabled: boolean;
}

export interface BusinessVerificationSettingsDto {
  verificationEnabled: boolean;
  emailVerificationEnabled: boolean;
  smsVerificationEnabled: boolean;
  identityVerificationRequired: boolean;
  twoFactorRequired: boolean;
}

export interface MemberVerificationPolicyDto {
  verificationExempt: boolean;
  skipEmailVerification: boolean;
  skipSmsVerification: boolean;
  skipIdentityVerification: boolean;
  twoFactorExempt: boolean;
  skipTwoFactor: boolean;
}

export interface EffectiveVerificationRequirements {
  emailVerificationEnabled: boolean;
  smsVerificationEnabled: boolean;
  identityVerificationRequired: boolean;
}

export interface VerificationRequirementsContext {
  platform: PlatformVerificationSettings;
  business: BusinessVerificationSettingsDto;
  memberPolicy: MemberVerificationPolicyDto;
  effective: EffectiveVerificationRequirements;
  businessId: string | null;
}

export interface DocumentSetState {
  type: IdentityDocType;
  label: string;
  complete: boolean;
  pendingPanelReview: boolean;
  uploads: Record<string, boolean>;
}

export interface UserVerificationState {
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  phoneVerified: boolean;
  phoneVerifiedAt: string | null;
  identityVerified: boolean;
  identityVerifiedAt: string | null;
  identityDocType: IdentityDocType | null;
  idCardFrontUrl: string | null;
  idCardBackUrl: string | null;
  licenseFrontUrl: string | null;
  licenseBackUrl: string | null;
  passportFrontUrl: string | null;
  selfieUrl: string | null;
  identityDocuments: {
    idFrontUploaded: boolean;
    idBackUploaded: boolean;
    selfieUploaded: boolean;
    allUploaded: boolean;
    pendingPanelReview: boolean;
  };
  documentSets: DocumentSetState[];
  anyDocumentSetComplete: boolean;
  requirements: EffectiveVerificationRequirements;
  requirementsContext: VerificationRequirementsContext;
  canTrade: boolean;
  missing: string[];
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly verificationEvents: VerificationEventsService,
    private readonly panelVerificationEvents: PanelVerificationEventsService,
  ) {}

  private defaultMemberPolicy(): MemberVerificationPolicyDto {
    return {
      verificationExempt: false,
      skipEmailVerification: false,
      skipSmsVerification: false,
      skipIdentityVerification: false,
      twoFactorExempt: false,
      skipTwoFactor: false,
    };
  }

  private defaultBusinessSettings(): BusinessVerificationSettingsDto {
    return {
      verificationEnabled: true,
      emailVerificationEnabled: true,
      smsVerificationEnabled: false,
      identityVerificationRequired: true,
      twoFactorRequired: false,
    };
  }

  private serializeBusiness(row: {
    verificationEnabled: boolean;
    emailVerificationEnabled: boolean;
    smsVerificationEnabled: boolean;
    identityVerificationRequired: boolean;
    twoFactorRequired: boolean;
  }): BusinessVerificationSettingsDto {
    return {
      verificationEnabled: row.verificationEnabled,
      emailVerificationEnabled: row.emailVerificationEnabled,
      smsVerificationEnabled: row.smsVerificationEnabled,
      identityVerificationRequired: row.identityVerificationRequired,
      twoFactorRequired: row.twoFactorRequired,
    };
  }

  async ensureBusinessSettings(
    businessId: string,
  ): Promise<BusinessVerificationSettingsDto> {
    const defaults = this.defaultBusinessSettings();
    const row = await this.prisma.businessVerificationSettings.upsert({
      where: { businessId },
      create: { businessId, ...defaults },
      update: {},
    });
    return this.serializeBusiness(row);
  }

  private serializePlatform(row: {
    verificationEnabled: boolean;
    emailVerificationEnabled: boolean;
    smsVerificationEnabled: boolean;
    identityVerificationRequired: boolean;
    twoFactorEnabled: boolean;
  }): PlatformVerificationSettings {
    return {
      verificationEnabled: row.verificationEnabled,
      emailVerificationEnabled: row.emailVerificationEnabled,
      smsVerificationEnabled: row.smsVerificationEnabled,
      identityVerificationRequired: row.identityVerificationRequired,
      twoFactorEnabled: row.twoFactorEnabled,
    };
  }

  async ensurePlatformSettings(): Promise<PlatformVerificationSettings> {
    const defaults = this.defaultBusinessSettings();
    const row = await this.prisma.platformSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        verificationEnabled: defaults.verificationEnabled,
        emailVerificationEnabled: defaults.emailVerificationEnabled,
        smsVerificationEnabled: defaults.smsVerificationEnabled,
        identityVerificationRequired: defaults.identityVerificationRequired,
        twoFactorEnabled: defaults.twoFactorRequired,
      },
      update: {},
    });
    return this.serializePlatform(row);
  }

  async getSettings(): Promise<PlatformVerificationSettings> {
    return this.ensurePlatformSettings();
  }

  async updateSettings(body: Partial<PlatformVerificationSettings>) {
    await this.ensurePlatformSettings();
    const row = await this.prisma.platformSettings.update({
      where: { id: 'default' },
      data: {
        ...(body.verificationEnabled !== undefined && {
          verificationEnabled: body.verificationEnabled,
        }),
        ...(body.emailVerificationEnabled !== undefined && {
          emailVerificationEnabled: body.emailVerificationEnabled,
        }),
        ...(body.smsVerificationEnabled !== undefined && {
          smsVerificationEnabled: body.smsVerificationEnabled,
        }),
        ...(body.identityVerificationRequired !== undefined && {
          identityVerificationRequired: body.identityVerificationRequired,
        }),
        ...(body.twoFactorEnabled !== undefined && {
          twoFactorEnabled: body.twoFactorEnabled,
        }),
      },
    });
    return this.serializePlatform(row);
  }

  async getBusinessSettings(
    businessId: string,
  ): Promise<BusinessVerificationSettingsDto> {
    return this.ensureBusinessSettings(businessId);
  }

  async updateBusinessSettings(
    businessId: string,
    body: Partial<BusinessVerificationSettingsDto>,
  ) {
    await this.ensureBusinessSettings(businessId);
    const row = await this.prisma.businessVerificationSettings.update({
      where: { businessId },
      data: {
        ...(body.verificationEnabled !== undefined && {
          verificationEnabled: body.verificationEnabled,
        }),
        ...(body.emailVerificationEnabled !== undefined && {
          emailVerificationEnabled: body.emailVerificationEnabled,
        }),
        ...(body.smsVerificationEnabled !== undefined && {
          smsVerificationEnabled: body.smsVerificationEnabled,
        }),
        ...(body.identityVerificationRequired !== undefined && {
          identityVerificationRequired: body.identityVerificationRequired,
        }),
        ...(body.twoFactorRequired !== undefined && {
          twoFactorRequired: body.twoFactorRequired,
        }),
      },
    });
    return this.serializeBusiness(row);
  }

  async getMemberPolicy(
    userId: string,
    businessId?: string,
  ): Promise<MemberVerificationPolicyDto> {
    const resolved = await this.resolveBusinessId(userId, businessId);
    if (!resolved) return this.defaultMemberPolicy();
    const row = await this.prisma.memberVerificationPolicy.findUnique({
      where: { userId_businessId: { userId, businessId: resolved } },
    });
    if (!row) return this.defaultMemberPolicy();
    return {
      verificationExempt: row.verificationExempt,
      skipEmailVerification: row.skipEmailVerification,
      skipSmsVerification: row.skipSmsVerification,
      skipIdentityVerification: row.skipIdentityVerification,
      twoFactorExempt: row.twoFactorExempt,
      skipTwoFactor: row.skipTwoFactor,
    };
  }

  async updateMemberPolicy(
    userId: string,
    body: Partial<MemberVerificationPolicyDto>,
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
        verificationExempt: body.verificationExempt ?? false,
        skipEmailVerification: body.skipEmailVerification ?? false,
        skipSmsVerification: body.skipSmsVerification ?? false,
        skipIdentityVerification: body.skipIdentityVerification ?? false,
        twoFactorExempt: body.twoFactorExempt ?? false,
        skipTwoFactor: body.skipTwoFactor ?? false,
      },
      update: {
        ...(body.verificationExempt !== undefined && {
          verificationExempt: body.verificationExempt,
        }),
        ...(body.skipEmailVerification !== undefined && {
          skipEmailVerification: body.skipEmailVerification,
        }),
        ...(body.skipSmsVerification !== undefined && {
          skipSmsVerification: body.skipSmsVerification,
        }),
        ...(body.skipIdentityVerification !== undefined && {
          skipIdentityVerification: body.skipIdentityVerification,
        }),
        ...(body.twoFactorExempt !== undefined && {
          twoFactorExempt: body.twoFactorExempt,
        }),
        ...(body.skipTwoFactor !== undefined && {
          skipTwoFactor: body.skipTwoFactor,
        }),
      },
    });
    return {
      verificationExempt: row.verificationExempt,
      skipEmailVerification: row.skipEmailVerification,
      skipSmsVerification: row.skipSmsVerification,
      skipIdentityVerification: row.skipIdentityVerification,
      twoFactorExempt: row.twoFactorExempt,
      skipTwoFactor: row.skipTwoFactor,
    };
  }

  private async resolveBusinessId(
    userId: string,
    businessId?: string,
    opts?: { fallbackOnInvalid?: boolean; allowedBusinessIds?: string[] | null },
  ): Promise<string | null> {
    const allowed = opts?.allowedBusinessIds;
    const isAllowed = (bid: string) => !allowed || allowed.includes(bid);
    const id = businessId?.trim();
    if (id) {
      const membership = await this.prisma.businessMembership.findUnique({
        where: { userId_businessId: { userId, businessId: id } },
      });
      if (membership && isAllowed(id)) return id;
      if (!opts?.fallbackOnInvalid) return null;
    }
    const memberships = await this.prisma.businessMembership.findMany({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
      select: { businessId: true },
    });
    const first = memberships.find((m) => isAllowed(m.businessId));
    return first?.businessId ?? null;
  }

  /**
   * Panel: müşterinin geçerli işletmesini çöz (admin işletme ataması gerektirmez).
   * `allowedBusinessIds` verilirse personel yalnızca yetkili olduğu işletmeye çözülür.
   */
  async resolvePanelMemberBusinessId(
    userId: string,
    businessId?: string,
    allowedBusinessIds?: string[] | null,
  ): Promise<string> {
    const resolved = await this.resolveBusinessId(userId, businessId, {
      fallbackOnInvalid: true,
      allowedBusinessIds,
    });
    if (!resolved) {
      throw new BadRequestException('Müşterinin kayıtlı olduğu işletme yok');
    }
    return resolved;
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

  async resolveRequirementsContext(
    userId: string,
    businessId?: string,
  ): Promise<VerificationRequirementsContext> {
    const resolvedBusinessId = await this.resolveBusinessId(userId, businessId);

    const [platform, business, memberRow] = await Promise.all([
      this.ensurePlatformSettings(),
      resolvedBusinessId
        ? this.ensureBusinessSettings(resolvedBusinessId)
        : Promise.resolve(this.defaultBusinessSettings()),
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

    const memberPolicy: MemberVerificationPolicyDto = memberRow
      ? {
          verificationExempt: memberRow.verificationExempt,
          skipEmailVerification: memberRow.skipEmailVerification,
          skipSmsVerification: memberRow.skipSmsVerification,
          skipIdentityVerification: memberRow.skipIdentityVerification,
          twoFactorExempt: memberRow.twoFactorExempt,
          skipTwoFactor: memberRow.skipTwoFactor,
        }
      : this.defaultMemberPolicy();

    const effective: EffectiveVerificationRequirements = {
      emailVerificationEnabled: this.resolveField(
        platform.emailVerificationEnabled,
        business.emailVerificationEnabled,
        memberPolicy.skipEmailVerification,
        platform.verificationEnabled,
        business.verificationEnabled,
        memberPolicy.verificationExempt,
      ),
      smsVerificationEnabled: this.resolveField(
        platform.smsVerificationEnabled,
        business.smsVerificationEnabled,
        memberPolicy.skipSmsVerification,
        platform.verificationEnabled,
        business.verificationEnabled,
        memberPolicy.verificationExempt,
      ),
      identityVerificationRequired: this.resolveField(
        platform.identityVerificationRequired,
        business.identityVerificationRequired,
        memberPolicy.skipIdentityVerification,
        platform.verificationEnabled,
        business.verificationEnabled,
        memberPolicy.verificationExempt,
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

  private generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private async requireResolvedBusinessId(
    userId: string,
    businessId?: string,
  ): Promise<string> {
    const resolved = await this.resolveBusinessId(userId, businessId);
    if (!resolved) {
      throw new BadRequestException('İşletme bağlamı gerekli');
    }
    return resolved;
  }

  async ensureMemberVerificationStatus(userId: string, businessId: string) {
    return this.prisma.memberVerificationStatus.upsert({
      where: { userId_businessId: { userId, businessId } },
      create: { userId, businessId },
      update: {},
    });
  }

  private async getMemberVerificationStatus(
    userId: string,
    businessId: string,
  ) {
    return this.ensureMemberVerificationStatus(userId, businessId);
  }

  private serializeMemberVerification(
    row: {
      emailVerified: boolean;
      emailVerifiedAt: Date | null;
      phoneVerified: boolean;
      phoneVerifiedAt: Date | null;
      identityVerified: boolean;
      identityVerifiedAt: Date | null;
      identityDocType?: string | null;
      idCardFrontPath: string | null;
      idCardBackPath: string | null;
      licenseFrontPath?: string | null;
      licenseBackPath?: string | null;
      passportFrontPath?: string | null;
      selfiePath: string | null;
    },
    identityRequired: boolean,
  ) {
    const paths = memberDocumentPaths(row);
    const idFrontUploaded = Boolean(row.idCardFrontPath);
    const idBackUploaded = Boolean(row.idCardBackPath);
    const selfieUploaded = Boolean(row.selfiePath);
    const idCardComplete = isDocTypeComplete(paths, 'id-card');
    const anyDocumentSetComplete = IDENTITY_DOC_TYPES.some((type) =>
      isDocTypeComplete(paths, type),
    );

    const documentSets: DocumentSetState[] = IDENTITY_DOC_TYPES.map((type) => {
      const kinds = docKindsForType(type);
      const uploads: Record<string, boolean> = {};
      for (const kind of kinds) {
        uploads[kind] = Boolean(paths[identityDocumentField(kind)]);
      }
      const complete = isDocTypeComplete(paths, type);
      return {
        type,
        label: IDENTITY_DOC_TYPE_LABELS[type],
        complete,
        pendingPanelReview:
          identityRequired && complete && !row.identityVerified,
        uploads,
      };
    });

    return {
      emailVerified: row.emailVerified,
      emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
      phoneVerified: row.phoneVerified,
      phoneVerifiedAt: row.phoneVerifiedAt?.toISOString() ?? null,
      identityVerified: row.identityVerified,
      identityVerifiedAt: row.identityVerifiedAt?.toISOString() ?? null,
      identityDocType: (row.identityDocType as IdentityDocType | null) ?? null,
      idCardFrontUrl: toPublicUploadUrl(row.idCardFrontPath),
      idCardBackUrl: toPublicUploadUrl(row.idCardBackPath),
      licenseFrontUrl: toPublicUploadUrl(row.licenseFrontPath ?? null),
      licenseBackUrl: toPublicUploadUrl(row.licenseBackPath ?? null),
      passportFrontUrl: toPublicUploadUrl(row.passportFrontPath ?? null),
      selfieUrl: toPublicUploadUrl(row.selfiePath),
      idCardFrontPath: row.idCardFrontPath,
      idCardBackPath: row.idCardBackPath,
      licenseFrontPath: row.licenseFrontPath ?? null,
      licenseBackPath: row.licenseBackPath ?? null,
      passportFrontPath: row.passportFrontPath ?? null,
      selfiePath: row.selfiePath,
      identityDocuments: {
        idFrontUploaded,
        idBackUploaded,
        selfieUploaded,
        allUploaded: idCardComplete,
        pendingPanelReview: false,
      },
      documentSets,
      anyDocumentSetComplete,
    };
  }

  private emitVerificationUpdated(
    userId: string,
    businessId: string,
    patch?: {
      emailVerified?: boolean;
      phoneVerified?: boolean;
      identityVerified?: boolean;
    },
  ) {
    this.verificationEvents.notifyUser(userId, {
      type: 'verification_updated',
      businessId,
      ...patch,
    });
  }

  private emitPanelVerificationChanged(
    userId: string,
    businessId: string,
    change?: PanelVerificationChange,
  ) {
    this.panelVerificationEvents.notify(userId, businessId, change);
  }

  private async createCode(
    userId: string,
    type: 'email' | 'sms',
    businessId: string,
  ) {
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.verificationCode.updateMany({
      where: { userId, businessId, type, usedAt: null },
      data: { usedAt: new Date() },
    });

    await this.prisma.verificationCode.create({
      data: { userId, businessId, type, code, expiresAt },
    });

    return { code, expiresAt };
  }

  /** Kod üretir; e-posta gönderimi front uygulamasının SMTP'si ile yapılır. */
  async issueEmailCode(userId: string, businessId?: string) {
    const resolved = await this.requireResolvedBusinessId(userId, businessId);
    const ctx = await this.resolveRequirementsContext(userId, resolved);
    if (!ctx.effective.emailVerificationEnabled) {
      throw new BadRequestException('E-posta doğrulaması bu hesap için kapalı');
    }

    const [user, status] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, fullName: true },
      }),
      this.getMemberVerificationStatus(userId, resolved),
    ]);
    if (!user) throw new BadRequestException('Kullanıcı bulunamadı');
    if (status.emailVerified) {
      throw new BadRequestException('E-posta zaten doğrulanmış');
    }

    const { code } = await this.createCode(userId, 'email', resolved);

    this.emitPanelVerificationChanged(userId, resolved, 'email');

    return {
      to: user.email,
      fullName: user.fullName,
      code,
    };
  }

  async sendSmsCode(userId: string, businessId?: string) {
    const resolved = await this.requireResolvedBusinessId(userId, businessId);
    const ctx = await this.resolveRequirementsContext(userId, resolved);
    if (!ctx.effective.smsVerificationEnabled) {
      throw new BadRequestException('SMS doğrulaması bu hesap için kapalı');
    }

    const [user, status] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true },
      }),
      this.getMemberVerificationStatus(userId, resolved),
    ]);
    if (!user) throw new BadRequestException('Kullanıcı bulunamadı');
    if (status.phoneVerified) {
      throw new BadRequestException('Telefon zaten doğrulanmış');
    }

    const { code } = await this.createCode(userId, 'sms', resolved);
    this.logger.log(`[SMS VERIFY] ${user.phone} -> ${code}`);
    this.emitPanelVerificationChanged(userId, resolved, 'phone');
    return { ok: true, message: 'Doğrulama kodu telefonunuza gönderildi' };
  }

  async confirmEmailCode(userId: string, code: string, businessId?: string) {
    const resolved = await this.requireResolvedBusinessId(userId, businessId);
    await this.confirmCode(userId, 'email', code, resolved);
    await this.prisma.memberVerificationStatus.update({
      where: { userId_businessId: { userId, businessId: resolved } },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });
    this.emitVerificationUpdated(userId, resolved, { emailVerified: true });
    this.emitPanelVerificationChanged(userId, resolved, 'email');
    return { ok: true };
  }

  async confirmSmsCode(userId: string, code: string, businessId?: string) {
    const resolved = await this.requireResolvedBusinessId(userId, businessId);
    await this.confirmCode(userId, 'sms', code, resolved);
    await this.prisma.memberVerificationStatus.update({
      where: { userId_businessId: { userId, businessId: resolved } },
      data: { phoneVerified: true, phoneVerifiedAt: new Date() },
    });
    this.emitVerificationUpdated(userId, resolved, { phoneVerified: true });
    this.emitPanelVerificationChanged(userId, resolved, 'phone');
    return { ok: true };
  }

  private async confirmCode(
    userId: string,
    type: 'email' | 'sms',
    code: string,
    businessId: string,
  ) {
    const normalized = code.trim();
    if (!/^\d{6}$/.test(normalized)) {
      throw new BadRequestException('Geçerli 6 haneli kod girin');
    }

    const row = await this.prisma.verificationCode.findFirst({
      where: {
        userId,
        businessId,
        type,
        code: normalized,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) throw new BadRequestException('Kod geçersiz veya süresi dolmuş');

    await this.prisma.verificationCode.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    });
  }

  async applyRegistrationDefaults(userId: string, businessId: string) {
    const ctx = await this.resolveRequirementsContext(userId, businessId);
    const now = new Date();
    const data: {
      emailVerified?: boolean;
      emailVerifiedAt?: Date;
      phoneVerified?: boolean;
      phoneVerifiedAt?: Date;
    } = {};

    await this.ensureMemberVerificationStatus(userId, businessId);

    if (!ctx.effective.emailVerificationEnabled) {
      data.emailVerified = true;
      data.emailVerifiedAt = now;
    }

    if (!ctx.effective.smsVerificationEnabled) {
      data.phoneVerified = true;
      data.phoneVerifiedAt = now;
    } else {
      await this.sendSmsCode(userId, businessId);
    }

    if (Object.keys(data).length > 0) {
      await this.prisma.memberVerificationStatus.update({
        where: { userId_businessId: { userId, businessId } },
        data,
      });
    }
  }

  async getUserVerificationState(
    userId: string,
    businessId?: string,
  ): Promise<UserVerificationState> {
    const resolved = await this.requireResolvedBusinessId(userId, businessId);
    const [ctx, statusRow] = await Promise.all([
      this.resolveRequirementsContext(userId, resolved),
      this.getMemberVerificationStatus(userId, resolved),
    ]);

    const status = this.serializeMemberVerification(
      statusRow,
      ctx.effective.identityVerificationRequired,
    );
    const settings = ctx.effective;
    const missing: string[] = [];
    if (settings.emailVerificationEnabled && !status.emailVerified) {
      missing.push('E-posta doğrulaması');
    }
    if (settings.smsVerificationEnabled && !status.phoneVerified) {
      missing.push('SMS doğrulaması');
    }
    if (settings.identityVerificationRequired && !status.identityVerified) {
      missing.push('Evrak onayı (panel)');
    }

    return {
      emailVerified: status.emailVerified,
      emailVerifiedAt: status.emailVerifiedAt,
      phoneVerified: status.phoneVerified,
      phoneVerifiedAt: status.phoneVerifiedAt,
      identityVerified: status.identityVerified,
      identityVerifiedAt: status.identityVerifiedAt,
      identityDocType: status.identityDocType,
      idCardFrontUrl: status.idCardFrontUrl,
      idCardBackUrl: status.idCardBackUrl,
      licenseFrontUrl: status.licenseFrontUrl,
      licenseBackUrl: status.licenseBackUrl,
      passportFrontUrl: status.passportFrontUrl,
      selfieUrl: status.selfieUrl,
      identityDocuments: {
        ...status.identityDocuments,
        pendingPanelReview:
          settings.identityVerificationRequired &&
          status.anyDocumentSetComplete &&
          !status.identityVerified,
      },
      documentSets: status.documentSets,
      anyDocumentSetComplete: status.anyDocumentSetComplete,
      requirements: settings,
      requirementsContext: ctx,
      canTrade: missing.length === 0,
      missing,
    };
  }

  async assertCanTrade(userId: string, businessId?: string) {
    const state = await this.getUserVerificationState(userId, businessId);
    if (!state.canTrade) {
      throw new ForbiddenException(
        `İşlem yapabilmek için doğrulama gerekli: ${state.missing.join(', ')}`,
      );
    }
  }

  async getLatestCodesForPanel(userId: string, businessId?: string) {
    const resolved = businessId
      ? await this.resolveBusinessId(userId, businessId)
      : null;
    const now = new Date();
    const codeWhere = {
      userId,
      usedAt: null,
      ...(resolved ? { businessId: resolved } : {}),
    };
    const [emailCode, smsCode] = await Promise.all([
      this.prisma.verificationCode.findFirst({
        where: { ...codeWhere, type: 'email' },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.verificationCode.findFirst({
        where: { ...codeWhere, type: 'sms' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const mapCode = (row: { code: string; expiresAt: Date } | null) =>
      row
        ? {
            code: row.code,
            expiresAt: row.expiresAt.toISOString(),
            expired: row.expiresAt <= now,
          }
        : null;

    return {
      email: mapCode(emailCode),
      sms: mapCode(smsCode),
    };
  }

  async adminApproveIdentity(userId: string, businessId?: string) {
    const resolved = await this.requireResolvedBusinessId(userId, businessId);
    const status = await this.getMemberVerificationStatus(userId, resolved);
    const paths = memberDocumentPaths(status);
    const approvalType = resolveApprovalDocType(
      status.identityDocType as IdentityDocType | null,
      paths,
    );
    return this.adminUpdateVerification(
      userId,
      {
        identityVerified: true,
        ...(approvalType ? { identityDocType: approvalType } : {}),
      },
      resolved,
    );
  }

  async setIdentityDocType(
    userId: string,
    docType: IdentityDocType,
    businessId?: string,
  ) {
    const resolved = await this.requireResolvedBusinessId(userId, businessId);
    if (!IDENTITY_DOC_TYPES.includes(docType)) {
      throw new BadRequestException('Geçersiz evrak türü');
    }
    const status = await this.getMemberVerificationStatus(userId, resolved);
    if (status.identityVerified) {
      throw new ForbiddenException('Onaylanmış evrak türü değiştirilemez');
    }
    await this.prisma.memberVerificationStatus.update({
      where: { userId_businessId: { userId, businessId: resolved } },
      data: { identityDocType: docType },
    });
    this.emitPanelVerificationChanged(userId, resolved, 'documents');
    return this.getUserVerificationState(userId, resolved);
  }

  async adminUpdateVerification(
    userId: string,
    body: {
      emailVerified?: boolean;
      phoneVerified?: boolean;
      identityVerified?: boolean;
      identityDocType?: IdentityDocType;
    },
    businessId?: string,
  ) {
    const resolved = await this.requireResolvedBusinessId(userId, businessId);
    const now = new Date();
    const data: Record<string, boolean | Date | null | string> = {};

    if (body.emailVerified === true) {
      data.emailVerified = true;
      data.emailVerifiedAt = now;
    } else if (body.emailVerified === false) {
      data.emailVerified = false;
      data.emailVerifiedAt = null;
    }

    if (body.phoneVerified === true) {
      data.phoneVerified = true;
      data.phoneVerifiedAt = now;
    } else if (body.phoneVerified === false) {
      data.phoneVerified = false;
      data.phoneVerifiedAt = null;
    }

    if (body.identityVerified === true) {
      data.identityVerified = true;
      data.identityVerifiedAt = now;
      if (body.identityDocType) {
        data.identityDocType = body.identityDocType;
      }
    } else if (body.identityVerified === false) {
      data.identityVerified = false;
      data.identityVerifiedAt = null;
      data.identityDocType = null;
    }

    await this.prisma.memberVerificationStatus.update({
      where: { userId_businessId: { userId, businessId: resolved } },
      data,
    });
    const state = await this.getUserVerificationState(userId, resolved);
    this.emitVerificationUpdated(userId, resolved, {
      emailVerified: state.emailVerified,
      phoneVerified: state.phoneVerified,
      identityVerified: state.identityVerified,
    });
    this.emitPanelVerificationChanged(
      userId,
      resolved,
      body.identityVerified !== undefined
        ? 'identity'
        : body.emailVerified !== undefined
          ? 'email'
          : body.phoneVerified !== undefined
            ? 'phone'
            : undefined,
    );
    return state;
  }

  async adminDeleteIdentityDocument(
    userId: string,
    kind: IdentityDocumentKind,
    businessId?: string,
  ) {
    const resolved = await this.requireResolvedBusinessId(userId, businessId);
    const status = await this.getMemberVerificationStatus(userId, resolved);

    const field = identityDocumentField(kind);
    const currentPath = status[field];
    if (!currentPath) {
      throw new BadRequestException('Silinecek belge bulunamadı');
    }

    await this.uploads.deleteRelativePath(currentPath);
    await this.prisma.memberVerificationStatus.update({
      where: { userId_businessId: { userId, businessId: resolved } },
      data: {
        [field]: null,
        identityVerified: false,
        identityVerifiedAt: null,
        identityDocType: null,
      },
    });

    const state = await this.getUserVerificationState(userId, resolved);
    this.emitVerificationUpdated(userId, resolved, { identityVerified: false });
    this.emitPanelVerificationChanged(userId, resolved, 'documents');
    return state;
  }
}
