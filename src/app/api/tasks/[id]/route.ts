import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireProjectAccess } from "@/lib/rbac";
import { handleError, ok, err } from "@/lib/api";
import {
  createAssignmentNotification,
  createMentionNotifications,
  createOwnerStatusChangeNotification,
  shouldTriggerMentionNotification,
} from "@/lib/notifications";
import { logTaskActivity } from "@/lib/activity";

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

    if (data.status === "DONE") {
      const activeBlockers = await prisma.taskDependency.count({
        where: {
          blockedTaskId: id,
          blockerTask: { status: { not: "DONE" } },
        },
      });
      if (activeBlockers > 0) {
        return err("Task has active blockers. Resolve them before marking done.", 400);
      }
    }

    const oldAssigneeId = task.assigneeId;
    const oldStatus = task.status;
    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
      select: { ownerId: true },
    });

    const updated = await prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
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

      if (
        updatedTask.assigneeId &&
        updatedTask.assigneeId !== oldAssigneeId
      ) {
        await createAssignmentNotification(tx, {
          userId: updatedTask.assigneeId,
          projectId: updatedTask.projectId,
          taskId: updatedTask.id,
          taskTitle: updatedTask.title,
          actorUserId: user.id,
        });
      }

      if (project?.ownerId) {
        await createOwnerStatusChangeNotification(tx, {
          ownerUserId: project.ownerId,
          actorUserId: user.id,
          actorName: user.name,
          taskId: updatedTask.id,
          taskTitle: updatedTask.title,
          projectId: updatedTask.projectId,
          fromStatus: oldStatus,
          toStatus: updatedTask.status,
        });
      }

      if (oldStatus !== updatedTask.status) {
        await logTaskActivity(tx, {
          taskId: updatedTask.id,
          projectId: updatedTask.projectId,
          actorUserId: user.id,
          type: "STATUS_CHANGED",
          message: `${user.name} changed status from ${oldStatus} to ${updatedTask.status}.`,
          oldValue: oldStatus,
          newValue: updatedTask.status,
        });
      }
      if (oldAssigneeId !== updatedTask.assigneeId) {
        await logTaskActivity(tx, {
          taskId: updatedTask.id,
          projectId: updatedTask.projectId,
          actorUserId: user.id,
          type: "ASSIGNEE_CHANGED",
          message: `${user.name} changed assignee.`,
          oldValue: oldAssigneeId,
          newValue: updatedTask.assigneeId,
        });
      }
      if (task.priority !== updatedTask.priority) {
        await logTaskActivity(tx, {
          taskId: updatedTask.id,
          projectId: updatedTask.projectId,
          actorUserId: user.id,
          type: "PRIORITY_CHANGED",
          message: `${user.name} changed priority from ${task.priority} to ${updatedTask.priority}.`,
          oldValue: task.priority,
          newValue: updatedTask.priority,
        });
      }
      if ((task.title ?? null) !== (updatedTask.title ?? null)) {
        await logTaskActivity(tx, {
          taskId: updatedTask.id,
          projectId: updatedTask.projectId,
          actorUserId: user.id,
          type: "TITLE_CHANGED",
          message: `${user.name} changed task title.`,
          oldValue: task.title,
          newValue: updatedTask.title,
        });
      }
      if ((task.description ?? null) !== (updatedTask.description ?? null)) {
        await logTaskActivity(tx, {
          taskId: updatedTask.id,
          projectId: updatedTask.projectId,
          actorUserId: user.id,
          type: "DESCRIPTION_CHANGED",
          message: `${user.name} updated task description.`,
        });
      }
      if ((task.dueDate?.toISOString() ?? null) !== (updatedTask.dueDate?.toISOString() ?? null)) {
        await logTaskActivity(tx, {
          taskId: updatedTask.id,
          projectId: updatedTask.projectId,
          actorUserId: user.id,
          type: "DUE_DATE_CHANGED",
          message: `${user.name} changed due date.`,
          oldValue: task.dueDate?.toISOString() ?? null,
          newValue: updatedTask.dueDate?.toISOString() ?? null,
        });
      }

      return updatedTask;
    });

    if (
      data.description !== undefined &&
      shouldTriggerMentionNotification(task.description, updated.description)
    ) {
      await createMentionNotifications({
        projectId: updated.projectId,
        actorUserId: user.id,
        taskId: updated.id,
        source: "task",
        sourceText: updated.description,
      });
    }

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
    await prisma.$transaction(async (tx) => {
      await logTaskActivity(tx, {
        taskId: task.id,
        projectId: task.projectId,
        actorUserId: user.id,
        type: "TASK_DELETED",
        message: `${user.name} deleted task "${task.title}".`,
      });
      await tx.task.delete({ where: { id } });
    });
    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
