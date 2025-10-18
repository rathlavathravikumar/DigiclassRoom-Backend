import mongoose, { Schema } from "mongoose";

const submissionSchema = new Schema(
  {
    type: { type: String, enum: ["assignment", "test"], required: true },
    ref_id: { type: Schema.Types.ObjectId, required: true },
    student_id: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    course_id: { type: Schema.Types.ObjectId, ref: "Course" },
    file_url: { type: String },
    text: { type: String },
    link: { type: String },
  },
  { timestamps: true }
);

submissionSchema.index({ type: 1, ref_id: 1, student_id: 1 }, { unique: true });

export const Submission = mongoose.model("Submission", submissionSchema);
