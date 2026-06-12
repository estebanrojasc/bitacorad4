import { getSession } from "@/lib/auth";
import { ok } from "@/lib/api";

export async function GET() {
  const session = await getSession();
  if (!session) return ok({ teacher: null });
  return ok({
    teacher: {
      id: session.teacherId,
      name: session.name,
      email: session.email,
      role: session.role === "admin" ? "admin" : "teacher",
    },
  });
}
