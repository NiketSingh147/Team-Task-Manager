import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireProjectAccess } from "@/lib/rbac";
import { handleError, ok, err } from "@/lib/api";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return err("Task not found", 404);
    const access = await requireProjectAccess(task.projectId, user.id, user.role);

    const body = await req.json();
    const data = updateSchema.parse(body);

    // Members can only update status of tasks they are assigned to (or any task they created)
    // Project admins can update everything.
    const isAdmin = access.role === "ADMIN";
    if (!isAdmin) {
      const keys = Object.keys(data);
      const allowed = keys.every((k) => k === "status");
      const isAssignedOrCreator = task.assigneeId === user.id || task.createdById === user.id;
      if (!allowed || !isAssignedOrCreator) {
        return err("Only project admins or the assignee can modify this task", 403);
      }
    }

    if (data.assigneeId) {
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.projectId, userId: data.assigneeId } },
      });
      const project = await prisma.project.findUnique({ where: { id: task.projectId } });
      if (!member && project?.ownerId !== data.assigneeId) {
        return err("Assignee must be a project member", 400);
      }
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...data,
        dueDate:
          data.dueDate === undefined
            ? undefined
            : data.dueDate === null
            ? null
            : new Date(data.dueDate),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    return ok({ task: updated });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return ok({ success: true });
    const access = await requireProjectAccess(task.projectId, user.id, user.role);
    if (access.role !== "ADMIN" && task.createdById !== user.id && task.assigneeId !== user.id) {
      return err("Forbidden", 403);
    }
    await prisma.task.delete({ where: { id } });
    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
