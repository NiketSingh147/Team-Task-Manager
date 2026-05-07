import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { err, handleError, ok } from "@/lib/api";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== user.id) return err("Not found", 404);

    await prisma.notification.update({
      where: { id },
      data: { readAt: notification.readAt ? notification.readAt : new Date() },
    });

    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
