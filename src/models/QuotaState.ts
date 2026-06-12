import { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * Estado global del guardián de cuotas. Un único documento (singleton)
 * que lleva el conteo de uso para no pasarse del free tier de GCS.
 */
const QuotaStateSchema = new Schema(
  {
    key: { type: String, default: "global", unique: true },

    // Almacenamiento total en GCS (acumulado, no se resetea) — límite 5 GB
    storageBytesUsed: { type: Number, default: 0 },

    // Salida de red / descargas (se resetea cada mes) — límite 100 GB
    egressMonth: { type: String, default: "" }, // "YYYY-MM"
    egressBytesUsed: { type: Number, default: 0 },

    // Operaciones Clase A: subidas/escrituras (se resetea cada mes) — 5.000
    classAMonth: { type: String, default: "" },
    classAUsed: { type: Number, default: 0 },

    // Operaciones Clase B: lecturas/descargas (se resetea cada mes) — 50.000
    classBMonth: { type: String, default: "" },
    classBUsed: { type: Number, default: 0 },

    // Transcripción Qwen (se resetea cada mes)
    qwenMonth: { type: String, default: "" },
    qwenSecondsUsed: { type: Number, default: 0 },

    // Reportes Gemini (se resetea cada mes)
    geminiMonth: { type: String, default: "" },
    geminiRequestsUsed: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type QuotaState = InferSchemaType<typeof QuotaStateSchema>;

export const QuotaStateModel =
  models.QuotaState || model("QuotaState", QuotaStateSchema);
