import { Teacher } from "../models/teacher.model.js";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const register = asyncHandler(async (req, res) => {
  const { name, email, password, clg_id, admin_id } = req.body || {};
  if (!name || !email || !password || !admin_id)
    throw new ApiErrorResponse(400, "Missing required fields");

  const existing = await Teacher.findOne({ email });
  if (existing) throw new ApiErrorResponse(409, "Email already registered");

  const teacher = await Teacher.create({ name, email, password, clg_id: clg_id || "", admin_id, courses_taught: [] });
  const accessToken = teacher.generateAccessToken();
  const refreshToken = teacher.generateRefreshToken();
  teacher.refreshToken = refreshToken;
  await teacher.save({ validateBeforeSave: false });

  return res.status(201).json(
    new Apiresponse(201, { teacher: { _id: teacher._id, name, email, clg_id }, accessToken, refreshToken }, "Registered")
  );
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new ApiErrorResponse(400, "Missing credentials");

  const teacher = await Teacher.findOne({ email }).populate("admin_id", "name email").populate("courses_taught");
  if (!teacher) throw new ApiErrorResponse(401, "Invalid credentials");

  const ok = await teacher.isCurrentPassword(password);
  if (!ok) throw new ApiErrorResponse(401, "Invalid credentials");

  const accessToken = teacher.generateAccessToken();
  const refreshToken = teacher.generateRefreshToken();
  teacher.refreshToken = refreshToken;
  await teacher.save({ validateBeforeSave: false });

  return res.status(200).json(new Apiresponse(200, { teacher: { _id: teacher._id, name: teacher.name, email: teacher.email, clg_id: teacher.clg_id }, accessToken, refreshToken }, "Logged in"));
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) throw new ApiErrorResponse(400, "Missing refresh token");

  const teacher = await Teacher.findOne({ refreshToken });
  if (!teacher) throw new ApiErrorResponse(401, "Invalid refresh token");

  const accessToken = teacher.generateAccessToken();
  const newRefresh = teacher.generateRefreshToken();
  teacher.refreshToken = newRefresh;
  await teacher.save({ validateBeforeSave: false });

  return res.status(200).json(new Apiresponse(200, { accessToken, refreshToken: newRefresh }, "Refreshed"));
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) throw new ApiErrorResponse(400, "Missing refresh token");

  const teacher = await Teacher.findOne({ refreshToken });
  if (teacher) {
    teacher.refreshToken = null;
    await teacher.save({ validateBeforeSave: false });
  }
  return res.status(200).json(new Apiresponse(200, {}, "Logged out"));
});

export { register as teacherRegister, login as teacherLogin, refresh as teacherRefresh, logout as teacherLogout };
