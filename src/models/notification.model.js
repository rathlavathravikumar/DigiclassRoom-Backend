import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema({
  recipient_id: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'recipient_type'
  },
  recipient_type: {
    type: String,
    required: true,
    enum: ['Admin', 'Teacher', 'Student']
  },
  type: {
    type: String,
    required: true,
    enum: ['assignment', 'test', 'submission', 'grade', 'meeting', 'general', 'announcement']
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  related_id: {
    type: Schema.Types.ObjectId,
    required: false
  },
  related_name: {
    type: String,
    required: false
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  admin_id: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, { timestamps: true });

// Index for faster queries
notificationSchema.index({ recipient_id: 1, read: 1, createdAt: -1 });
notificationSchema.index({ admin_id: 1 });

export const Notification = mongoose.model("Notification", notificationSchema);
