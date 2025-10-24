/*
meeting {
  _id: string (pk)
  title: string
  description?: string
  course_id: ObjectId(Course)
  teacher_id: ObjectId(Teacher)
  scheduled_time: Date
  duration: number (minutes)
  meeting_link: string
  meeting_id: string (external meeting provider ID)
  meeting_password?: string
  status: enum ['scheduled', 'ongoing', 'completed', 'cancelled']
  attendees: ObjectId(Student)[]
  admin_id: ObjectId(Admin)
  createdAt: Date
  updatedAt: Date
}
*/

import mongoose, { Schema } from "mongoose";

const meetingSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: "",
      trim: true
    },
    course_id: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true
    },
    teacher_id: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true
    },
    scheduled_time: {
      type: Date,
      required: true
    },
    duration: {
      type: Number,
      required: true,
      min: 15,
      max: 480, // 8 hours max
      default: 60
    },
    meeting_link: {
      type: String,
      required: true
    },
    meeting_id: {
      type: String,
      required: true
    },
    meeting_password: {
      type: String,
      default: ""
    },
    provider: {
      type: String,
      enum: ['jitsi'],
      default: 'jitsi'
    },
    room_name: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    attendees: [{
      type: Schema.Types.ObjectId,
      ref: "Student"
    }],
    admin_id: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true
    }
  },
  { timestamps: true }
);

// Index for efficient queries
meetingSchema.index({ course_id: 1, scheduled_time: 1 });
meetingSchema.index({ teacher_id: 1, scheduled_time: 1 });
meetingSchema.index({ admin_id: 1, scheduled_time: 1 });
meetingSchema.index({ status: 1, scheduled_time: 1 });

// Virtual for end time
meetingSchema.virtual('end_time').get(function() {
  return new Date(this.scheduled_time.getTime() + (this.duration * 60 * 1000));
});

// Method to check if meeting is currently active
meetingSchema.methods.isActive = function() {
  const now = new Date();
  const endTime = new Date(this.scheduled_time.getTime() + (this.duration * 60 * 1000));
  return now >= this.scheduled_time && now <= endTime && this.status === 'ongoing';
};

// Method to check if meeting can be joined (15 minutes before to end time)
meetingSchema.methods.canJoin = function() {
  const now = new Date();
  const joinTime = new Date(this.scheduled_time.getTime() - (15 * 60 * 1000)); // 15 minutes before
  const endTime = new Date(this.scheduled_time.getTime() + (this.duration * 60 * 1000));
  return now >= joinTime && now <= endTime && this.status !== 'cancelled';
};

export const Meeting = mongoose.model("Meeting", meetingSchema);
