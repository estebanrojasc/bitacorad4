import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { ApiError, fail, ok, requireSession } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await connectDB();
    const student = await StudentModel.findOne({
      _id: id,
      teacherId: session.teacherId,
    }).lean();
    if (!student) throw new ApiError("Estudiante no encontrado", 404);
    return ok({ student });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await connectDB();
    const res = await StudentModel.deleteOne({
      _id: id,
      teacherId: session.teacherId,
    });
    if (res.deletedCount === 0)
      throw new ApiError("Estudiante no encontrado", 404);
    return ok({ success: true });
  } catch (error) {
    return fail(error);
  }
}
