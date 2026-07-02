import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MemberNotificationsEventsService } from './member-notifications-events.service';

export interface MemberNotificationRow {
  id: string;
  userId: string;
  businessId: string | null;
  type: string;
  title: string;
  message: string;
  href: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
  read: boolean;
}

@Injectable()
export class MemberNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: MemberNotificationsEventsService,
  ) {}

  private serialize(row: {
    id: string;
    userId: string;
    businessId: string | null;
    type: string;
    title: string;
    message: string;
    href: string | null;
    data: unknown;
    readAt: Date | null;
    createdAt: Date;
  }): MemberNotificationRow {
    return {
      id: row.id,
      userId: row.userId,
      businessId: row.businessId,
      type: row.type,
      title: row.title,
      message: row.message,
      href: row.href,
      data:
        row.data && typeof row.data === 'object' && !Array.isArray(row.data)
          ? (row.data as Record<string, unknown>)
          : null,
      createdAt: row.createdAt.toISOString(),
      read: row.readAt != null,
    };
  }

  async create(input: {
    userId: string;
    type: string;
    title: string;
    message: string;
    href?: string;
    data?: Record<string, unknown>;
    businessId?: string | null;
  }): Promise<MemberNotificationRow> {
    const row = await this.prisma.memberNotification.create({
      data: {
        userId: input.userId,
        businessId: input.businessId ?? null,
        type: input.type,
        title: input.title,
        message: input.message,
        href: input.href ?? null,
        data: input.data as Prisma.InputJsonValue | undefined,
      },
    });

    const serialized = this.serialize(row);
    this.events.broadcast(input.userId, serialized);
    return serialized;
  }

  async createMany(
    userIds: string[],
    input: {
      type: string;
      title: string;
      message: string;
      href?: string;
      data?: Record<string, unknown>;
      businessId?: string | null;
    },
  ): Promise<number> {
    if (userIds.length === 0) return 0;

    const rows = await this.prisma.$transaction(
      userIds.map((userId) =>
        this.prisma.memberNotification.create({
          data: {
            userId,
            businessId: input.businessId ?? null,
            type: input.type,
            title: input.title,
            message: input.message,
            href: input.href ?? null,
            data: input.data as Prisma.InputJsonValue | undefined,
          },
        }),
      ),
    );

    for (const row of rows) {
      this.events.broadcast(row.userId, this.serialize(row));
    }

    return rows.length;
  }

  async list(
    userId: string,
    take = 50,
    skip = 0,
    businessId?: string,
  ): Promise<MemberNotificationRow[]> {
    const rows = await this.prisma.memberNotification.findMany({
      where: {
        userId,
        ...(businessId ? { businessId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
    return rows.map((r) => this.serialize(r));
  }

  async unreadCount(userId: string, businessId?: string): Promise<number> {
    return this.prisma.memberNotification.count({
      where: {
        userId,
        readAt: null,
        ...(businessId ? { businessId } : {}),
      },
    });
  }

  async markRead(userId: string, notificationId: string) {
    const row = await this.prisma.memberNotification.findFirst({
      where: { id: notificationId, userId },
      select: { id: true },
    });
    if (!row) return { ok: false };

    await this.prisma.memberNotification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(userId: string, businessId?: string) {
    const result = await this.prisma.memberNotification.updateMany({
      where: {
        userId,
        readAt: null,
        ...(businessId ? { businessId } : {}),
      },
      data: { readAt: new Date() },
    });
    return { ok: true, count: result.count };
  }
}
