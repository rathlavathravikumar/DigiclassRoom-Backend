import { Course } from "../models/course.model.js";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createCourse = asyncHandler(async (req, res) => {
  const { name, code, description, teacher_id } = req.body || {};
  if (!name || !code || !teacher_id) throw new ApiErrorResponse(400, "Missing required fields");
  const exists = await Course.findOne({ code });
  if (exists) throw new ApiErrorResponse(409, "Course code already exists");
  const course = await Course.create({ name, code, description, teacher_id });
  return res.status(201).json(new Apiresponse(201, course, "Course created"));
});

const listCourses = asyncHandler(async (req, res) => {
  const { teacher_id } = req.query;
  const filter = teacher_id ? { teacher_id } : {};
  const courses = await Course.find(filter).lean();
  return res.status(200).json(new Apiresponse(200, courses, "OK"));
});

const getCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const course = await Course.findById(id);
  if (!course) throw new ApiErrorResponse(404, "Course not found");
  return res.status(200).json(new Apiresponse(200, course, "OK"));
});

const updateCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const update = req.body || {};
  const course = await Course.findByIdAndUpdate(id, update, { new: true });
  if (!course) throw new ApiErrorResponse(404, "Course not found");
  return res.status(200).json(new Apiresponse(200, course, "Updated"));
});

const deleteCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const course = await Course.findByIdAndDelete(id);
  if (!course) throw new ApiErrorResponse(404, "Course not found");
  return res.status(200).json(new Apiresponse(200, {}, "Deleted"));
});

export { createCourse, listCourses, getCourse, updateCourse, deleteCourse };
