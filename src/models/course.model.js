import mongoose, { Schema } from "mongoose";

/* course {
  _id: string
  name: string
  code: string
  description?: string
  teacher_id: ObjectId(Teacher)
} */

const courseSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: "" },
    teacher_id: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
  },
  { timestamps: true }
);

export const Course = mongoose.model("Course", courseSchema);
