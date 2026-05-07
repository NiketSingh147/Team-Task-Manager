import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireProjectAccess } from "@/lib/rbac";
import { err, handleError, ok } from "@/lib/api";
import { createMentionNotifications } from "@/lib/notifications";
import { logTaskActivity } from "@/lib/activity";

const createSchema = z.object({
  body: z.string().min(1).max(3000),
  parentId: z.string().optional().nullable(),
});

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

    const comments = await prisma.taskComment.findMany({
      where: { taskId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
    type TreeNode = (typeof comments)[number] & { replies: TreeNode[] };
    const byId = new Map<string, TreeNode>();
    for (const c of comments) byId.set(c.id, { ...c, replies: [] });
    const roots: TreeNode[] = [];
    for (const c of comments) {
      const node = byId.get(c.id)!;
      if (!c.parentId) roots.push(node);
      else byId.get(c.parentId)?.replies.push(node);
    }
    return ok({ comments: roots });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(
  req: NextRequest,
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

    const body = await req.json();
    const data = createSchema.parse(body);

    if (data.parentId) {
      const parent = await prisma.taskComment.findUnique({
        where: { id: data.parentId },
        select: { id: true, taskId: true },
      });
      if (!parent || parent.taskId !== id) return err("Parent comment not found", 404);
    }

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.taskComment.create({
        data: {
          taskId: id,
          userId: user.id,
          parentId: data.parentId || null,
          body: data.body,
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      await logTaskActivity(tx, {
        taskId: id,
        projectId: task.projectId,
        actorUserId: user.id,
        type: "COMMENT_ADDED",
        message: `${user.name} added a comment.`,
      });
      return created;
    });

    await createMentionNotifications({
      projectId: task.projectId,
      actorUserId: user.id,
      taskId: id,
      source: "comment",
      sourceText: data.body,
      commentId: comment.id,
    });

    return ok({ comment }, 201);
  } catch (e) {
    return handleError(e);
  }
}
