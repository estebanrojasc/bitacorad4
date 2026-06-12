"use client";

import { api } from "./client";
import { allPending, deletePending } from "./offline";

/**
 * Sube las grabaciones pendientes (cola offline) a Google Cloud Storage y
 * las registra. Si GCS aún no está configurado, las deja en cola sin error fatal.
 */
export async function syncPending(): Promise<{
  uploaded: number;
  failed: number;
  blocked: boolean;
  errors: string[];
}> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { uploaded: 0, failed: 0, blocked: false, errors: [] };
  }

  const items = await allPending();
  let uploaded = 0;
  let failed = 0;
  let blocked = false;
  const errors: string[] = [];

  for (const item of items) {
    try {
      const { uploadUrl, storageKey } = await api<{
        uploadUrl: string;
        storageKey: string;
      }>("/api/uploads/sign", {
        method: "POST",
        body: JSON.stringify({
          studentId: item.studentId,
          contentType: item.mimeType,
          sizeBytes: item.sizeBytes,
          ext: item.ext,
        }),
      });

      let put: Response;
      try {
        put = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": item.mimeType },
          body: item.blob,
        });
      } catch {
        // Un fetch que lanza (en vez de devolver !ok) suele ser CORS o red.
        throw new Error(
          "No se pudo conectar con Google Cloud Storage (posible CORS del bucket o sin internet).",
        );
      }

      if (!put.ok) {
        const detail = await put.text().catch(() => "");
        throw new Error(
          `GCS rechazó la subida (${put.status}). ${detail.slice(0, 300)}`,
        );
      }

      await api(`/api/bitacora/${item.entryId}/recordings`, {
        method: "POST",
        body: JSON.stringify({
          storageKey,
          mimeType: item.mimeType,
          durationSec: item.durationSec,
          sizeBytes: item.sizeBytes,
          note: item.note,
        }),
      });

      await deletePending(item.id);
      uploaded += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // 503 = servicio (GCS) aún no configurado: no es un fallo del usuario.
      if (/no está configurado/i.test(message)) {
        blocked = true;
        break;
      }
      failed += 1;
      errors.push(message);
    }
  }

  return { uploaded, failed, blocked, errors };
}
