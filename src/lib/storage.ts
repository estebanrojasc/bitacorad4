import { Storage } from "@google-cloud/storage";
import { env, isStorageConfigured } from "./env";
import { ApiError } from "./api";

let storage: Storage | null = null;

function getStorage(): Storage {
  if (!isStorageConfigured()) {
    throw new ApiError(
      "El almacenamiento (Google Cloud Storage) aún no está configurado.",
      503,
    );
  }
  if (!storage) {
    // Dos formas de autenticar:
    // 1) clientEmail + privateKey (ideal para despliegue: Vercel, etc.)
    // 2) GOOGLE_APPLICATION_CREDENTIALS apuntando a un JSON (ideal local)
    if (env.gcs.clientEmail && env.gcs.privateKey) {
      storage = new Storage({
        projectId: env.gcs.projectId,
        credentials: {
          client_email: env.gcs.clientEmail,
          private_key: env.gcs.privateKey,
        },
      });
    } else {
      storage = new Storage({ projectId: env.gcs.projectId });
    }
  }
  return storage;
}

function getFile(key: string) {
  return getStorage().bucket(env.gcs.bucket!).file(key);
}

/** URL firmada (v4) para que el navegador suba el audio directo a GCS (PUT). */
export async function createUploadUrl(
  key: string,
  contentType: string,
): Promise<string> {
  const [url] = await getFile(key).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 10 * 60 * 1000, // 10 min
    contentType,
  });
  return url;
}

/** URL firmada (v4) temporal para reproducir o transcribir el audio (GET). */
export async function createPlaybackUrl(
  key: string,
  expiresSeconds = 3600,
): Promise<string> {
  const [url] = await getFile(key).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + expiresSeconds * 1000,
  });
  return url;
}

export async function deleteObject(key: string): Promise<void> {
  await getFile(key).delete({ ignoreNotFound: true });
}

/**
 * Tamaño real del bucket sumando los metadatos de los objetos.
 * Útil para reconciliar el contador local. Devuelve null si falla.
 * Nota: cada llamada hace listados (operaciones Clase A), úsala con moderación.
 */
export async function getRealBucketBytes(): Promise<number | null> {
  try {
    const [files] = await getStorage().bucket(env.gcs.bucket!).getFiles();
    let total = 0;
    for (const f of files) total += Number(f.metadata.size ?? 0);
    return total;
  } catch {
    return null;
  }
}

/**
 * Prueba de extremo a extremo: escribe, lee y borra un objeto pequeño.
 * Valida credenciales, bucket y permisos (Storage Object Admin).
 */
export async function pingStorage(): Promise<{ ok: boolean; detail: string }> {
  try {
    const bucket = getStorage().bucket(env.gcs.bucket!);
    const key = `healthcheck/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.txt`;
    const file = bucket.file(key);
    await file.save(Buffer.from("ok"), {
      contentType: "text/plain",
      resumable: false,
    });
    const [contents] = await file.download();
    await file.delete({ ignoreNotFound: true });
    const valid = contents.toString() === "ok";
    return {
      ok: valid,
      detail: valid
        ? "Escritura, lectura y borrado correctos."
        : "Se escribió pero la lectura no coincide.",
    };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

export function buildRecordingKey(
  teacherId: string,
  studentId: string,
  ext: string,
): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `audio/${teacherId}/${studentId}/${ts}-${rand}.${ext}`;
}
