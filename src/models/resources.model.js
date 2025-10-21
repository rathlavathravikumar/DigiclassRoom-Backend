import mongoose, { Schema } from "mongoose";

/* resource {
  _id: string
  title: string
  description?: string
  file_name: string
  file_url: string (local or cloud path)
  file_size: number (in bytes)
  file_type: string (pdf, document, video, image, text, file)
  course_id: ObjectId(Course)
  uploaded_by: ObjectId(Teacher/Admin)
  uploaded_at: Date
} */

const resourceSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    file_name: { type: String, required: true },
    file_url: { type: String, required: true },
    file_size: { type: Number, default: 0 },
    file_type: { type: String, default: "file" }, // pdf, document, video, image, text, file
    course_id: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    uploaded_by: { 
      _id: { type: Schema.Types.ObjectId, required: true },
      role: { type: String, enum: ["teacher", "admin"], required: true }
    },
  },
  { timestamps: true }
);

export const Resource = mongoose.model("Resource", resourceSchema);