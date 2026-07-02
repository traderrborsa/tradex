import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { LoginDto } from './login.dto';
import type { RegisterDto } from './register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('login/2fa/verify')
  verifyTwoFactorLogin(@Body() body: { pendingToken: string; code: string }) {
    return this.authService.completeTwoFactorLogin(
      body.pendingToken,
      body.code,
    );
  }

  @Post('login/2fa/setup/begin')
  beginTwoFactorSetup(@Body() body: { pendingToken: string }) {
    return this.authService.beginTwoFactorSetup(body.pendingToken);
  }

  @Post('login/2fa/setup/complete')
  completeTwoFactorSetup(@Body() body: { pendingToken: string; code: string }) {
    return this.authService.completeTwoFactorSetup(
      body.pendingToken,
      body.code,
    );
  }

  @Post('login/2fa/offer/skip')
  skipTwoFactorOffer(@Body() body: { pendingToken: string }) {
    return this.authService.skipTwoFactorOffer(body.pendingToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    return this.authService.me(req.user.id, businessId);
  }
}
