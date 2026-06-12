import { connectDB } from "@/lib/db";
import { BitacoraEntryModel } from "@/models/BitacoraEntry";
import { ApiError, fail, ok, requireSession } from "@/lib/api";
import { createPlaybackUrl } from "@/lib/storage";
import { isStorageConfigured } from "@/lib/env";

type Ctx = { params: Promise<{ entryId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { entryId } = await params;

    await connectDB();
    const entry = await BitacoraEntryModel.findOne({
      _id: entryId,
      teacherId: session.teacherId,
    }).lean();
    if (!entry) throw new ApiError("Bitácora no encontrada", 404);

    const storageOn = isStorageConfigured();
    const rawRecordings = (
      entry as unknown as { recordings: Array<{ storageKey: string }> }
    ).recordings;
    const recordings = await Promise.all(
      rawRecordings.map(async (r) => ({
        ...r,
        playbackUrl: storageOn ? await safePlayback(r.storageKey) : null,
      })),
    );

    return ok({ entry: { ...entry, recordings } });
  } catch (error) {
    return fail(error);
  }
}

async function safePlayback(key: string): Promise<string | null> {
  try {
    return await createPlaybackUrl(key, 3600);
  } catch {
    return null;
  }
}
