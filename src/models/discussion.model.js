import mongoose, { Schema } from "mongoose";

/* Discussion {
  _id: string
  course_id: ObjectId(Course)
  message: string
  author: {
    _id: ObjectId(User)
    name: string
    role: string
  }
  created_at: Date
  updated_at: Date
  replies: Discussion[] // For future nested replies functionality
} */

const discussionSchema = new Schema(
  {
    course_id: { 
      type: Schema.Types.ObjectId, 
      ref: "Course", 
      required: true 
    },
    message: { 
      type: String, 
      required: true, 
      trim: true 
    },
    author: {
      _id: { 
        type: Schema.Types.ObjectId, 
        required: true 
      },
      name: { 
        type: String, 
        required: true 
      },
      role: { 
        type: String, 
        required: true,
        enum: ["admin", "teacher", "student"]
      }
    },
    replies: [{
      type: Schema.Types.ObjectId,
      ref: "Discussion"
    }]
  },
  { 
    timestamps: true 
  }
);

// Index for efficient querying by course
discussionSchema.index({ course_id: 1, createdAt: -1 });

export const Discussion = mongoose.model("Discussion", discussionSchema);
