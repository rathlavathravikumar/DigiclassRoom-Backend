import { Submission } from "../models/submissions.model.js";
import { Assignment } from "../models/assignment.model.js";
import { Student } from "../models/student.model.js";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createNotification } from "./notification.controller.js";

// Student submits assignment/test
const createOrUpdateSubmission = asyncHandler(async (req, res) => {
  const { type, ref_id, course_id, file_url, text, link } = req.body || {};
  if (!type || !ref_id) throw new ApiErrorResponse(400, "Missing required fields");
  const student_id = req.user?._id; // require student auth on route
  const update = { type, ref_id, student_id, course_id, file_url, text, link };
  const doc = await Submission.findOneAndUpdate(
    { type, ref_id, student_id },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  
  // Notify teacher about assignment submission
  if (type === 'assignment') {
    const assignment = await Assignment.findById(ref_id).select('teacher_id title').lean();
    const student = await Student.findById(student_id).select('name admin_id').lean();
    
    if (assignment && student && assignment.teacher_id) {
      await createNotification({
        recipient_id: assignment.teacher_id,
        recipient_type: 'Teacher',
        type: 'submission',
        title: 'Assignment Submitted',
        message: `${student.name} has submitted the assignment "${assignment.title}"`,
        related_id: ref_id,
        related_name: assignment.title,
        metadata: { studentName: student.name },
        admin_id: student.admin_id
      });
    }
  }
  
  return res.status(200).json(new Apiresponse(200, doc, "Submitted"));
});

// List by item
const listSubmissionsByItem = asyncHandler(async (req, res) => {
  const { type, refId } = req.params;
  const items = await Submission.find({ type, ref_id: refId })
    .populate({ path: 'student_id', select: 'name email clg_id' })
    .lean();
  return res.status(200).json(new Apiresponse(200, items, "OK"));
});

// List by student
const listSubmissionsByStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const items = await Submission.find({ student_id: studentId }).lean();
  return res.status(200).json(new Apiresponse(200, items, "OK"));
});

export { createOrUpdateSubmission, listSubmissionsByItem, listSubmissionsByStudent };
