import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { handleError, ok, err } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return err("Invalid credentials", 401);

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return err("Invalid credentials", 401);

    await setSessionCookie({ userId: user.id, email: user.email, role: user.role });
    return ok({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    return handleError(e);
  }
}
