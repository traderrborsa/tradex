import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TradingAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveBusinessId(
    userId: string,
    businessId?: string,
  ): Promise<string> {
    if (businessId) {
      const membership = await this.prisma.businessMembership.findUnique({
        where: { userId_businessId: { userId, businessId } },
      });
      if (membership) return businessId;
    }

    const first = await this.prisma.businessMembership.findFirst({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
    });
    if (!first) {
      throw new BadRequestException('İşletme üyeliği bulunamadı');
    }
    return first.businessId;
  }

  async getAccount(userId: string, businessId?: string) {
    const resolvedBusinessId = await this.resolveBusinessId(userId, businessId);
    const account = await this.prisma.tradingAccount.findUnique({
      where: {
        userId_businessId: { userId, businessId: resolvedBusinessId },
      },
      select: { id: true, balance: true, businessId: true, userId: true },
    });
    if (!account) {
      throw new NotFoundException('Bu işletme için trading hesabı bulunamadı');
    }
    return account;
  }

  async ensureAccount(
    userId: string,
    businessId: string,
    initialBalance = 0,
  ) {
    return this.prisma.tradingAccount.upsert({
      where: { userId_businessId: { userId, businessId } },
      create: { userId, businessId, balance: initialBalance },
      update: {},
      select: { id: true, balance: true, businessId: true, userId: true },
    });
  }
}
