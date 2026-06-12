/** Cliente fetch para la API interna. Lanza Error con el mensaje del backend. */
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? "Error en la solicitud");
  }
  return data as T;
}

export type Student = {
  _id: string;
  name: string;
  course: string;
  color: string;
};

export type Recording = {
  _id: string;
  storageKey: string;
  mimeType: string;
  durationSec: number;
  sizeBytes: number;
  transcription: string;
  transcriptionStatus: "pending" | "processing" | "done" | "error";
  transcriptionProvider: "qwen" | "gemini" | "";
  note?: string;
  createdAt: string;
  playbackUrl?: string | null;
};

export type Report = {
  resumen: string;
  aspectosAcademicos: string;
  comportamiento: string;
  aspectosSocioemocionales: string;
  logros: string[];
  areasDeMejora: string[];
  recomendaciones: string[];
  seguimientoSugerido: string;
  model?: string;
  generatedAt?: string;
};

export type BitacoraEntry = {
  _id: string;
  studentId: string;
  date: string;
  recordings: Recording[];
  report?: Report;
  createdAt: string;
};
