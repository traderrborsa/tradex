import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from '../../rbac/rbac.service';
import { resolvePanelBusinessIds } from '../panel-business-scope';
import { NotificationsEventsService } from './notifications-events.service';

export interface PanelNotificationRow {
  id: string;
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
export class PanelNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
    private readonly events: NotificationsEventsService,
  ) {}

  private serialize(
    row: {
      id: string;
      businessId: string | null;
      type: string;
      title: string;
      message: string;
      href: string | null;
      data: unknown;
      createdAt: Date;
      reads: { userId: string }[];
    },
    userId: string,
  ): PanelNotificationRow {
    return {
      id: row.id,
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
      read: row.reads.some((r) => r.userId === userId),
    };
  }

  async create(input: {
    type: string;
    title: string;
    message: string;
    href?: string;
    data?: Record<string, unknown>;
    businessId?: string | null;
  }): Promise<PanelNotificationRow> {
    const row = await this.prisma.panelNotification.create({
      data: {
        businessId: input.businessId ?? null,
        type: input.type,
        title: input.title,
        message: input.message,
        href: input.href ?? null,
        data: input.data as Prisma.InputJsonValue | undefined,
      },
      include: { reads: true },
    });

    const serialized = this.serialize(row, '');
    this.events.broadcast(serialized);
    return serialized;
  }

  private async notificationWhere(
    viewerId: string,
    viewerIsAdmin: boolean,
    businessId?: string,
  ) {
    const businessIds = await resolvePanelBusinessIds(
      this.rbac,
      viewerId,
      viewerIsAdmin,
      businessId,
    );
    return this.rbac.notificationScopeFilter(businessIds);
  }

  async list(
    userId: string,
    viewerIsAdmin: boolean,
    take = 50,
    skip = 0,
    businessId?: string,
  ): Promise<PanelNotificationRow[]> {
    const scope = await this.notificationWhere(userId, viewerIsAdmin, businessId);
    const rows = await this.prisma.panelNotification.findMany({
      where: scope,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        reads: { where: { userId }, select: { userId: true } },
      },
    });
    return rows.map((r) => this.serialize(r, userId));
  }

  async unreadCount(
    userId: string,
    viewerIsAdmin: boolean,
    businessId?: string,
  ): Promise<number> {
    const scope = await this.notificationWhere(userId, viewerIsAdmin, businessId);
    return this.prisma.panelNotification.count({
      where: {
        ...scope,
        reads: { none: { userId } },
      },
    });
  }

  async markRead(
    userId: string,
    viewerIsAdmin: boolean,
    notificationId: string,
  ) {
    const scope = await this.notificationWhere(userId, viewerIsAdmin);
    const row = await this.prisma.panelNotification.findFirst({
      where: { id: notificationId, ...scope },
      select: { id: true },
    });
    if (!row) return { ok: false };

    await this.prisma.panelNotificationRead.upsert({
      where: {
        notificationId_userId: { notificationId, userId },
      },
      create: { notificationId, userId },
      update: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(
    userId: string,
    viewerIsAdmin: boolean,
    businessId?: string,
  ) {
    const scope = await this.notificationWhere(userId, viewerIsAdmin, businessId);
    const unread = await this.prisma.panelNotification.findMany({
      where: { ...scope, reads: { none: { userId } } },
      select: { id: true },
    });
    if (unread.length === 0) return { ok: true, count: 0 };

    await this.prisma.panelNotificationRead.createMany({
      data: unread.map((n) => ({ notificationId: n.id, userId })),
      skipDuplicates: true,
    });
    return { ok: true, count: unread.length };
  }
}
