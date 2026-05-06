import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    const now = new Date();

    const myTasks = await prisma.task.findMany({
      where: { assigneeId: user.id },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });

    const projectIds =
      user.role === "ADMIN"
        ? undefined
        : (
            await prisma.project.findMany({
              where: {
                OR: [
                  { ownerId: user.id },
                  { members: { some: { userId: user.id } } },
                ],
              },
              select: { id: true },
            })
          ).map((p) => p.id);

    const projectFilter = projectIds ? { projectId: { in: projectIds } } : {};

    const [todo, inProgress, inReview, done, overdue, totalProjects] = await Promise.all([
      prisma.task.count({ where: { ...projectFilter, status: "TODO" } }),
      prisma.task.count({ where: { ...projectFilter, status: "IN_PROGRESS" } }),
      prisma.task.count({ where: { ...projectFilter, status: "IN_REVIEW" } }),
      prisma.task.count({ where: { ...projectFilter, status: "DONE" } }),
      prisma.task.count({
        where: {
          ...projectFilter,
          dueDate: { lt: now },
          status: { not: "DONE" },
        },
      }),
      prisma.project.count({
        where:
          user.role === "ADMIN"
            ? undefined
            : {
                OR: [
                  { ownerId: user.id },
                  { members: { some: { userId: user.id } } },
                ],
              },
      }),
    ]);

    return ok({
      stats: { todo, inProgress, inReview, done, overdue, totalProjects },
      myTasks,
    });
  } catch (e) {
    return handleError(e);
  }
}
