import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { handleError, ok, err } from "@/lib/api";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = signupSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return err("Email already registered", 409);

    // First user becomes ADMIN
    const count = await prisma.user.count();
    const role = count === 0 ? "ADMIN" : "MEMBER";

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash: await hashPassword(password),
        role,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    await setSessionCookie({ userId: user.id, email: user.email, role: user.role });
    return ok({ user }, 201);
  } catch (e) {
    return handleError(e);
  }
}
