import type { Prisma, TaskActivityType } from "@prisma/client";

export async function logTaskActivity(
  tx: Prisma.TransactionClient,
  input: {
    taskId?: string | null;
    projectId: string;
    actorUserId?: string | null;
    type: TaskActivityType;
    message: string;
    oldValue?: string | null;
    newValue?: string | null;
  }
) {
  await tx.taskActivity.create({
    data: {
      taskId: input.taskId ?? null,
      projectId: input.projectId,
      actorUserId: input.actorUserId ?? null,
      type: input.type,
      message: input.message,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
    },
  });
}
