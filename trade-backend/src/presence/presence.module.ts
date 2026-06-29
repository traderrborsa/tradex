import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { PanelPresenceGateway } from './panel-presence.gateway';
import { PresenceEventsService } from './presence-events.service';
import { PresenceGateway } from './presence.gateway';
import { PresencePanelService } from './presence-panel.service';
import { PresenceService } from './presence.service';

@Global()
@Module({
  imports: [AuthModule, RbacModule],
  providers: [
    PresenceService,
    PresenceEventsService,
    PresenceGateway,
    PanelPresenceGateway,
    PresencePanelService,
  ],
  exports: [PresenceService, PresencePanelService, PresenceEventsService],
})
export class PresenceModule {}
