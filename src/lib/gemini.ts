import { GoogleGenAI, Type } from "@google/genai";
import { env, isGeminiConfigured } from "./env";
import { ApiError } from "./api";

const MODEL = "gemini-2.5-flash";

let ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!isGeminiConfigured()) {
    throw new ApiError("Gemini aún no está configurado.", 503);
  }
  if (!ai) ai = new GoogleGenAI({ apiKey: env.gemini.apiKey! });
  return ai;
}

/** Transcripción de respaldo con Gemini (recibe el audio en base64). */
export async function transcribeWithGemini(
  audioBase64: string,
  mimeType: string,
): Promise<string> {
  const res = await getAI().models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Transcribe este audio en español de forma literal y completa. Devuelve solo el texto transcrito, sin comentarios.",
          },
          { inlineData: { mimeType, data: audioBase64 } },
        ],
      },
    ],
  });
  return (res.text ?? "").trim();
}

/** Llamada mínima para validar que la API key de Gemini funciona. */
export async function pingGemini(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await getAI().models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: "Responde solo: ok" }] }],
      config: { maxOutputTokens: 5, temperature: 0 },
    });
    const t = (res.text ?? "").trim();
    return {
      ok: t.length > 0,
      detail: t ? `Respuesta del modelo: "${t.slice(0, 40)}"` : "Sin texto",
    };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

export type StudentReport = {
  resumen: string;
  aspectosAcademicos: string;
  comportamiento: string;
  aspectosSocioemocionales: string;
  logros: string[];
  areasDeMejora: string[];
  recomendaciones: string[];
  seguimientoSugerido: string;
};

const reportSchema = {
  type: Type.OBJECT,
  properties: {
    resumen: { type: Type.STRING },
    aspectosAcademicos: { type: Type.STRING },
    comportamiento: { type: Type.STRING },
    aspectosSocioemocionales: { type: Type.STRING },
    logros: { type: Type.ARRAY, items: { type: Type.STRING } },
    areasDeMejora: { type: Type.ARRAY, items: { type: Type.STRING } },
    recomendaciones: { type: Type.ARRAY, items: { type: Type.STRING } },
    seguimientoSugerido: { type: Type.STRING },
  },
  required: [
    "resumen",
    "aspectosAcademicos",
    "comportamiento",
    "aspectosSocioemocionales",
    "logros",
    "areasDeMejora",
    "recomendaciones",
    "seguimientoSugerido",
  ],
};

const SYSTEM_PROMPT = `Eres un asistente pedagógico experto que redacta bitácoras escolares profesionales.
A partir de las transcripciones de audio (notas de voz del docente sobre un estudiante durante un día),
genera un reporte estructurado, claro y útil.

Reglas estrictas:
- Responde SIEMPRE en español, en tono profesional y empático.
- Rellena TODOS los campos del esquema, incluso si la información es breve: infiere de forma razonable y prudente, sin inventar hechos graves.
- Si algún aspecto no se menciona, escribe una observación neutral (ej: "No se registraron novedades en este aspecto.") en vez de dejarlo vacío.
- "logros", "areasDeMejora" y "recomendaciones" deben tener entre 1 y 4 elementos concretos y accionables.
- Sé específico y basado en lo que dicen las transcripciones. No uses relleno genérico.`;

export async function generateReport(input: {
  studentName: string;
  course: string;
  date: string;
  transcripts: string[];
}): Promise<{ report: StudentReport; model: string }> {
  const joined = input.transcripts
    .map((t, i) => `Grabación ${i + 1}: ${t}`)
    .join("\n\n");

  const userPrompt = `Estudiante: ${input.studentName}
Curso: ${input.course}
Fecha: ${input.date}

Transcripciones del día:
${joined || "(sin transcripciones)"}

Genera la bitácora estructurada del estudiante para esta fecha.`;

  const res = await getAI().models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: reportSchema,
      temperature: 0.4,
    },
  });

  const text = res.text ?? "{}";
  let parsed: StudentReport;
  try {
    parsed = JSON.parse(text) as StudentReport;
  } catch {
    throw new ApiError("Gemini devolvió un reporte no válido.", 502);
  }
  return { report: parsed, model: MODEL };
}
