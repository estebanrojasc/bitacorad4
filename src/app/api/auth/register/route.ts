import { z } from "zod";
import { connectDB } from "@/lib/db";
import { TeacherModel } from "@/models/Teacher";
import {
  hashPassword,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { ApiError, fail, ok } from "@/lib/api";

const schema = z.object({
  name: z.string().min(2, "El nombre es muy corto"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = schema.parse(body);

    await connectDB();

    const existing = await TeacherModel.findOne({ email });
    if (existing) throw new ApiError("Ese correo ya está registrado", 409);

    const passwordHash = await hashPassword(password);
    // El registro público siempre crea un docente normal. Las cuentas
    // administradoras se asignan manualmente en base de datos.
    const teacher = await TeacherModel.create({
      name,
      email,
      passwordHash,
      role: "teacher",
    });

    const token = await createSessionToken({
      teacherId: teacher._id.toString(),
      name: teacher.name,
      email: teacher.email,
      role: "teacher",
    });
    await setSessionCookie(token);

    return ok({
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        role: "teacher",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(new ApiError(error.issues[0]?.message ?? "Datos inválidos", 422));
    }
    return fail(error);
  }
}
