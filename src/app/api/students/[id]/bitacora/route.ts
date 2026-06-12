import { z } from "zod";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { BitacoraEntryModel } from "@/models/BitacoraEntry";
import {
  ApiError,
  fail,
  ok,
  requireSession,
  teacherScope,
} from "@/lib/api";
import type { SessionPayload } from "@/lib/auth";

/**
 * Verifica que el estudiante exista y sea accesible para la sesión:
 * un docente solo accede a los suyos; un admin a cualquiera.
 * Devuelve el estudiante (incluye su teacherId dueño).
 */
async function assertAccessibleStudent(
  session: SessionPayload,
  studentId: string,
) {
  const student = await StudentModel.findOne({
    _id: studentId,
    ...teacherScope(session),
  }).lean();
  if (!student) throw new ApiError("Estudiante no encontrado", 404);
  return student as unknown as { teacherId: { toString(): string } };
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await connectDB();
    await assertAccessibleStudent(session, id);

    const entries = await BitacoraEntryModel.find({ studentId: id })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return ok({ entries });
  } catch (error) {
    return fail(error);
  }
}

const createSchema = z.object({
  // Fecha en formato YYYY-MM-DD (día de la bitácora)
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
});

export async function POST(req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await req.json();
    const { date } = createSchema.parse(body);

    await connectDB();
    const student = await assertAccessibleStudent(session, id);

    // Una entrada por día: si ya existe, la reutilizamos.
    const day = new Date(`${date}T00:00:00.000Z`);
    let entry = await BitacoraEntryModel.findOne({
      studentId: id,
      date: day,
    });

    if (!entry) {
      // La bitácora se atribuye al docente dueño del estudiante, no a quien
      // la crea (relevante cuando un admin gestiona estudiantes ajenos).
      entry = await BitacoraEntryModel.create({
        teacherId: student.teacherId,
        studentId: id,
        date: day,
        recordings: [],
      });
    }

    return ok({ entry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(new ApiError(error.issues[0]?.message ?? "Datos inválidos", 422));
    }
    return fail(error);
  }
}
