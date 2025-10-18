import mongoose, { Schema } from "mongoose";

/* course {
  _id: string
  name: string
  code: string
  description?: string
  teacher_id: ObjectId(Teacher)
  students?: ObjectId(Student)[]
  course_plan?: string
} */

const courseSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    teacher_id: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    students: [{ type: Schema.Types.ObjectId, ref: "Student" }],
    course_plan: { type: String, default: "" },
    admin_id: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
  },
  { timestamps: true }
);

// Unique course code per admin
courseSchema.index({ admin_id: 1, code: 1 }, { unique: true });

export const Course = mongoose.model("Course", courseSchema);
