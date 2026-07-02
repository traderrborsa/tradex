import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { VerificationModule } from '../verification/verification.module';
import { TwoFactorModule } from '../two-factor/two-factor.module';
import { FinanceModule } from '../finance/finance.module';
import { CreditModule } from '../credit/credit.module';
import { BonusModule } from '../bonus/bonus.module';
import { CampaignModule } from '../campaign/campaign.module';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { TradingModule } from '../trading/trading.module';
import { MemberNotificationsModule } from '../member-notifications/member-notifications.module';
import { PanelAuthController } from './auth/auth.controller';
import { PanelBanksController } from './banks/banks.controller';
import { PanelBanksService } from './banks/banks.service';
import { PanelBankAccountsController } from './bank-accounts/bank-accounts.controller';
import { PanelBankAccountsService } from './bank-accounts/bank-accounts.service';
import { PanelBusinessesController } from './businesses/businesses.controller';
import { PanelBusinessesService } from './businesses/businesses.service';
import { PanelDashboardController } from './dashboard/dashboard.controller';
import { PanelDashboardService } from './dashboard/dashboard.service';
import { PanelPresenceController } from './presence/presence.controller';
import { PanelFinanceController } from './finance/finance.controller';
import { PanelCreditController } from './credit/credit.controller';
import { PanelBonusController } from './bonus/bonus.controller';
import { PanelCampaignController } from './campaign/campaign.controller';
import { PanelMembersController } from './members/members.controller';
import { PanelMembersService } from './members/members.service';
import { PanelPermissionsController } from './permissions/permissions.controller';
import { PanelPermissionsService } from './permissions/permissions.service';
import { PanelRolesController } from './roles/roles.controller';
import { PanelRolesService } from './roles/roles.service';
import { PanelTransactionsController } from './transactions/transactions.controller';
import { PanelTransactionsService } from './transactions/transactions.service';
import { PanelTradingSettingsController } from './settings/trading-settings.controller';
import { PanelTradingSettingsService } from './settings/trading-settings.service';
import { PanelWalletController } from './wallet/wallet.controller';
import { PanelWalletService } from './wallet/wallet.service';
import { PanelUsersController } from './users/users.controller';
import { PanelUsersService } from './users/users.service';
import {
  PanelMemberVerificationController,
  PanelBusinessVerificationController,
  PanelVerificationSettingsController,
} from './verification/verification.controller';
import { PanelMemberNotificationsController } from './member-notifications/member-notifications.controller';
import { PanelMemberNotificationsService } from './member-notifications/member-notifications.service';

@Module({
  imports: [AuthModule, RbacModule, TradingModule, FinanceModule, CreditModule, BonusModule, CampaignModule, VerificationModule, UploadsModule, TwoFactorModule, MemberNotificationsModule],
  controllers: [
    PanelAuthController,
    PanelRolesController,
    PanelPermissionsController,
    PanelBusinessesController,
    PanelMembersController,
    PanelUsersController,
    PanelTransactionsController,
    PanelFinanceController,
    PanelCreditController,
    PanelBonusController,
    PanelCampaignController,
    PanelBankAccountsController,
    PanelBanksController,
    PanelTradingSettingsController,
    PanelWalletController,
    PanelDashboardController,
    PanelPresenceController,
    PanelVerificationSettingsController,
    PanelBusinessVerificationController,
    PanelMemberVerificationController,
    PanelMemberNotificationsController,
  ],
  providers: [
    PanelRolesService,
    PanelPermissionsService,
    PanelBusinessesService,
    PanelMembersService,
    PanelUsersService,
    PanelTransactionsService,
    PanelBankAccountsService,
    PanelBanksService,
    PanelTradingSettingsService,
    PanelWalletService,
    PanelDashboardService,
    PanelMemberNotificationsService,
  ],
})
export class PanelModule {}
