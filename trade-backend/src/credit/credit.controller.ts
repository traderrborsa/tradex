import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
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
import { CreditService } from './credit.service';

@Controller('credit')
@UseGuards(JwtAuthGuard)
export class CreditController {
  constructor(private readonly credit: CreditService) {}

  @Get()
  list(
    @Req() req: { user: { id: string } },
    @Query('businessId') businessId?: string,
  ) {
    return this.credit.listMine(req.user.id, businessId);
  }

  @Post()
  create(
    @Req() req: { user: { id: string } },
    @Body() body: { amount?: number; description?: string; businessId?: string },
  ) {
    return this.credit.createRequest(req.user.id, body);
  }

  @Post(':id/signed-contract')
  @UseInterceptors(
    FileInterceptor('contract', {
      storage: memoryStorage(),
      limits: { fileSize: 16 * 1024 * 1024 },
    }),
  )
  uploadSigned(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @UploadedFile() file: UploadedFilePayload | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Sözleşme dosyası gerekli');
    }
    return this.credit.uploadSignedContract(req.user.id, id, file);
  }
}
