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
  },
  { timestamps: true },
);

export type Teacher = InferSchemaType<typeof TeacherSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const TeacherModel =
  models.Teacher || model("Teacher", TeacherSchema);
