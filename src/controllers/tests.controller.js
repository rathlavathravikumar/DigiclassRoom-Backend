import { Test } from "../models/tests.model.js";
import { Marks } from "../models/marks.model.js";
import { Course } from "../models/course.model.js";
import { Student } from "../models/student.model.js";
import { Teacher } from "../models/teacher.model.js";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createBulkNotifications, createNotification } from "./notification.controller.js";

const createTest = asyncHandler(async (req, res) => {
  const { title, description, scheduled_at, course_id, duration_minutes, questions } = req.body || {};
  if (!title || !scheduled_at || !course_id)
    throw new ApiErrorResponse(400, "Missing required fields");

  const teacher_id = req.user?._id;
  const payload = {
    title,
    description: description || "",
    scheduled_at,
    course_id,
    teacher_id,
    duration_minutes: Number(duration_minutes) || 60,
    questions: Array.isArray(questions) ? questions : [],
    // total_marks will be auto-calculated from question marks in pre-save middleware
  };
  const test = await Test.create(payload);
  
  // Notify all students in the course
  const course = await Course.findById(course_id).select('students admin_id name').lean();
  if (course && course.students && course.students.length > 0) {
    const notifications = course.students.map(studentId => ({
      recipient_id: studentId,
      recipient_type: 'Student',
      type: 'test',
      title: 'New Test Scheduled',
      message: `A new test "${title}" has been scheduled in ${course.name} on ${new Date(scheduled_at).toLocaleString()}`,
      related_id: test._id,
      related_name: title,
      admin_id: course.admin_id
    }));
    await createBulkNotifications(notifications);
  }
  
  return res.status(201).json(new Apiresponse(201, test, "Test created"));
});

const listTests = asyncHandler(async (req, res) => {
  const { course_id, teacher_id } = req.query;
  const filter = {};
  if (course_id) filter.course_id = course_id;
  if (teacher_id) filter.teacher_id = teacher_id;
  const items = await Test.find(filter).lean();
  return res.status(200).json(new Apiresponse(200, items, "OK"));
});

const getTest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await Test.findById(id);
  if (!item) throw new ApiErrorResponse(404, "Test not found");
  return res.status(200).json(new Apiresponse(200, item, "OK"));
});

const updateTest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const update = req.body || {};
  const item = await Test.findByIdAndUpdate(id, update, { new: true });
  if (!item) throw new ApiErrorResponse(404, "Test not found");
  return res.status(200).json(new Apiresponse(200, item, "Updated"));
});

const deleteTest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await Test.findByIdAndDelete(id);
  if (!item) throw new ApiErrorResponse(404, "Test not found");
  return res.status(200).json(new Apiresponse(200, {}, "Deleted"));
});

export { createTest, listTests, getTest, updateTest, deleteTest };

// Student submits answers, compute score based on per-question marks and store in Marks
const submitTest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { answers } = req.body || {};
  if (!Array.isArray(answers)) throw new ApiErrorResponse(400, "answers must be an array");
  const test = await Test.findById(id).populate('course_id', 'admin_id name').lean();
  if (!test) throw new ApiErrorResponse(404, "Test not found");
  
  const totalQuestions = (test.questions || []).length;
  let correctCount = 0;
  let earnedMarks = 0;
  
  (test.questions || []).forEach((q, idx) => {
    const ans = answers[idx];
    // answers may be 'A'|'B'|'C'|'D' or option index 0..3
    const asLetter = typeof ans === 'number' ? ['A','B','C','D'][ans] : ans;
    if (asLetter === q.correct) {
      correctCount += 1;
      earnedMarks += q.marks || 0; // Add marks for this correct answer
    }
  });
  
  const maxMarks = test.total_marks || 0;
  const doc = await Marks.findOneAndUpdate(
    { type: 'test', ref_id: id, student_id: req.user._id },
    { $set: { 
      type: 'test', 
      ref_id: id, 
      student_id: req.user._id, 
      score: earnedMarks, 
      max_score: maxMarks, 
      course_id: test.course_id, 
      remarks: `${correctCount}/${totalQuestions} correct` 
    }},
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  
  // Notify teacher about test submission
  const student = await Student.findById(req.user._id).select('name').lean();
  if (test.teacher_id && student) {
    await createNotification({
      recipient_id: test.teacher_id,
      recipient_type: 'Teacher',
      type: 'submission',
      title: 'Test Submitted',
      message: `${student.name} has completed the test "${test.title}". Score: ${earnedMarks}/${maxMarks}`,
      related_id: test._id,
      related_name: test.title,
      metadata: { studentName: student.name, score: earnedMarks, maxScore: maxMarks },
      admin_id: test.course_id?.admin_id || req.user.admin_id
    });
  }
  
  return res.status(200).json(new Apiresponse(200, { 
    correct: correctCount, 
    totalQuestions, 
    score: earnedMarks, 
    max_score: maxMarks, 
    marks: doc 
  }, 'Submitted'));
});

export { submitTest };
