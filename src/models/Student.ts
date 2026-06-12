import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

const StudentSchema = new Schema(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    course: { type: String, required: true, trim: true },
    // Color de avatar para la UI gamificada
    color: { type: String, default: "#6366f1" },
  },
  { timestamps: true },
);

export type Student = InferSchemaType<typeof StudentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const StudentModel =
  models.Student || model("Student", StudentSchema);
