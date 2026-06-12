import { env, isQwenConfigured } from "./env";
import { ApiError } from "./api";

const baseUrl = () =>
  env.dashscope.international
    ? "https://dashscope-intl.aliyuncs.com/api/v1"
    : "https://dashscope.aliyuncs.com/api/v1";

type SubmitResponse = {
  output?: { task_id?: string; task_status?: string };
  message?: string;
};

type PollResponse = {
  output?: {
    task_status?: string;
    result?: { transcription_url?: string };
    message?: string;
  };
  message?: string;
};

async function submitTask(fileUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl()}/services/audio/asr/transcription`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.dashscope.apiKey}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable",
    },
    body: JSON.stringify({
      model: "qwen3-asr-flash-filetrans",
      input: { file_url: fileUrl },
      parameters: { language: "es" },
    }),
  });

  const data = (await res.json()) as SubmitResponse;
  const taskId = data.output?.task_id;
  if (!res.ok || !taskId) {
    throw new ApiError(
      `Qwen no aceptó la tarea: ${data.message ?? res.statusText}`,
      502,
    );
  }
  return taskId;
}

async function pollTask(
  taskId: string,
  { timeoutMs = 120_000, intervalMs = 3_000 } = {},
): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${baseUrl()}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${env.dashscope.apiKey}` },
    });
    const data = (await res.json()) as PollResponse;
    const status = data.output?.task_status;

    if (status === "SUCCEEDED") {
      const url = data.output?.result?.transcription_url;
      if (!url) throw new ApiError("Qwen no devolvió resultado", 502);
      return url;
    }
    if (status === "FAILED" || status === "UNKNOWN") {
      throw new ApiError(
        `Qwen falló: ${data.output?.message ?? "estado " + status}`,
        502,
      );
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new ApiError("La transcripción de Qwen tardó demasiado", 504);
}

async function fetchTranscript(transcriptionUrl: string): Promise<string> {
  const res = await fetch(transcriptionUrl);
  const data = (await res.json()) as {
    transcripts?: Array<{ text?: string }>;
  };
  return (data.transcripts ?? [])
    .map((t) => t.text ?? "")
    .join("\n")
    .trim();
}

/** Transcribe un audio (por URL pública/firmada) usando Qwen. */
export async function transcribeWithQwen(fileUrl: string): Promise<string> {
  if (!isQwenConfigured()) {
    throw new ApiError("Qwen (DashScope) aún no está configurado.", 503);
  }
  const taskId = await submitTask(fileUrl);
  const transcriptionUrl = await pollTask(taskId);
  return fetchTranscript(transcriptionUrl);
}
