import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireProjectAdmin } from "@/lib/rbac";
import { handleError, ok, err } from "@/lib/api";

const addSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await requireProjectAdmin(id, user.id, user.role);

    const body = await req.json();
    const { email, role } = addSchema.parse(body);

    const target = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!target) return err("User not found. They need to sign up first.", 404);

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: target.id } },
    });
    if (existing) return err("User is already a member", 409);

    const member = await prisma.projectMember.create({
      data: { projectId: id, userId: target.id, role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return ok({ member }, 201);
  } catch (e) {
    return handleError(e);
  }
}
