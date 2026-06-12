import { fail, ok, requireSession } from "@/lib/api";
import { getQuotaSnapshot } from "@/lib/quota";
import {
  isGeminiConfigured,
  isStorageConfigured,
  isQwenConfigured,
} from "@/lib/env";

export async function GET() {
  try {
    await requireSession();
    const snapshot = await getQuotaSnapshot();
    return ok({
      ...snapshot,
      configured: {
        storage: isStorageConfigured(),
        qwen: isQwenConfigured(),
        gemini: isGeminiConfigured(),
      },
    });
  } catch (error) {
    return fail(error);
  }
}
