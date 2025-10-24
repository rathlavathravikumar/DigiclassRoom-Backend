import { Assignment } from "../models/assignment.model.js";
import { Course } from "../models/course.model.js";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createBulkNotifications } from "./notification.controller.js";

const createAssignment = asyncHandler(async (req, res) => {
  const { title, description, due_date, course_id, total_marks } = req.body || {};
  if (!title || !due_date || !course_id)
    throw new ApiErrorResponse(400, "Missing required fields");

  const teacher_id = req.user?._id; // set by auth middleware
  const assignment = await Assignment.create({ 
    title, 
    description, 
    due_date, 
    course_id, 
    teacher_id,
    total_marks: total_marks ? Number(total_marks) : 100
  });
  
  // Notify all students in the course
  const course = await Course.findById(course_id).select('students admin_id name').lean();
  if (course && course.students && course.students.length > 0) {
    const notifications = course.students.map(studentId => ({
      recipient_id: studentId,
      recipient_type: 'Student',
      type: 'assignment',
      title: 'New Assignment',
      message: `New assignment "${title}" has been posted in ${course.name}. Due: ${new Date(due_date).toLocaleDateString()}`,
      related_id: assignment._id,
      related_name: title,
      admin_id: course.admin_id
    }));
    await createBulkNotifications(notifications);
  }
  
  return res.status(201).json(new Apiresponse(201, assignment, "Assignment created"));
});

const listAssignments = asyncHandler(async (req, res) => {
  const { course_id, teacher_id } = req.query;
  const filter = {};
  if (course_id) filter.course_id = course_id;
  if (teacher_id) filter.teacher_id = teacher_id;
  const items = await Assignment.find(filter).lean();
  return res.status(200).json(new Apiresponse(200, items, "OK"));
});

const getAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await Assignment.findById(id);
  if (!item) throw new ApiErrorResponse(404, "Assignment not found");
  return res.status(200).json(new Apiresponse(200, item, "OK"));
});

const updateAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const update = req.body || {};
  const item = await Assignment.findByIdAndUpdate(id, update, { new: true });
  if (!item) throw new ApiErrorResponse(404, "Assignment not found");
  return res.status(200).json(new Apiresponse(200, item, "Updated"));
});

const deleteAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await Assignment.findByIdAndDelete(id);
  if (!item) throw new ApiErrorResponse(404, "Assignment not found");
  return res.status(200).json(new Apiresponse(200, {}, "Deleted"));
});

export { createAssignment, listAssignments, getAssignment, updateAssignment, deleteAssignment };
