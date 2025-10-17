import { Teacher } from "../models/teacher.model.js";
import { Student } from "../models/student.model.js";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

export const createTeacher = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) throw new ApiErrorResponse(400, "Missing required fields");

  const existing = await Teacher.findOne({ email });
  if (existing) throw new ApiErrorResponse(409, "Email already registered");

  const teacher = await Teacher.create({ name, email, password, courses_taught: [] });
  return res.status(201).json(new Apiresponse(201, { teacher: { _id: teacher._id, name, email } }, "Teacher created"));
});

export const createStudent = asyncHandler(async (req, res) => {
  const { name, email, password, class_id } = req.body || {};
  if (!name || !email || !password || !class_id) throw new ApiErrorResponse(400, "Missing required fields");
  if (!mongoose.Types.ObjectId.isValid(class_id)) throw new ApiErrorResponse(400, "Invalid class_id format");

  const existing = await Student.findOne({ email });
  if (existing) throw new ApiErrorResponse(409, "Email already registered");

  const student = await Student.create({ name, email, password, class_id });
  return res.status(201).json(new Apiresponse(201, { student: { _id: student._id, name, email, class_id } }, "Student created"));
});

export const listUsers = asyncHandler(async (req, res) => {
  const { role } = req.query || {};
  if (role === "teacher") {
    const teachers = await Teacher.find({}, { name: 1, email: 1 }).lean();
    return res.status(200).json(new Apiresponse(200, { users: teachers, role: "teacher" }, "OK"));
  }
  if (role === "student") {
    const students = await Student.find({}, { name: 1, email: 1, class_id: 1 }).lean();
    return res.status(200).json(new Apiresponse(200, { users: students, role: "student" }, "OK"));
  }
  const [teachers, students] = await Promise.all([
    Teacher.find({}, { name: 1, email: 1 }).lean(),
    Student.find({}, { name: 1, email: 1, class_id: 1 }).lean(),
  ]);
  return res.status(200).json(new Apiresponse(200, { teachers, students }, "OK"));
});
