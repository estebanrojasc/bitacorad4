import { connectDB } from "@/lib/db";
import { BitacoraEntryModel } from "@/models/BitacoraEntry";
import { StudentModel } from "@/models/Student";
import { ApiError, fail, ok, requireSession } from "@/lib/api";
import { generateReport } from "@/lib/gemini";
import { addGeminiUsage, assertCanGenerateReport } from "@/lib/quota";
import { isGeminiConfigured } from "@/lib/env";

type Ctx = { params: Promise<{ entryId: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { entryId } = await params;

    if (!isGeminiConfigured()) {
      throw new ApiError("Gemini aún no está configurado.", 503);
    }

    await connectDB();
    const entry = await BitacoraEntryModel.findOne({
      _id: entryId,
      teacherId: session.teacherId,
    });
    if (!entry) throw new ApiError("Bitácora no encontrada", 404);

    const transcripts = entry.recordings
      .map((r: { transcription?: string }) => (r.transcription ?? "").trim())
      .filter((t: string) => t.length > 0);

    if (transcripts.length === 0) {
      throw new ApiError(
        "Aún no hay transcripciones. Transcribe al menos una grabación antes de generar el reporte.",
        409,
      );
    }

    const student = await StudentModel.findById(entry.studentId).lean();
    if (!student) throw new ApiError("Estudiante no encontrado", 404);

    await assertCanGenerateReport();

    const dateStr = new Date(entry.date).toISOString().slice(0, 10);
    const { report, model } = await generateReport({
      studentName: (student as { name: string }).name,
      course: (student as { course: string }).course,
      date: dateStr,
      transcripts,
    });

    entry.report = { ...report, model, generatedAt: new Date() };
    await entry.save();
    await addGeminiUsage();

    return ok({ report: entry.report, entry });
  } catch (error) {
    return fail(error);
  }
}
