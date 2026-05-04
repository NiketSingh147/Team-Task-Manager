import { getCurrentUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return ok({ user: null });
    return ok({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    return handleError(e);
  }
}
