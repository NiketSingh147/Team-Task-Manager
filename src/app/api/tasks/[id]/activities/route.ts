import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireProjectAccess } from "@/lib/rbac";
import { err, handleError, ok } from "@/lib/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      select: { id: true, projectId: true },
    });
    if (!task) return err("Task not found", 404);

    await requireProjectAccess(task.projectId, user.id, user.role);

    const activities = await prisma.taskActivity.findMany({
      where: { taskId: id },
      include: { actorUser: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return ok({ activities });
  } catch (e) {
    return handleError(e);
  }
}
