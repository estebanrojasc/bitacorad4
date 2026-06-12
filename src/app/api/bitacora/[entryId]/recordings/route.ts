import { z } from "zod";
import { connectDB } from "@/lib/db";
import { BitacoraEntryModel } from "@/models/BitacoraEntry";
import { ApiError, fail, ok, requireSession } from "@/lib/api";
import { addUploadUsage } from "@/lib/quota";

const schema = z.object({
  storageKey: z.string().min(1),
  mimeType: z.string().default("audio/webm"),
  durationSec: z.number().nonnegative().default(0),
  sizeBytes: z.number().int().nonnegative().default(0),
  note: z.string().optional(),
});

type Ctx = { params: Promise<{ entryId: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { entryId } = await params;
    const body = await req.json();
    const data = schema.parse(body);

    await connectDB();
    const entry = await BitacoraEntryModel.findOne({
      _id: entryId,
      teacherId: session.teacherId,
    });
    if (!entry) throw new ApiError("Bitácora no encontrada", 404);

    entry.recordings.push({
      storageKey: data.storageKey,
      mimeType: data.mimeType,
      durationSec: data.durationSec,
      sizeBytes: data.sizeBytes,
      note: data.note ?? "",
      transcriptionStatus: "pending",
    });
    await entry.save();

    // Actualiza el contador del guardián de cuotas (almacenamiento + operación Clase A).
    await addUploadUsage(data.sizeBytes);

    const recording = entry.recordings[entry.recordings.length - 1];
    return ok({ entry, recordingId: recording._id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(new ApiError(error.issues[0]?.message ?? "Datos inválidos", 422));
    }
    return fail(error);
  }
}
