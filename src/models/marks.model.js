import mongoose, { Schema } from "mongoose";

const marksSchema = new Schema(
  {
    type: { type: String, enum: ["assignment", "test"], required: true },
    ref_id: { type: Schema.Types.ObjectId, required: true },
    student_id: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    teacher_id: { type: Schema.Types.ObjectId, ref: "Teacher" },
    course_id: { type: Schema.Types.ObjectId, ref: "Course" },
    score: { type: Number, required: true },
    max_score: { type: Number, required: true },
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

marksSchema.index({ type: 1, ref_id: 1, student_id: 1 }, { unique: true });

export const Marks = mongoose.model("Marks", marksSchema);
