import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { UploadedFilePayload } from '../uploads/uploads.service';
import { FinanceService } from './finance.service';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('deposit-banks')
  listDepositBanks(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    return this.finance.listActiveDepositBanks(req.user.id, businessId);
  }

  @Get('banks')
  listBanks(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    return this.finance.listActiveBanks(req.user.id, businessId);
  }

  @Post('withdraw')
  createWithdrawal(
    @Req() req: { user: { id: string } },
    @Body()
    body: {
      iban: string;
      amount: number;
      bankId: string;
      accountHolderName: string;
      description?: string;
      businessId?: string;
    },
  ) {
    return this.finance.createWithdrawal(req.user.id, body);
  }

  @Post('deposit')
  @UseInterceptors(
    FileInterceptor('receipt', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  createDeposit(
    @Req() req: { user: { id: string } },
    @UploadedFile() file: UploadedFilePayload | undefined,
    @Body() body: {
      amount: string;
      description?: string;
      depositBankAccountId: string;
      businessId?: string;
    },
  ) {
    const amount = Number(body.amount);
    if (!file) {
      throw new BadRequestException('Dekont dosyası gerekli');
    }
    if (!body.depositBankAccountId?.trim()) {
      throw new BadRequestException('Banka hesabı seçin');
    }
    return this.finance.createDeposit(
      req.user.id,
      {
        amount,
        description: body.description,
        depositBankAccountId: body.depositBankAccountId.trim(),
        businessId: body.businessId,
      },
      file,
    );
  }
}
