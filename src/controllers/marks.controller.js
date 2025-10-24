import { Marks } from "../models/marks.model.js";
import { Assignment } from "../models/assignment.model.js";
import { Test } from "../models/tests.model.js";
import { Student } from "../models/student.model.js";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createNotification } from "./notification.controller.js";

const upsertMarks = asyncHandler(async (req, res) => {
  const { type, ref_id, student_id, score, max_score, remarks, course_id } = req.body || {};
  if (!type || !ref_id || !student_id || typeof score !== 'number' || typeof max_score !== 'number')
    throw new ApiErrorResponse(400, "Missing required fields");

  const teacher_id = req.user?._id; // may be undefined if not authenticated as teacher

  const doc = await Marks.findOneAndUpdate(
    { type, ref_id, student_id },
    { $set: { type, ref_id, student_id, score, max_score, remarks: remarks || "", course_id: course_id || undefined, teacher_id } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  
  // Notify student about their grade
  const student = await Student.findById(student_id).select('admin_id').lean();
  let itemName = '';
  
  if (type === 'assignment') {
    const assignment = await Assignment.findById(ref_id).select('title').lean();
    itemName = assignment?.title || 'Assignment';
  } else if (type === 'test') {
    const test = await Test.findById(ref_id).select('title').lean();
    itemName = test?.title || 'Test';
  }
  
  if (student) {
    await createNotification({
      recipient_id: student_id,
      recipient_type: 'Student',
      type: 'grade',
      title: 'New Grade Posted',
      message: `Your ${type} "${itemName}" has been graded. Score: ${score}/${max_score}${remarks ? '. ' + remarks : ''}`,
      related_id: ref_id,
      related_name: itemName,
      metadata: { score, maxScore: max_score, remarks },
      admin_id: student.admin_id
    });
  }

  return res.status(200).json(new Apiresponse(200, doc, "Marks saved"));
});

const updateMarks = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const update = {};
  if (typeof req.body?.score === 'number') update.score = req.body.score;
  if (typeof req.body?.max_score === 'number') update.max_score = req.body.max_score;
  if (typeof req.body?.remarks === 'string') update.remarks = req.body.remarks;
  const doc = await Marks.findByIdAndUpdate(id, update, { new: true });
  if (!doc) throw new ApiErrorResponse(404, "Marks not found");
  return res.status(200).json(new Apiresponse(200, doc, "Updated"));
});

const listMarks = asyncHandler(async (req, res) => {
  const { type, ref_id, student_id, course_id } = req.query || {};
  const filter = {};
  if (type) filter.type = type;
  if (ref_id) filter.ref_id = ref_id;
  if (student_id) filter.student_id = student_id;
  if (course_id) filter.course_id = course_id;
  const items = await Marks.find(filter)
    .populate({ path: 'student_id', select: 'name email clg_id' })
    .populate({ path: 'course_id', select: 'name code' })
    .lean();
  return res.status(200).json(new Apiresponse(200, items, "OK"));
});

const listByStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const items = await Marks.find({ student_id: studentId })
    .populate({ path: 'student_id', select: 'name email clg_id' })
    .populate({ path: 'course_id', select: 'name code' })
    .lean();
  return res.status(200).json(new Apiresponse(200, items, "OK"));
});

const listByItem = asyncHandler(async (req, res) => {
  const { type, refId } = req.params;
  const items = await Marks.find({ type, ref_id: refId })
    .populate({ path: 'student_id', select: 'name email clg_id' })
    .populate({ path: 'course_id', select: 'name code' })
    .lean();
  return res.status(200).json(new Apiresponse(200, items, "OK"));
});

export { upsertMarks, updateMarks, listMarks, listByStudent, listByItem };
