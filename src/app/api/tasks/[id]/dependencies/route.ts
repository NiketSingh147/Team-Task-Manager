import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireProjectAccess, requireProjectAdmin } from "@/lib/rbac";
import { err, handleError, ok } from "@/lib/api";
import { logTaskActivity } from "@/lib/activity";

const schema = z.object({ blockerTaskId: z.string() });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const { blockerTaskId } = schema.parse(body);

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return err("Task not found", 404);
    await requireProjectAdmin(task.projectId, user.id, user.role);

    const blocker = await prisma.task.findUnique({ where: { id: blockerTaskId } });
    if (!blocker || blocker.projectId !== task.projectId) return err("Blocker task not found in same project", 400);
    if (blockerTaskId === id) return err("Task cannot block itself", 400);

    const dep = await prisma.taskDependency.create({
      data: { blockerTaskId, blockedTaskId: id },
    }).catch(() => null);

    if (!dep) return err("Dependency already exists", 400);

    await prisma.$transaction(async (tx) => {
      await logTaskActivity(tx, {
        taskId: id,
        projectId: task.projectId,
        actorUserId: user.id,
        type: "DEPENDENCY_ADDED",
        message: `${user.name} added a blocker task dependency.`,
        newValue: blockerTaskId,
      });
    });

    return ok({ dependency: dep }, 201);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const { blockerTaskId } = schema.parse(body);

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return err("Task not found", 404);
    await requireProjectAdmin(task.projectId, user.id, user.role);

    const dep = await prisma.taskDependency.findUnique({
      where: { blockerTaskId_blockedTaskId: { blockerTaskId, blockedTaskId: id } },
    });
    if (!dep) return ok({ success: true });

    await prisma.$transaction(async (tx) => {
      await tx.taskDependency.delete({ where: { id: dep.id } });
      await logTaskActivity(tx, {
        taskId: id,
        projectId: task.projectId,
        actorUserId: user.id,
        type: "DEPENDENCY_REMOVED",
        message: `${user.name} removed a blocker task dependency.`,
        oldValue: blockerTaskId,
      });
    });

    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
