import { connectDB } from "@/lib/db";
import { BitacoraEntryModel } from "@/models/BitacoraEntry";
import { ApiError, fail, ok, requireSession } from "@/lib/api";
import { createPlaybackUrl } from "@/lib/storage";
import { transcribeWithQwen } from "@/lib/qwen";
import { transcribeWithGemini } from "@/lib/gemini";
import {
  addDownloadUsage,
  addQwenUsage,
  assertCanDownload,
  assertCanTranscribe,
} from "@/lib/quota";
import { isGeminiConfigured, isQwenConfigured } from "@/lib/env";

type Ctx = { params: Promise<{ entryId: string; recordingId: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { entryId, recordingId } = await params;

    await connectDB();
    const entry = await BitacoraEntryModel.findOne({
      _id: entryId,
      teacherId: session.teacherId,
    });
    if (!entry) throw new ApiError("Bitácora no encontrada", 404);

    const recording = entry.recordings.id(recordingId);
    if (!recording) throw new ApiError("Grabación no encontrada", 404);

    if (!isQwenConfigured() && !isGeminiConfigured()) {
      throw new ApiError(
        "No hay servicio de transcripción configurado todavía.",
        503,
      );
    }

    await assertCanTranscribe(recording.durationSec || 0);
    // Transcribir implica que el proveedor descarga el audio desde GCS (egress).
    await assertCanDownload(recording.sizeBytes || 0);

    recording.transcriptionStatus = "processing";
    await entry.save();

    const playbackUrl = await createPlaybackUrl(recording.storageKey, 3600);

    let text = "";
    let provider: "qwen" | "gemini" = "qwen";

    try {
      if (!isQwenConfigured()) throw new Error("qwen-no-config");
      text = await transcribeWithQwen(playbackUrl);
      provider = "qwen";
    } catch (qwenError) {
      // Respaldo automático con Gemini.
      if (!isGeminiConfigured()) throw qwenError;
      const audioRes = await fetch(playbackUrl);
      const buf = Buffer.from(await audioRes.arrayBuffer());
      text = await transcribeWithGemini(
        buf.toString("base64"),
        recording.mimeType || "audio/webm",
      );
      provider = "gemini";
    }

    recording.transcription = text;
    recording.transcriptionStatus = "done";
    recording.transcriptionProvider = provider;
    await entry.save();

    if (recording.durationSec > 0) await addQwenUsage(recording.durationSec);
    // Registra la descarga del audio (egress + operación Clase B).
    if (recording.sizeBytes > 0) await addDownloadUsage(recording.sizeBytes);

    return ok({ transcription: text, provider, entry });
  } catch (error) {
    try {
      const session = await requireSession();
      const { entryId, recordingId } = await params;
      await connectDB();
      const entry = await BitacoraEntryModel.findOne({
        _id: entryId,
        teacherId: session.teacherId,
      });
      const recording = entry?.recordings.id(recordingId);
      if (recording) {
        recording.transcriptionStatus = "error";
        await entry!.save();
      }
    } catch {
      /* ignora errores al marcar el estado */
    }
    return fail(error);
  }
}
