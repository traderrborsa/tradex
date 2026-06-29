import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PERMISSIONS } from '../../rbac/permissions.constants';
import { PermissionsGuard } from '../../rbac/permissions.guard';
import { RequirePermissions } from '../../rbac/require-permissions.decorator';
import { RbacService } from '../../rbac/rbac.service';
import { VerificationService } from '../../verification/verification.service';
import { TwoFactorService } from '../../two-factor/two-factor.service';
import { resolvePanelBusinessIds } from '../panel-business-scope';

@Controller('panel/settings/verification')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelVerificationSettingsController {
  constructor(private readonly verification: VerificationService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PANEL_SETTINGS_READ)
  getSettings() {
    return this.verification.getSettings();
  }

  @Put()
  @RequirePermissions(PERMISSIONS.PANEL_SETTINGS_WRITE)
  updateSettings(
    @Body()
    body: {
      verificationEnabled?: boolean;
      emailVerificationEnabled?: boolean;
      smsVerificationEnabled?: boolean;
      identityVerificationRequired?: boolean;
      twoFactorEnabled?: boolean;
    },
  ) {
    return this.verification.updateSettings(body);
  }
}

@Controller('panel/businesses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelBusinessVerificationController {
  constructor(
    private readonly verification: VerificationService,
    private readonly rbac: RbacService,
  ) {}

  @Get(':id/verification-settings')
  @RequirePermissions(PERMISSIONS.PANEL_BUSINESS_VERIFICATION_SETTINGS_READ)
  async getBusinessSettings(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    await resolvePanelBusinessIds(this.rbac, req.user.id, viewerIsAdmin, id);
    return this.verification.getBusinessSettings(id);
  }

  @Put(':id/verification-settings')
  @RequirePermissions(PERMISSIONS.PANEL_BUSINESS_VERIFICATION_SETTINGS_WRITE)
  async updateBusinessSettings(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body()
    body: {
      verificationEnabled?: boolean;
      emailVerificationEnabled?: boolean;
      smsVerificationEnabled?: boolean;
      identityVerificationRequired?: boolean;
      twoFactorRequired?: boolean;
    },
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    await resolvePanelBusinessIds(this.rbac, req.user.id, viewerIsAdmin, id);
    return this.verification.updateBusinessSettings(id, body);
  }
}

@Controller('panel/members')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PanelMemberVerificationController {
  constructor(
    private readonly verification: VerificationService,
    private readonly twoFactor: TwoFactorService,
    private readonly rbac: RbacService,
  ) {}

  private async assertMemberAccess(
    req: { user: { id: string } },
    userId: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    await this.rbac.assertCustomerAccess(userId, req.user.id, viewerIsAdmin);
  }

  /** İşletme bağlamını yalnızca personelin yetkili olduğu işletmelerle sınırlar. */
  private async resolveScopedBusinessId(
    req: { user: { id: string } },
    userId: string,
    businessId?: string,
  ) {
    const viewerIsAdmin = await this.rbac.hasAdminRole(req.user.id);
    const allowed = viewerIsAdmin
      ? null
      : await this.rbac.getStaffBusinessIds(req.user.id);
    return this.verification.resolvePanelMemberBusinessId(
      userId,
      businessId,
      allowed,
    );
  }

  @Get(':userId/verification')
  @RequirePermissions(PERMISSIONS.PANEL_MEMBER_VERIFICATION_READ)
  async getMemberVerification(
    @Req() req: { user: { id: string } },
    @Param('userId') userId: string,
    @Query('businessId') businessId?: string,
  ) {
    await this.assertMemberAccess(req, userId);
    const resolved = await this.resolveScopedBusinessId(
      req,
      userId,
      businessId,
    );
    const [state, codes, policy, platform, business, twoFactor] =
      await Promise.all([
        this.verification.getUserVerificationState(userId, resolved),
        this.verification.getLatestCodesForPanel(userId, resolved),
        this.verification.getMemberPolicy(userId, resolved),
        this.verification.getSettings(),
        this.verification.getBusinessSettings(resolved),
        this.twoFactor.getUserTwoFactorState(userId, resolved),
      ]);
    return { ...state, codes, policy, platform, business, twoFactor };
  }

  @Put(':userId/verification-policy')
  @RequirePermissions(PERMISSIONS.PANEL_MEMBER_VERIFICATION_WRITE)
  async updateMemberPolicy(
    @Req() req: { user: { id: string } },
    @Param('userId') userId: string,
    @Query('businessId') businessId?: string,
    @Body()
    body: {
      verificationExempt?: boolean;
      skipEmailVerification?: boolean;
      skipSmsVerification?: boolean;
      skipIdentityVerification?: boolean;
      twoFactorExempt?: boolean;
      skipTwoFactor?: boolean;
    } = {},
  ) {
    await this.assertMemberAccess(req, userId);
    const resolved = await this.resolveScopedBusinessId(
      req,
      userId,
      businessId,
    );
    await this.verification.updateMemberPolicy(userId, body, resolved);
    const state = await this.verification.getUserVerificationState(
      userId,
      resolved,
    );
    const codes = await this.verification.getLatestCodesForPanel(
      userId,
      resolved,
    );
    const policy = await this.verification.getMemberPolicy(userId, resolved);
    return { ...state, codes, policy };
  }

  @Put(':userId/verification')
  @RequirePermissions(PERMISSIONS.PANEL_MEMBER_VERIFICATION_WRITE)
  async updateMemberVerification(
    @Req() req: { user: { id: string } },
    @Param('userId') userId: string,
    @Query('businessId') businessId?: string,
    @Body()
    body: {
      emailVerified?: boolean;
      phoneVerified?: boolean;
      identityVerified?: boolean;
    } = {},
  ) {
    await this.assertMemberAccess(req, userId);
    const resolved = await this.resolveScopedBusinessId(
      req,
      userId,
      businessId,
    );
    const state =
      body.identityVerified === true
        ? await this.verification.adminApproveIdentity(userId, resolved)
        : await this.verification.adminUpdateVerification(
            userId,
            body,
            resolved,
          );
    const codes = await this.verification.getLatestCodesForPanel(
      userId,
      resolved,
    );
    const policy = await this.verification.getMemberPolicy(userId, resolved);
    return { ...state, codes, policy };
  }

  @Delete(':userId/documents/:kind')
  @RequirePermissions(PERMISSIONS.PANEL_MEMBER_VERIFICATION_WRITE)
  async deleteMemberDocument(
    @Req() req: { user: { id: string } },
    @Param('userId') userId: string,
    @Param('kind') kind: string,
    @Query('businessId') businessId?: string,
  ) {
    if (
      kind !== 'id-front' &&
      kind !== 'id-back' &&
      kind !== 'selfie' &&
      kind !== 'license-front' &&
      kind !== 'license-back' &&
      kind !== 'passport-front'
    ) {
      throw new BadRequestException('Geçersiz belge türü');
    }
    await this.assertMemberAccess(req, userId);
    const resolved = await this.resolveScopedBusinessId(
      req,
      userId,
      businessId,
    );
    const state = await this.verification.adminDeleteIdentityDocument(
      userId,
      kind,
      resolved,
    );
    const codes = await this.verification.getLatestCodesForPanel(
      userId,
      resolved,
    );
    const policy = await this.verification.getMemberPolicy(userId, resolved);
    return { ...state, codes, policy };
  }
}
