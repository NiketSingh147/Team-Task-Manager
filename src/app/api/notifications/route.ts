import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";
import { createDueRemindersForUser } from "@/lib/notifications";

export async function GET(_req: NextRequest) {
  try {
    const user = await requireUser();

    await createDueRemindersForUser(user.id);

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, readAt: null },
    });

    return ok({ notifications, unreadCount });
  } catch (e) {
    return handleError(e);
  }
}
