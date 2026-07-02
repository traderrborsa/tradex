import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { allocateDisplayId } from '../trading/transaction-display-id';
import { PanelNotificationsService } from '../panel/notifications/notifications.service';
import {
  UploadsService,
  type UploadedFilePayload,
} from '../uploads/uploads.service';
import { toPublicUploadUrl } from '../uploads/uploads-url';
import { VerificationService } from '../verification/verification.service';

export type CreditRequestStatus =
  | 'pending'
  | 'contract_uploaded'
  | 'signed'
  | 'approved'
  | 'rejected'
  | 'cancelled';

type CreditRow = {
  id: string;
  displayId: number | null;
  status: string;
  amount: Prisma.Decimal;
  description: string | null;
  contractPath: string | null;
  contractUploadedAt: Date | null;
  signedContractPath: string | null;
  signedUploadedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  processedAt: Date | null;
  user: { id: string; email: string; fullName: string };
};

@Injectable()
export class CreditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: PanelNotificationsService,
    private readonly uploads: UploadsService,
    private readonly verification: VerificationService,
  ) {}

  private rowInclude() {
    return {
      user: { select: { id: true, email: true, fullName: true } },
    };
  }

  private serializeRow(row: CreditRow) {
    return {
      id: row.id,
      displayId: row.displayId,
      status: row.status as CreditRequestStatus,
      amount: Number(row.amount ?? 0),
      description: row.description,
      contractUrl: toPublicUploadUrl(row.contractPath),
      signedContractUrl: toPublicUploadUrl(row.signedContractPath),
      contractUploadedAt: row.contractUploadedAt?.toISOString() ?? null,
      signedUploadedAt: row.signedUploadedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      processedAt: row.processedAt?.toISOString() ?? null,
      user: {
        id: row.user.id,
        email: row.user.email,
        fullName: row.user.fullName,
        label: `${row.displayId ?? row.id.slice(-8)} ${row.user.fullName}`,
      },
    };
  }

  private async resolveBusinessId(
    userId: string,
    businessId?: string,
  ): Promise<string> {
    const ctx = await this.verification.resolveRequirementsContext(
      userId,
      businessId,
    );
    if (!ctx.businessId) {
      throw new BadRequestException('Geçerli işletme bağlamı gerekli');
    }
    return ctx.businessId;
  }

  // --- Müşteri (member) tarafı ---

  async createRequest(
    userId: string,
    body: { amount?: number; description?: string; businessId?: string },
  ) {
    const businessId = await this.resolveBusinessId(userId, body.businessId);

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Geçerli bir kredi tutarı girin');
    }

    const member = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });

    const row = await this.prisma.$transaction(async (tx) => {
      const displayId = await allocateDisplayId(tx);
      return tx.creditRequest.create({
        data: {
          displayId,
          businessId,
          userId,
          status: 'pending',
          amount,
          description: body.description?.trim() || null,
        },
        include: this.rowInclude(),
      });
    });

    await this.notifications.create({
      type: 'credit_request',
      title: 'Kredi talebi',
      message: `${member?.fullName ?? 'Müşteri'} yeni bir kredi talebi oluşturdu`,
      href: '/panel/credit',
      data: { requestId: row.id, userId },
      businessId,
    });

    return this.serializeRow(row);
  }

  async listMine(userId: string, businessId?: string) {
    const resolvedBusinessId = await this.resolveBusinessId(userId, businessId);
    const rows = await this.prisma.creditRequest.findMany({
      where: { userId, businessId: resolvedBusinessId },
      include: this.rowInclude(),
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.serializeRow(r));
  }

  async uploadSignedContract(
    userId: string,
    requestId: string,
    file: UploadedFilePayload,
  ) {
    const existing = await this.prisma.creditRequest.findFirst({
      where: { id: requestId, userId },
    });
    if (!existing) throw new NotFoundException('Kredi talebi bulunamadı');
    if (!existing.contractPath) {
      throw new BadRequestException('Sözleşme henüz yüklenmedi');
    }
    if (
      existing.status !== 'contract_uploaded' &&
      existing.status !== 'signed'
    ) {
      throw new BadRequestException(
        'Bu talep için imzalı sözleşme yüklenemez',
      );
    }

    const signedPath = await this.uploads.saveCreditContract(file, 'signed');

    if (existing.signedContractPath) {
      await this.uploads.deleteRelativePath(existing.signedContractPath);
    }

    const row = await this.prisma.creditRequest.update({
      where: { id: requestId },
      data: {
        signedContractPath: signedPath,
        signedUploadedAt: new Date(),
        status: 'signed',
      },
      include: this.rowInclude(),
    });

    await this.notifications.create({
      type: 'credit_signed',
      title: 'İmzalı sözleşme',
      message: `${row.user.fullName} imzalı kredi sözleşmesini yükledi`,
      href: '/panel/credit',
      data: { requestId: row.id, userId },
      businessId: existing.businessId,
    });

    return this.serializeRow(row);
  }

  // --- Panel (yönetici) tarafı ---

  async listForPanel(
    filters: { status?: CreditRequestStatus; userId?: string },
    userWhere: Prisma.UserWhereInput,
    businessIds?: string[],
  ) {
    const rows = await this.prisma.creditRequest.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        user: {
          ...userWhere,
          ...(filters.userId ? { id: filters.userId } : {}),
        },
        ...(businessIds?.length ? { businessId: { in: businessIds } } : {}),
      },
      include: this.rowInclude(),
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.serializeRow(r));
  }

  async getForPanel(id: string, userWhere: Prisma.UserWhereInput) {
    const row = await this.prisma.creditRequest.findFirst({
      where: { id, user: userWhere },
      include: this.rowInclude(),
    });
    if (!row) throw new NotFoundException('Kayıt bulunamadı');
    return this.serializeRow(row);
  }

  async uploadContract(
    id: string,
    file: UploadedFilePayload,
    userWhere: Prisma.UserWhereInput,
  ) {
    const existing = await this.prisma.creditRequest.findFirst({
      where: { id, user: userWhere },
    });
    if (!existing) throw new NotFoundException('Kayıt bulunamadı');
    if (existing.status === 'approved' || existing.status === 'rejected') {
      throw new BadRequestException(
        'Sonuçlanmış talebe sözleşme yüklenemez',
      );
    }

    const contractPath = await this.uploads.saveCreditContract(
      file,
      'contract',
    );

    if (existing.contractPath) {
      await this.uploads.deleteRelativePath(existing.contractPath);
    }

    const row = await this.prisma.creditRequest.update({
      where: { id },
      data: {
        contractPath,
        contractUploadedAt: new Date(),
        // Yeni sözleşme yüklendiğinde imza süreci yeniden başlar.
        status: 'contract_uploaded',
        signedContractPath: null,
        signedUploadedAt: null,
      },
      include: this.rowInclude(),
    });

    return this.serializeRow(row);
  }

  async updateForPanel(
    id: string,
    body: {
      status?: CreditRequestStatus;
      description?: string | null;
      amount?: number;
    },
    operatorUserId: string,
    userWhere: Prisma.UserWhereInput,
  ) {
    const existing = await this.prisma.creditRequest.findFirst({
      where: { id, user: userWhere },
    });
    if (!existing) throw new NotFoundException('Kayıt bulunamadı');

    if (body.status === 'approved' && !existing.signedContractPath) {
      throw new ForbiddenException(
        'Onay için imzalı sözleşme yüklenmiş olmalı',
      );
    }

    let amount: number | undefined;
    if (body.amount !== undefined) {
      amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        throw new BadRequestException('Geçerli bir kredi tutarı girin');
      }
    }

    const settling =
      body.status === 'approved' ||
      body.status === 'rejected' ||
      body.status === 'cancelled';

    const row = await this.prisma.creditRequest.update({
      where: { id },
      data: {
        ...(body.status != null ? { status: body.status } : {}),
        ...(amount !== undefined ? { amount } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(settling
          ? { processedAt: new Date(), processedByUserId: operatorUserId }
          : {}),
      },
      include: this.rowInclude(),
    });

    return this.serializeRow(row);
  }

  async deleteForPanel(id: string, userWhere: Prisma.UserWhereInput) {
    const existing = await this.prisma.creditRequest.findFirst({
      where: { id, user: userWhere },
      select: {
        id: true,
        contractPath: true,
        signedContractPath: true,
      },
    });
    if (!existing) throw new NotFoundException('Kayıt bulunamadı');

    await this.prisma.creditRequest.delete({ where: { id } });
    await this.uploads.deleteRelativePath(existing.contractPath);
    await this.uploads.deleteRelativePath(existing.signedContractPath);

    return { ok: true };
  }
}
