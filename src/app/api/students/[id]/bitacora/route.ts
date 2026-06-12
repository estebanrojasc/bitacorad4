import { z } from "zod";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { BitacoraEntryModel } from "@/models/BitacoraEntry";
import { ApiError, fail, ok, requireSession } from "@/lib/api";

async function assertOwnedStudent(teacherId: string, studentId: string) {
  const student = await StudentModel.findOne({
    _id: studentId,
    teacherId,
  }).lean();
  if (!student) throw new ApiError("Estudiante no encontrado", 404);
  return student;
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await connectDB();
    await assertOwnedStudent(session.teacherId, id);

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
    await assertOwnedStudent(session.teacherId, id);

    // Una entrada por día: si ya existe, la reutilizamos.
    const day = new Date(`${date}T00:00:00.000Z`);
    let entry = await BitacoraEntryModel.findOne({
      studentId: id,
      date: day,
    });

    if (!entry) {
      entry = await BitacoraEntryModel.create({
        teacherId: session.teacherId,
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
