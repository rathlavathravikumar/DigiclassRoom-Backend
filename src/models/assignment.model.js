import mongoose, { Schema } from "mongoose";

/* assignment {
  _id: string
  title: string
  description?: string
  due_date: Date
  course_id: ObjectId(Course)
  teacher_id: ObjectId(Teacher)
  total_marks: number (default: 100)
} */

const assignmentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    due_date: { type: Date, required: true },
    course_id: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    teacher_id: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    total_marks: { type: Number, default: 100 },
  },
  { timestamps: true }
);

export const Assignment = mongoose.model("Assignment", assignmentSchema);
