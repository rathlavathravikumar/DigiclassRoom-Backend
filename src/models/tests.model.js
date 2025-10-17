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
    course_id: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    teacher_id: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
  },
  { timestamps: true }
);

export const Test = mongoose.model("Test", testSchema);
