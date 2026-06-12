import { z } from "zod";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { ApiError, fail, ok, requireSession, teacherScope } from "@/lib/api";

const AVATAR_COLORS = [
  "#6366f1",
  "#10b981",
  "#f43f5e",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
];

export async function GET() {
  try {
    const session = await requireSession();
    await connectDB();
    // Un admin ve todos los estudiantes; un docente solo los suyos.
    const students = await StudentModel.find(teacherScope(session))
      .sort({ name: 1 })
      .lean();
    return ok({ students });
  } catch (error) {
    return fail(error);
  }
}

const createSchema = z.object({
  name: z.string().min(2, "El nombre es muy corto"),
  course: z.string().min(1, "Indica el curso"),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { name, course } = createSchema.parse(body);

    await connectDB();
    const count = await StudentModel.countDocuments({
      teacherId: session.teacherId,
    });
    const color = AVATAR_COLORS[count % AVATAR_COLORS.length];

    const student = await StudentModel.create({
      teacherId: session.teacherId,
      name,
      course,
      color,
    });

    return ok({ student });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(new ApiError(error.issues[0]?.message ?? "Datos inválidos", 422));
    }
    return fail(error);
  }
}
