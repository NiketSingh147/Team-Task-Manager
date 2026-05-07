import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

export async function GET(_req: NextRequest) {
  try {
    const user = await requireUser();

    const mentions = await prisma.notification.findMany({
      where: {
        userId: user.id,
        type: { in: ["MENTION_COMMENT", "MENTION_TASK"] },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        readAt: null,
        type: { in: ["MENTION_COMMENT", "MENTION_TASK"] },
      },
    });

    return ok({ mentions, unreadCount });
  } catch (e) {
    return handleError(e);
  }
}
