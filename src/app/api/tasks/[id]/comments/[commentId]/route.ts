import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireProjectAccess } from "@/lib/rbac";
import { err, handleError, ok } from "@/lib/api";
import { logTaskActivity } from "@/lib/activity";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const user = await requireUser();
    const { id, commentId } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      select: { id: true, projectId: true },
    });
    if (!task) return err("Task not found", 404);

    await requireProjectAccess(task.projectId, user.id, user.role);

    const comment = await prisma.taskComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.taskId !== id) return err("Comment not found", 404);
    if (comment.userId !== user.id) return err("Only comment author can delete this comment", 403);

    await prisma.$transaction(async (tx) => {
      await tx.taskComment.delete({ where: { id: commentId } });
      await logTaskActivity(tx, {
        taskId: id,
        projectId: task.projectId,
        actorUserId: user.id,
        type: "COMMENT_DELETED",
        message: `${user.name} deleted a comment.`,
      });
    });
    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
