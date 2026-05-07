import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireProjectAccess } from "@/lib/rbac";
import { handleError, ok, err } from "@/lib/api";
import { createAssignmentNotification, createMentionNotifications } from "@/lib/notifications";
import { logTaskActivity } from "@/lib/activity";

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await requireProjectAccess(id, user.id, user.role);

    const body = await req.json();
    const data = createTaskSchema.parse(body);

    if (data.assigneeId) {
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: id, userId: data.assigneeId } },
      });
      const project = await prisma.project.findUnique({ where: { id } });
      if (!member && project?.ownerId !== data.assigneeId) {
        return err("Assignee must be a project member", 400);
      }
    }

    const task = await prisma.$transaction(async (tx) => {
      const createdTask = await tx.task.create({
        data: {
          title: data.title,
          description: data.description || null,
          status: data.status,
          priority: data.priority,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          assigneeId: data.assigneeId || null,
          projectId: id,
          createdById: user.id,
        },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      if (createdTask.assigneeId) {
        await createAssignmentNotification(tx, {
          userId: createdTask.assigneeId,
          projectId: id,
          taskId: createdTask.id,
          taskTitle: createdTask.title,
          actorUserId: user.id,
        });
      }

      await logTaskActivity(tx, {
        taskId: createdTask.id,
        projectId: id,
        actorUserId: user.id,
        type: "TASK_CREATED",
        message: `${user.name} created task "${createdTask.title}".`,
      });

      return createdTask;
    });

    await createMentionNotifications({
      projectId: id,
      actorUserId: user.id,
      taskId: task.id,
      source: "task",
      sourceText: task.description,
    });

    return ok({ task }, 201);
  } catch (e) {
    return handleError(e);
  }
}
