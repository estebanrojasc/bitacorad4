import { z } from "zod";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { ApiError, fail, ok, requireSession } from "@/lib/api";
import { assertCanUpload } from "@/lib/quota";
import { buildRecordingKey, createUploadUrl } from "@/lib/storage";

const schema = z.object({
  studentId: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  ext: z.string().regex(/^[a-z0-9]+$/i).default("webm"),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { studentId, contentType, sizeBytes, ext } = schema.parse(body);

    await connectDB();
    const student = await StudentModel.findOne({
      _id: studentId,
      teacherId: session.teacherId,
    }).lean();
    if (!student) throw new ApiError("Estudiante no encontrado", 404);

    // Guardián de cuotas: bloquea si superaría el free tier.
    await assertCanUpload(sizeBytes);

    const storageKey = buildRecordingKey(session.teacherId, studentId, ext);
    const uploadUrl = await createUploadUrl(storageKey, contentType);

    return ok({ uploadUrl, storageKey });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(new ApiError(error.issues[0]?.message ?? "Datos inválidos", 422));
    }
    return fail(error);
  }
}
