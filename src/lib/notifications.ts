import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmailReminder } from "@/lib/email";

type MentionContext = {
  projectId: string;
  actorUserId: string;
  taskId: string;
  source: "task" | "comment";
  sourceText: string | null | undefined;
  commentId?: string;
};

const DUE_SOON_WINDOW_HOURS = 24;

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function extractMentionTokens(text: string | null | undefined): string[] {
  if (!text) return [];
  const matches =
    text.match(/(^|\s)@([a-zA-Z0-9._-]+(?:@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})?)/g) ?? [];
  return [...new Set(matches.map((m) => m.trim().slice(1).toLowerCase()))];
}

async function getProjectUsers(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: { id: true, email: true, name: true } },
      members: { include: { user: { select: { id: true, email: true, name: true } } } },
    },
  });

  if (!project) return [];

  const users = [
    project.owner,
    ...project.members.map((m) => m.user),
  ];

  const dedup = new Map<string, (typeof users)[number]>();
  for (const user of users) dedup.set(user.id, user);
  return [...dedup.values()];
}

export async function createMentionNotifications({
  projectId,
  actorUserId,
  taskId,
  source,
  sourceText,
  commentId,
}: MentionContext) {
  const mentionTokens = extractMentionTokens(sourceText);
  if (mentionTokens.length === 0) return;

  const users = await getProjectUsers(projectId);
  if (users.length === 0) return;

  const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));
  const byName = new Map(users.map((u) => [normalizeName(u.name), u]));

  const mentionedUsers = new Map<string, (typeof users)[number]>();
  for (const token of mentionTokens) {
    const emailMatch = byEmail.get(token);
    if (emailMatch) {
      mentionedUsers.set(emailMatch.id, emailMatch);
      continue;
    }
    const nameMatch = byName.get(normalizeName(token));
    if (nameMatch) mentionedUsers.set(nameMatch.id, nameMatch);
  }

  if (mentionedUsers.size === 0) return;
  const [actor, task] = await Promise.all([
    prisma.user.findUnique({ where: { id: actorUserId }, select: { name: true, email: true } }),
    prisma.task.findUnique({ where: { id: taskId }, select: { title: true } }),
  ]);
  const actorLabel = actor?.name || actor?.email || "A teammate";
  const taskLabel = task?.title || "a task";

  const rows: Prisma.NotificationCreateManyInput[] = [...mentionedUsers.values()]
    .filter((u) => u.id !== actorUserId)
    .map((u) => ({
      userId: u.id,
      type: (source === "task" ? "MENTION_TASK" : "MENTION_COMMENT") as NotificationType,
      title: source === "task" ? "You were mentioned in a task" : "You were mentioned in a comment",
      message:
        source === "task"
          ? `${actorLabel} mentioned you in "${taskLabel}".`
          : `${actorLabel} tagged you in comments on "${taskLabel}".`,
      projectId,
      taskId,
      commentId: commentId ?? null,
    }));

  if (rows.length === 0) return;
  await prisma.notification.createMany({ data: rows });
}

export async function createAssignmentNotification(tx: Prisma.TransactionClient, {
  userId,
  projectId,
  taskId,
  taskTitle,
  actorUserId,
}: {
  userId: string;
  projectId: string;
  taskId: string;
  taskTitle: string;
  actorUserId: string;
}) {
  if (userId === actorUserId) return;

  await tx.notification.create({
    data: {
      userId,
      type: "TASK_ASSIGNED",
      title: "Task assigned to you",
      message: `You were assigned: ${taskTitle}`,
      projectId,
      taskId,
    },
  });
}

export async function createOwnerStatusChangeNotification(
  tx: Prisma.TransactionClient,
  {
    ownerUserId,
    actorUserId,
    actorName,
    taskId,
    taskTitle,
    projectId,
    fromStatus,
    toStatus,
  }: {
    ownerUserId: string;
    actorUserId: string;
    actorName: string;
    taskId: string;
    taskTitle: string;
    projectId: string;
    fromStatus: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
    toStatus: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  }
) {
  if (ownerUserId === actorUserId || fromStatus === toStatus) return;

  const pretty: Record<string, string> = {
    TODO: "To do",
    IN_PROGRESS: "In progress",
    IN_REVIEW: "In review",
    DONE: "Done",
  };

  await tx.notification.create({
    data: {
      userId: ownerUserId,
      type: "TASK_STATUS_CHANGED",
      title: "Task status changed",
      message: `${actorName} changed \"${taskTitle}\" from ${pretty[fromStatus]} to ${pretty[toStatus]}.`,
      projectId,
      taskId,
    },
  });
}

function dueSoonCutoff(now: Date) {
  const date = new Date(now);
  date.setHours(date.getHours() + DUE_SOON_WINDOW_HOURS);
  return date;
}

export async function createDueRemindersForUser(userId: string) {
  const now = new Date();
  const soon = dueSoonCutoff(now);

  const [tasks, user] = await Promise.all([
    prisma.task.findMany({
    where: {
      assigneeId: userId,
      status: { not: "DONE" },
      dueDate: { not: null, lte: soon },
    },
    include: { project: { select: { id: true } } },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
  ]);

  const dayKey = now.toISOString().slice(0, 10);
  const candidates = tasks
    .filter((task) => !!task.dueDate)
    .map((task) => {
      const overdue = (task.dueDate as Date).getTime() < now.getTime();
      return {
        task,
        overdue,
        dedupeKey: `${overdue ? "overdue" : "due-soon"}:${userId}:${task.id}:${dayKey}`,
      };
    });

  if (candidates.length === 0) return;

  const existing = await prisma.notification.findMany({
    where: {
      userId,
      dedupeKey: { in: candidates.map((c) => c.dedupeKey) },
    },
    select: { dedupeKey: true },
  });
  const existingKeys = new Set(existing.map((e) => e.dedupeKey).filter((k): k is string => !!k));
  const pending = candidates.filter((c) => !existingKeys.has(c.dedupeKey));

  for (const { task, overdue, dedupeKey } of pending) {
    await prisma.notification.create({
      data: {
        userId,
        type: overdue ? "TASK_OVERDUE" : "TASK_DUE_SOON",
        title: overdue ? "Task overdue" : "Task due soon",
        message: overdue
          ? `${task.title} is overdue. Please update or complete it.`
          : `${task.title} is due within 24 hours.`,
        projectId: task.project.id,
        taskId: task.id,
        dedupeKey,
      },
    });

    if (user?.email) {
      await sendEmailReminder({
        to: user.email,
        subject: overdue ? "Task overdue reminder" : "Task due soon reminder",
        text: overdue
          ? `${task.title} is overdue in Team Task Manager. Please review it.`
          : `${task.title} is due within 24 hours in Team Task Manager.`,
      });
    }
  }
}

export function shouldTriggerMentionNotification(oldText: string | null | undefined, newText: string | null | undefined) {
  const before = new Set(extractMentionTokens(oldText));
  const after = extractMentionTokens(newText);
  return after.some((token) => !before.has(token));
}
