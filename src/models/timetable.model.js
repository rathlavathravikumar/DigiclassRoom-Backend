import mongoose, { Schema } from "mongoose";

/*
 Timetable schema holds a generic weekly grid.
 You can later extend with campus/department/class identifiers if needed.
*/
const timetableSchema = new Schema(
  {
    // optional scope fields for multi-tenant extensions
    scope: { type: String, default: "default" },
    data: {
      type: Schema.Types.Mixed, // { [day: string]: { [period: string]: string } }
      required: true,
      default: {},
    },
  },
  { timestamps: true }
);

// Ensure unique per scope
// Note: In MongoDB, ensure index is created; Mongoose will try to create on startup
// This prevents multiple docs for the same scope
// @ts-ignore
if (!timetableSchema.indexes?.()?.length) {
  timetableSchema.index({ scope: 1 }, { unique: true });
}

export const Timetable = mongoose.model("Timetable", timetableSchema);
