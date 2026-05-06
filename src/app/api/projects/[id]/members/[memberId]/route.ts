import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireProjectAdmin } from "@/lib/rbac";
import { handleError, ok, err } from "@/lib/api";

const updateSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const user = await requireUser();
    const { id, memberId } = await params;
    await requireProjectAdmin(id, user.id, user.role);

    const body = await req.json();
    const { role } = updateSchema.parse(body);

    const member = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return ok({ member });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const user = await requireUser();
    const { id, memberId } = await params;
    await requireProjectAdmin(id, user.id, user.role);

    const member = await prisma.projectMember.findUnique({ where: { id: memberId } });
    if (!member) return ok({ success: true });

    const project = await prisma.project.findUnique({ where: { id } });
    if (project?.ownerId === member.userId) {
      return err("Cannot remove the project owner", 400);
    }

    await prisma.projectMember.delete({ where: { id: memberId } });
    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
