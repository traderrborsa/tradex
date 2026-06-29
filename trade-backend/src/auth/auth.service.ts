import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MEMBER_ROLE_NAME } from '../rbac/permissions.constants';
import { RbacService } from '../rbac/rbac.service';
import { TradingAccountService } from '../trading/trading-account.service';
import { TradingConfigService } from '../trading/trading-config.service';
import { VerificationService } from '../verification/verification.service';
import { TwoFactorService } from '../two-factor/two-factor.service';
import { BusinessMembershipService } from './business-membership.service';
import { AuthUserRecord } from './auth.types';
import { isValidPhone, normalizePhone } from './phone';
import type { LoginDto } from './login.dto';
import {
  isValidBirthDate,
  isValidFullName,
  normalizeFullName,
  parseBirthDate,
  type RegisterDto,
} from './register.dto';
import { isValidTcKimlikNo, normalizeTcKimlikNo } from './tc-kimlik';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly rbac: RbacService,
    private readonly businessMembership: BusinessMembershipService,
    private readonly tradingConfig: TradingConfigService,
    private readonly tradingAccounts: TradingAccountService,
    private readonly verification: VerificationService,
    private readonly twoFactor: TwoFactorService,
  ) {}

  async register(dto: RegisterDto) {
    const ctx = await this.resolveAuthContext(dto);
    const email = dto.email.trim().toLowerCase();
    const fullName = normalizeFullName(dto.fullName);
    const tcKimlikNo = normalizeTcKimlikNo(dto.tcKimlikNo);
    const phone = normalizePhone(dto.phone);
    const referenceNumber = dto.referenceNumber?.trim() || null;
    const password = dto.password;
    const registeredViaApp = dto.registeredViaApp?.trim() || null;

    if (!isValidFullName(fullName)) {
      throw new ConflictException('Ad ve soyad girin');
    }
    if (!isValidTcKimlikNo(tcKimlikNo)) {
      throw new ConflictException('Geçerli bir T.C. kimlik numarası girin');
    }
    if (!isValidBirthDate(dto.birthDate)) {
      throw new ConflictException(
        'Geçerli bir doğum tarihi girin (18 yaş ve üzeri)',
      );
    }
    const birthDate = parseBirthDate(dto.birthDate)!;
    if (!email || password.length < 6) {
      throw new ConflictException(
        'Geçerli e-posta ve en az 6 karakterli şifre gerekli',
      );
    }
    if (!isValidPhone(phone)) {
      throw new ConflictException('Geçerli bir cep telefonu numarası girin');
    }

    await this.businessMembership.assertNewMemberRegistration(ctx.businessId, {
      email,
      tcKimlikNo,
      phone,
    });

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
        email: true,
        tcKimlikNo: true,
        phone: true,
      },
    });

    if (existingUser) {
      return this.registerExistingUser(
        existingUser,
        password,
        ctx,
        registeredViaApp,
        { tcKimlikNo, phone },
      );
    }

    const existingTc = await this.prisma.user.findUnique({
      where: { tcKimlikNo },
      select: { id: true, email: true },
    });
    if (existingTc) {
      const inBusiness = await this.businessMembership.findMemberInBusiness(
        ctx.businessId,
        { tcKimlikNo },
      );
      if (inBusiness) {
        throw new ConflictException(
          'Bu T.C. kimlik numarası bu işletmede zaten kayıtlı',
        );
      }
      throw new ConflictException(
        'Bu T.C. kimlik numarası kayıtlı. Kayıtlı e-posta adresinizle giriş yapın.',
      );
    }

    const memberRole = await this.prisma.role.findFirst({
      where: { name: MEMBER_ROLE_NAME, businessId: null },
    });
    if (!memberRole) {
      throw new ConflictException('Üye rolü yapılandırılmamış');
    }

    const businessSettings =
      await this.tradingConfig.getBusinessEffectiveSettings(ctx.businessId);
    const initialBalance = businessSettings.initialBalance;
    const hash = await bcrypt.hash(password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          password: hash,
          fullName,
          birthDate,
          tcKimlikNo,
          phone,
          referenceNumber,
          accounts: {
            create: { businessId: ctx.businessId, balance: initialBalance },
          },
          roles: { create: { roleId: memberRole.id } },
          memberships: {
            create: {
              businessId: ctx.businessId,
              registeredViaBusinessId: ctx.businessId,
              registeredViaApp,
            },
          },
        },
        select: { id: true },
      });
      return created;
    });

    const profile = await this.rbac.getUserAuthProfile(user.id);
    if (!profile) throw new ConflictException('Kullanıcı oluşturulamadı');

    await this.verification.applyRegistrationDefaults(user.id, ctx.businessId);
    await this.twoFactor.ensureMemberTwoFactorSettings(user.id, ctx.businessId);

    return await this.signResponse(profile, ctx.businessId);
  }

  private async registerExistingUser(
    existingUser: {
      id: string;
      password: string;
      email: string;
      tcKimlikNo: string;
      phone: string;
    },
    password: string,
    ctx: AuthContext,
    registeredViaApp: string | null,
    identity: { tcKimlikNo: string; phone: string },
  ) {
    if (await this.rbac.isPanelUser(existingUser.id)) {
      throw new ForbiddenException(
        'Bu e-posta yönetim paneli kullanıcısına aittir',
      );
    }

    await this.businessMembership.assertExistingUserJoiningBusiness(
      ctx.businessId,
      existingUser,
      identity,
    );

    const ok = await bcrypt.compare(password, existingUser.password);
    if (!ok) {
      throw new ConflictException('Bu e-posta zaten kayıtlı');
    }

    await this.businessMembership.ensureMemberRole(existingUser.id);

    const businessSettings =
      await this.tradingConfig.getBusinessEffectiveSettings(ctx.businessId);
    await this.prisma.businessMembership.create({
      data: {
        userId: existingUser.id,
        businessId: ctx.businessId,
        registeredViaBusinessId: ctx.businessId,
        registeredViaApp,
      },
    });
    await this.tradingAccounts.ensureAccount(
      existingUser.id,
      ctx.businessId,
      businessSettings.initialBalance,
    );
    await this.verification.applyRegistrationDefaults(
      existingUser.id,
      ctx.businessId,
    );
    await this.twoFactor.ensureMemberTwoFactorSettings(
      existingUser.id,
      ctx.businessId,
    );

    const profile = await this.rbac.getUserAuthProfile(existingUser.id);
    if (!profile) throw new ConflictException('Kullanıcı bulunamadı');

    return await this.signResponse(profile, ctx.businessId);
  }

  async login(dto: LoginDto) {
    const ctx = await this.resolveAuthContext(dto);
    const user = await this.authenticate(dto.email, dto.password);

    if (await this.rbac.isPanelUser(user.id)) {
      throw new ForbiddenException(
        'Bu hesap yönetim paneli kullanıcısıdır; web uygulamasına giriş yapılamaz',
      );
    }

    const membership = await this.prisma.businessMembership.findUnique({
      where: {
        userId_businessId: {
          userId: user.id,
          businessId: ctx.businessId,
        },
      },
    });
    if (!membership) {
      throw new ForbiddenException('Bu işletmede hesabınız bulunmuyor');
    }

    await this.businessMembership.ensureMemberRole(user.id);

    const businessSettings =
      await this.tradingConfig.getBusinessEffectiveSettings(ctx.businessId);
    await this.tradingAccounts.ensureAccount(
      user.id,
      ctx.businessId,
      businessSettings.initialBalance,
    );

    const profile = await this.rbac.getUserAuthProfile(user.id);
    if (!profile) throw new UnauthorizedException('E-posta veya şifre hatalı');

    const challenge = await this.twoFactor.evaluateLogin(user.id, ctx.businessId);
    if (challenge) return challenge;

    return await this.signResponse(profile, ctx.businessId);
  }

  /** Panel girişi — işletme bağlamı yok. */
  async loginPanel(email: string, password: string) {
    const user = await this.authenticate(email, password);
    const profile = await this.rbac.getUserAuthProfile(user.id);
    if (!profile) throw new UnauthorizedException('E-posta veya şifre hatalı');

    const challenge = await this.twoFactor.evaluateLogin(
      user.id,
      undefined,
      true,
    );
    if (challenge) return challenge;

    return await this.signPanelResponse(profile);
  }

  async completeTwoFactorLogin(pendingToken: string, code: string) {
    const result = await this.twoFactor.completeLoginWithCode(
      pendingToken,
      code,
    );
    return this.finalizeLogin(result.userId, result.businessId, result.panel);
  }

  async completeTwoFactorSetup(pendingToken: string, code: string) {
    const result = await this.twoFactor.completeLoginSetup(pendingToken, code);
    return this.finalizeLogin(result.userId, result.businessId, result.panel);
  }

  async skipTwoFactorOffer(pendingToken: string) {
    const result = await this.twoFactor.skipOffer(pendingToken);
    return this.finalizeLogin(result.userId, result.businessId, result.panel);
  }

  async beginTwoFactorSetup(pendingToken: string) {
    const payload = this.twoFactor.verifyPendingToken(pendingToken);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { email: true },
    });
    if (!user) throw new UnauthorizedException();
    return this.twoFactor.beginSetup(payload.sub, user.email, {
      pendingToken,
    });
  }

  private async finalizeLogin(
    userId: string,
    businessId?: string,
    panel = false,
  ) {
    const profile = await this.rbac.getUserAuthProfile(userId);
    if (!profile) throw new UnauthorizedException();
    if (panel) {
      return await this.signPanelResponse(profile);
    }
    return await this.signResponse(profile, businessId);
  }

  private async authenticate(email: string, password: string) {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
    });
    if (!user) throw new UnauthorizedException('E-posta veya şifre hatalı');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('E-posta veya şifre hatalı');

    return user;
  }

  private async resolveAuthContext(dto: {
    businessId?: string;
  }): Promise<AuthContext> {
    if (!dto.businessId?.trim()) {
      throw new ConflictException('İşletme bilgisi gerekli');
    }

    const business = await this.businessMembership.resolveActiveBusiness(
      dto.businessId,
    );
    return { businessId: business.id };
  }

  async me(userId: string, businessId?: string) {
    const profile = await this.rbac.getUserAuthProfile(userId);
    if (!profile) throw new UnauthorizedException();
    const verification = await this.verification.getUserVerificationState(
      userId,
      businessId,
    );
    const twoFactor = await this.twoFactor.getUserTwoFactorState(
      userId,
      businessId,
    );
    return {
      ...this.publicUser(profile),
      verification,
      twoFactor,
    };
  }

  private async publicUserWithVerification(
    user: AuthUserRecord,
    businessId?: string,
  ) {
    const verification = await this.verification.getUserVerificationState(
      user.id,
      businessId,
    );
    const twoFactor = await this.twoFactor.getUserTwoFactorState(
      user.id,
      businessId,
    );
    return {
      ...this.publicUser(user),
      verification,
      twoFactor,
    };
  }

  private publicUser(user: AuthUserRecord) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles,
      permissions: user.permissions,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private async signPanelResponse(user: AuthUserRecord) {
    const accessToken = this.jwt.sign({
      sub: user.id,
      email: user.email,
      permissions: user.permissions,
    });
    const businesses = await this.rbac.getAccessibleBusinessesForPanel(user.id);
    return {
      accessToken,
      user: {
        ...this.publicUser(user),
        businesses,
      },
    };
  }

  private async signResponse(user: AuthUserRecord, businessId?: string) {
    const accessToken = this.jwt.sign({
      sub: user.id,
      email: user.email,
      permissions: user.permissions,
    });
    return {
      accessToken,
      user: await this.publicUserWithVerification(user, businessId),
    };
  }

  async enrichAuthUser(userId: string, businessId?: string) {
    const profile = await this.rbac.getUserAuthProfile(userId);
    if (!profile) throw new UnauthorizedException();
    return this.publicUserWithVerification(profile, businessId);
  }
}

interface AuthContext {
  businessId: string;
}
