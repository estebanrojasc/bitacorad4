import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import {
  env,
  isGeminiConfigured,
  isQwenConfigured,
  isStorageConfigured,
} from "@/lib/env";
import { pingStorage } from "@/lib/storage";
import { pingGemini } from "@/lib/gemini";

type Check = { ok: boolean; detail: string };

/**
 * Diagnóstico de configuración. Llama con ?token=DIAGNOSTICS_TOKEN para
 * ejecutar pruebas EN VIVO (conexión real a cada servicio).
 * Sin token, solo muestra qué variables están presentes (sin exponer valores).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const deep = url.searchParams.get("deep") === "1";

    const presence = {
      mongo: Boolean(process.env.MONGODB_URI),
      jwtSecret: Boolean(process.env.JWT_SECRET),
      gcs: {
        bucket: Boolean(env.gcs.bucket),
        projectId: Boolean(env.gcs.projectId),
        clientEmail: Boolean(env.gcs.clientEmail),
        privateKey: Boolean(env.gcs.privateKey),
        configured: isStorageConfigured(),
      },
      qwen: isQwenConfigured(),
      gemini: isGeminiConfigured(),
      diagnosticsToken: Boolean(env.diagnosticsToken),
    };

    const authorized =
      Boolean(env.diagnosticsToken) && token === env.diagnosticsToken;

    if (!authorized) {
      return ok({
        authorized: false,
        presence,
        note: "Configura DIAGNOSTICS_TOKEN y llama con ?token=... para pruebas en vivo. Agrega &deep=1 para probar Gemini.",
      });
    }

    const checks: Record<string, Check> = {};

    // MongoDB: conexión + ping
    try {
      await connectDB();
      await mongoose.connection.db?.admin().command({ ping: 1 });
      checks.mongo = { ok: true, detail: "Conexión y ping correctos." };
    } catch (e) {
      checks.mongo = {
        ok: false,
        detail: e instanceof Error ? e.message : String(e),
      };
    }

    // Google Cloud Storage: escritura/lectura/borrado real
    checks.gcs = isStorageConfigured()
      ? await pingStorage()
      : { ok: false, detail: "No configurado (faltan variables GCS)." };

    // Gemini: presencia siempre; llamada real solo con &deep=1
    if (isGeminiConfigured()) {
      checks.gemini = deep
        ? await pingGemini()
        : { ok: true, detail: "Clave presente (usa &deep=1 para probar en vivo)." };
    } else {
      checks.gemini = { ok: false, detail: "No configurado (falta GEMINI_API_KEY)." };
    }

    // Qwen: presencia (la prueba real consumiría cuota de transcripción)
    checks.qwen = {
      ok: isQwenConfigured(),
      detail: isQwenConfigured()
        ? "Clave presente."
        : "No configurado (opcional; Gemini hace de respaldo).",
    };

    const allOk = Object.values(checks).every((c) => c.ok);

    return ok({ authorized: true, allOk, presence, checks });
  } catch (error) {
    return fail(error);
  }
}
