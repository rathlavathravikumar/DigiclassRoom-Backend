import { Teacher } from "../models/teacher.model.js";
import { Student } from "../models/student.model.js";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

export const createTeacher = asyncHandler(async (req, res) => {
  const { name, email, password, clg_id = "" } = req.body || {};
  if (!name || !email || !password) throw new ApiErrorResponse(400, "Missing required fields");

  const existing = await Teacher.findOne({ email });
  if (existing) throw new ApiErrorResponse(409, "Email already registered");

  const teacher = await Teacher.create({ name, email, password, clg_id, admin_id: req.user?._id, courses_taught: [] });
  return res.status(201).json(new Apiresponse(201, { teacher: { _id: teacher._id, name, email, clg_id: teacher.clg_id } }, "Teacher created"));
});

export const createStudent = asyncHandler(async (req, res) => {
  const { name, email, password, clg_id } = req.body || {};
  if (!name || !email || !password || !clg_id) throw new ApiErrorResponse(400, "Missing required fields");

  const existing = await Student.findOne({ email });
  if (existing) throw new ApiErrorResponse(409, "Email already registered");

  const student = await Student.create({ name, email, password, clg_id, admin_id: req.user?._id });
  return res.status(201).json(new Apiresponse(201, { student: { _id: student._id, name, email, clg_id: student.clg_id } }, "Student created"));
});

export const listUsers = asyncHandler(async (req, res) => {
  const { role } = req.query || {};
  const adminFilter = { admin_id: req.user?._id };
  if (role === "teacher") {
    const teachers = await Teacher.find(adminFilter, { name: 1, email: 1, clg_id: 1 }).lean();
    return res.status(200).json(new Apiresponse(200, { users: teachers, role: "teacher" }, "OK"));
  }
  if (role === "student") {
    const students = await Student.find(adminFilter, { name: 1, email: 1, clg_id: 1 }).lean();
    return res.status(200).json(new Apiresponse(200, { users: students, role: "student" }, "OK"));
  }
  const [teachers, students] = await Promise.all([
    Teacher.find(adminFilter, { name: 1, email: 1, clg_id: 1 }).lean(),
    Student.find(adminFilter, { name: 1, email: 1, clg_id: 1 }).lean(),
  ]);
  return res.status(200).json(new Apiresponse(200, { teachers, students }, "OK"));
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.query;
  
  if (!userId || !role) {
    throw new ApiErrorResponse(400, "User ID and role are required");
  }
  
  if (!["teacher", "student"].includes(role)) {
    throw new ApiErrorResponse(400, "Invalid role. Must be 'teacher' or 'student'");
  }
  
  const adminFilter = { _id: userId, admin_id: req.user?._id };
  
  let deletedUser;
  if (role === "teacher") {
    deletedUser = await Teacher.findOneAndDelete(adminFilter);
  } else {
    deletedUser = await Student.findOneAndDelete(adminFilter);
  }
  
  if (!deletedUser) {
    throw new ApiErrorResponse(404, "User not found or you don't have permission to delete this user");
  }
  
  return res.status(200).json(new Apiresponse(200, { deletedUser: { _id: deletedUser._id, name: deletedUser.name, email: deletedUser.email } }, "User deleted successfully"));
});
