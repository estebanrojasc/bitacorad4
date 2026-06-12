import { z } from "zod";
import { connectDB } from "@/lib/db";
import { TeacherModel } from "@/models/Teacher";
import {
  verifyPassword,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { ApiError, fail, ok } from "@/lib/api";

const schema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = schema.parse(body);

    await connectDB();

    const teacher = await TeacherModel.findOne({ email });
    if (!teacher) throw new ApiError("Correo o contraseña incorrectos", 401);

    const valid = await verifyPassword(password, teacher.passwordHash);
    if (!valid) throw new ApiError("Correo o contraseña incorrectos", 401);

    const token = await createSessionToken({
      teacherId: teacher._id.toString(),
      name: teacher.name,
      email: teacher.email,
    });
    await setSessionCookie(token);

    return ok({
      teacher: { id: teacher._id, name: teacher.name, email: teacher.email },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(new ApiError(error.issues[0]?.message ?? "Datos inválidos", 422));
    }
    return fail(error);
  }
}
