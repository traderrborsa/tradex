import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PERMISSIONS } from '../../rbac/permissions.constants';
import { RbacService } from '../../rbac/rbac.service';

@Controller('panel/auth')
export class PanelAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly rbac: RbacService,
  ) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const result = await this.authService.loginPanel(body.email, body.password);
    if ('requiresTwoFactor' in result && result.requiresTwoFactor) {
      return result;
    }
    return this.assertPanelAccess(
      result as { accessToken: string; user: { permissions: string[] } },
    );
  }

  @Post('login/2fa/verify')
  async verifyTwoFactor(@Body() body: { pendingToken: string; code: string }) {
    const result = await this.authService.completeTwoFactorLogin(
      body.pendingToken,
      body.code,
    );
    return this.assertPanelAccess(result);
  }

  @Post('login/2fa/setup/begin')
  beginTwoFactorSetup(@Body() body: { pendingToken: string }) {
    return this.authService.beginTwoFactorSetup(body.pendingToken);
  }

  @Post('login/2fa/setup/complete')
  async completeTwoFactorSetup(
    @Body() body: { pendingToken: string; code: string },
  ) {
    const result = await this.authService.completeTwoFactorSetup(
      body.pendingToken,
      body.code,
    );
    return this.assertPanelAccess(result);
  }

  @Post('login/2fa/offer/skip')
  async skipTwoFactorOffer(@Body() body: { pendingToken: string }) {
    const result = await this.authService.skipTwoFactorOffer(body.pendingToken);
    return this.assertPanelAccess(result);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: { user: { id: string } }) {
    const profile = await this.rbac.getUserAuthProfile(req.user.id);
    if (!profile) {
      throw new ForbiddenException('Kullanıcı bulunamadı');
    }
    if (!profile.permissions.includes(PERMISSIONS.PANEL_ACCESS)) {
      throw new ForbiddenException('Panel erişim yetkiniz yok');
    }
    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      roles: profile.roles,
      permissions: profile.permissions,
      createdAt: profile.createdAt.toISOString(),
      businesses: await this.rbac.getAccessibleBusinessesForPanel(req.user.id),
    };
  }

  private assertPanelAccess(result: {
    accessToken: string;
    user: { permissions: string[] };
  }) {
    const canAccess = result.user.permissions.includes(
      PERMISSIONS.PANEL_ACCESS,
    );
    if (!canAccess) {
      throw new ForbiddenException('Panel erişim yetkiniz yok');
    }
    return result;
  }
}
