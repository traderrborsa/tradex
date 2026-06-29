import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { CreditController } from './credit.controller';
import { CreditService } from './credit.service';

@Module({
  imports: [UploadsModule],
  controllers: [CreditController],
  providers: [CreditService],
  exports: [CreditService],
})
export class CreditModule {}
