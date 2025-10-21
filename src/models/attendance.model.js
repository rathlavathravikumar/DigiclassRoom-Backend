import mongoose, { Schema } from "mongoose";

/* attendance {
  _id: string
  course_id: ObjectId(Course)
  date: Date
  records: [{
    student_id: ObjectId(Student)
    status: 'present' | 'absent'
  }]
  marked_by: ObjectId(Teacher)
  createdAt: Date
  updatedAt: Date
} */

const attendanceSchema = new Schema(
  {
    course_id: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    date: { type: Date, required: true },
    records: [
      {
        student_id: { type: Schema.Types.ObjectId, ref: "Student", required: true },
        status: { type: String, enum: ["present", "absent"], required: true },
        _id: false,
      },
    ],
    marked_by: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
  },
  { timestamps: true }
);

// Unique attendance per course per date
attendanceSchema.index({ course_id: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model("Attendance", attendanceSchema);