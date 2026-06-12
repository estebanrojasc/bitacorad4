import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

const RecordingSchema = new Schema(
  {
    storageKey: { type: String, required: true },
    mimeType: { type: String, default: "audio/webm" },
    durationSec: { type: Number, default: 0 },
    sizeBytes: { type: Number, default: 0 },
    transcription: { type: String, default: "" },
    transcriptionStatus: {
      type: String,
      enum: ["pending", "processing", "done", "error"],
      default: "pending",
    },
    transcriptionProvider: {
      type: String,
      enum: ["qwen", "gemini", ""],
      default: "",
    },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

const ReportSchema = new Schema(
  {
    resumen: { type: String, default: "" },
    aspectosAcademicos: { type: String, default: "" },
    comportamiento: { type: String, default: "" },
    aspectosSocioemocionales: { type: String, default: "" },
    logros: { type: [String], default: [] },
    areasDeMejora: { type: [String], default: [] },
    recomendaciones: { type: [String], default: [] },
    seguimientoSugerido: { type: String, default: "" },
    model: { type: String, default: "" },
    generatedAt: { type: Date },
  },
  { _id: false },
);

const BitacoraEntrySchema = new Schema(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    // Día de la bitácora (la fecha del suceso, puede ser hoy u otra)
    date: { type: Date, required: true, index: true },
    recordings: { type: [RecordingSchema], default: [] },
    report: { type: ReportSchema, default: undefined },
  },
  { timestamps: true },
);

export type BitacoraEntry = InferSchemaType<typeof BitacoraEntrySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const BitacoraEntryModel =
  models.BitacoraEntry || model("BitacoraEntry", BitacoraEntrySchema);
