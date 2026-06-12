import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

const TeacherSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    // Rol del usuario. "admin" puede ver y gestionar los datos de todos los
    // docentes; "teacher" solo accede a sus propios estudiantes y bitácoras.
    // Las cuentas admin se definen directamente en base de datos.
    role: {
      type: String,
      enum: ["teacher", "admin"],
      default: "teacher",
      index: true,
    },
  },
  { timestamps: true },
);

export type Teacher = InferSchemaType<typeof TeacherSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const TeacherModel =
  models.Teacher || model("Teacher", TeacherSchema);
