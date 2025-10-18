import mongoose, { Schema } from "mongoose";

/* test {
  _id: string
  title: string
  description?: string
  scheduled_at: Date
  course_id: ObjectId(Course)
  teacher_id: ObjectId(Teacher)
} */

const testSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    scheduled_at: { type: Date, required: true },
    duration_minutes: { type: Number, default: 60 },
    total_marks: { type: Number, default: 100 },
    questions: [
      {
        question: { type: String, required: true },
        options: { type: [String], required: true, validate: (v) => v.length === 4 },
        correct: { type: String, enum: ["A", "B", "C", "D"], required: true },
      },
    ],
    course_id: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    teacher_id: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
  },
  { timestamps: true }
);

export const Test = mongoose.model("Test", testSchema);
