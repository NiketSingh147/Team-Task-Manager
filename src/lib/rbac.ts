import { prisma } from "./prisma";
import { AuthError } from "./auth";
import type { ProjectRole } from "@prisma/client";

/**
 * Ensures user is a member of the project. Returns their role in the project.
 * Global ADMIN bypasses membership check.
 */
export async function requireProjectAccess(
  projectId: string,
  userId: string,
  globalRole: string
): Promise<{ role: ProjectRole | "ADMIN"; isOwner: boolean }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true },
  });
  if (!project) throw new AuthError("Project not found", 404);

  if (globalRole === "ADMIN") {
    return { role: "ADMIN", isOwner: project.ownerId === userId };
  }

  if (project.ownerId === userId) {
    return { role: "ADMIN", isOwner: true };
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!membership) throw new AuthError("Forbidden", 403);
  return { role: membership.role, isOwner: false };
}

export async function requireProjectAdmin(
  projectId: string,
  userId: string,
  globalRole: string
) {
  const access = await requireProjectAccess(projectId, userId, globalRole);
  if (access.role !== "ADMIN") throw new AuthError("Admin access required", 403);
  return access;
}
