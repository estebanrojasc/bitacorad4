import { connectDB } from "./db";
import { QuotaStateModel } from "@/models/QuotaState";
import { env } from "./env";
import { ApiError } from "./api";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function getState() {
  await connectDB();
  let state = await QuotaStateModel.findOne({ key: "global" });
  if (!state) state = await QuotaStateModel.create({ key: "global" });
  return state;
}

/** Devuelve el uso del contador mensual, reseteándolo (en memoria) si cambió el mes. */
function monthlyUsed(stateMonth: string, used: number): number {
  return stateMonth === currentMonth() ? used : 0;
}

export type QuotaSnapshot = {
  storage: { usedBytes: number; maxBytes: number; remainingBytes: number };
  egress: { usedBytes: number; maxBytes: number; remainingBytes: number };
  classA: { used: number; max: number; remaining: number };
  classB: { used: number; max: number; remaining: number };
  qwen: { usedSeconds: number; maxSeconds: number; remainingSeconds: number };
  gemini: { usedRequests: number; maxRequests: number; remainingRequests: number };
};

export async function getQuotaSnapshot(): Promise<QuotaSnapshot> {
  const s = await getState();
  const q = env.quota;

  const egress = monthlyUsed(s.egressMonth, s.egressBytesUsed);
  const classA = monthlyUsed(s.classAMonth, s.classAUsed);
  const classB = monthlyUsed(s.classBMonth, s.classBUsed);
  const qwen = monthlyUsed(s.qwenMonth, s.qwenSecondsUsed);
  const gemini = monthlyUsed(s.geminiMonth, s.geminiRequestsUsed);

  return {
    storage: {
      usedBytes: s.storageBytesUsed,
      maxBytes: q.storageMaxBytes,
      remainingBytes: Math.max(0, q.storageMaxBytes - s.storageBytesUsed),
    },
    egress: {
      usedBytes: egress,
      maxBytes: q.egressMaxBytesPerMonth,
      remainingBytes: Math.max(0, q.egressMaxBytesPerMonth - egress),
    },
    classA: {
      used: classA,
      max: q.classAMaxPerMonth,
      remaining: Math.max(0, q.classAMaxPerMonth - classA),
    },
    classB: {
      used: classB,
      max: q.classBMaxPerMonth,
      remaining: Math.max(0, q.classBMaxPerMonth - classB),
    },
    qwen: {
      usedSeconds: qwen,
      maxSeconds: q.qwenMaxSecondsPerMonth,
      remainingSeconds: Math.max(0, q.qwenMaxSecondsPerMonth - qwen),
    },
    gemini: {
      usedRequests: gemini,
      maxRequests: q.geminiMaxRequestsPerMonth,
      remainingRequests: Math.max(0, q.geminiMaxRequestsPerMonth - gemini),
    },
  };
}

// ─── Almacenamiento + operaciones de subida (Clase A) ───────────────

/** Bloquea si una nueva subida superaría el límite de almacenamiento u operaciones. */
export async function assertCanUpload(sizeBytes: number): Promise<void> {
  const s = await getState();

  if (s.storageBytesUsed + sizeBytes > env.quota.storageMaxBytes) {
    throw new ApiError(
      "Se alcanzó el límite gratuito de almacenamiento (5 GB). Elimina audios antiguos antes de subir más.",
      507, // Insufficient Storage
    );
  }

  const classA = monthlyUsed(s.classAMonth, s.classAUsed);
  if (classA + 1 > env.quota.classAMaxPerMonth) {
    throw new ApiError(
      "Se alcanzó el límite mensual de operaciones de subida. Intenta el próximo mes.",
      429,
    );
  }
}

/** Registra una subida exitosa: suma bytes almacenados + 1 operación Clase A. */
export async function addUploadUsage(sizeBytes: number): Promise<void> {
  const s = await getState();
  const month = currentMonth();

  s.storageBytesUsed += sizeBytes;

  if (s.classAMonth !== month) {
    s.classAMonth = month;
    s.classAUsed = 0;
  }
  s.classAUsed += 1;

  await s.save();
}

/** Resta bytes al borrar un objeto del almacenamiento. */
export async function subtractStorageUsage(sizeBytes: number): Promise<void> {
  const s = await getState();
  s.storageBytesUsed = Math.max(0, s.storageBytesUsed - sizeBytes);
  await s.save();
}

// ─── Descargas / salida de red (egress) + operaciones de lectura (Clase B) ──

/** Bloquea si una descarga superaría el límite de egress u operaciones de lectura. */
export async function assertCanDownload(sizeBytes: number): Promise<void> {
  const s = await getState();

  const egress = monthlyUsed(s.egressMonth, s.egressBytesUsed);
  if (egress + sizeBytes > env.quota.egressMaxBytesPerMonth) {
    throw new ApiError(
      "Se alcanzó el límite mensual de descargas (100 GB). Intenta el próximo mes.",
      429,
    );
  }

  const classB = monthlyUsed(s.classBMonth, s.classBUsed);
  if (classB + 1 > env.quota.classBMaxPerMonth) {
    throw new ApiError(
      "Se alcanzó el límite mensual de operaciones de lectura. Intenta el próximo mes.",
      429,
    );
  }
}

/** Registra una descarga: suma bytes de egress + 1 operación Clase B. */
export async function addDownloadUsage(sizeBytes: number): Promise<void> {
  const s = await getState();
  const month = currentMonth();

  if (s.egressMonth !== month) {
    s.egressMonth = month;
    s.egressBytesUsed = 0;
  }
  s.egressBytesUsed += sizeBytes;

  if (s.classBMonth !== month) {
    s.classBMonth = month;
    s.classBUsed = 0;
  }
  s.classBUsed += 1;

  await s.save();
}

// ─── Transcripción (Qwen) ───────────────────────────────────────────

export async function assertCanTranscribe(seconds: number): Promise<void> {
  const s = await getState();
  const used = monthlyUsed(s.qwenMonth, s.qwenSecondsUsed);
  if (used + seconds > env.quota.qwenMaxSecondsPerMonth) {
    throw new ApiError(
      "Se alcanzó el límite mensual de transcripción. Intenta el próximo mes o ajusta la cuota.",
      429,
    );
  }
}

export async function addQwenUsage(seconds: number): Promise<void> {
  const s = await getState();
  const month = currentMonth();
  if (s.qwenMonth !== month) {
    s.qwenMonth = month;
    s.qwenSecondsUsed = 0;
  }
  s.qwenSecondsUsed += seconds;
  await s.save();
}

// ─── Reportes (Gemini) ──────────────────────────────────────────────

export async function assertCanGenerateReport(): Promise<void> {
  const s = await getState();
  const used = monthlyUsed(s.geminiMonth, s.geminiRequestsUsed);
  if (used + 1 > env.quota.geminiMaxRequestsPerMonth) {
    throw new ApiError(
      "Se alcanzó el límite mensual de generación de reportes (Gemini).",
      429,
    );
  }
}

export async function addGeminiUsage(): Promise<void> {
  const s = await getState();
  const month = currentMonth();
  if (s.geminiMonth !== month) {
    s.geminiMonth = month;
    s.geminiRequestsUsed = 0;
  }
  s.geminiRequestsUsed += 1;
  await s.save();
}
