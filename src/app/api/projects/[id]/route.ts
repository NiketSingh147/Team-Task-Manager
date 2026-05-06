import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireProjectAccess, requireProjectAdmin } from "@/lib/rbac";
import { handleError, ok } from "@/lib/api";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const access = await requireProjectAccess(id, user.id, user.role);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { joinedAt: "asc" },
        },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return ok({ project, myRole: access.role });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await requireProjectAdmin(id, user.id, user.role);
    const body = await req.json();
    const data = updateSchema.parse(body);

    const project = await prisma.project.update({
      where: { id },
      data,
    });
    return ok({ project });
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
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return ok({ success: true });
    // Only owner or global admin can delete
    if (project.ownerId !== user.id && user.role !== "ADMIN") {
      return ok({ error: "Forbidden" }, 403);
    }
    await prisma.project.delete({ where: { id } });
    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
