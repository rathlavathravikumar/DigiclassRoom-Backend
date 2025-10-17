import { Student } from "../models/student.model.js";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const register = asyncHandler(async (req, res) => {
  const { name, email, password, class_id } = req.body || {};
  if (!name || !email || !password || !class_id)
    throw new ApiErrorResponse(400, "Missing required fields");

  const existing = await Student.findOne({ email });
  if (existing) throw new ApiErrorResponse(409, "Email already registered");

  const student = await Student.create({ name, email, password, class_id });
  const accessToken = student.generateAccessToken();
  const refreshToken = student.generateRefreshToken();
  student.refreshToken = refreshToken;
  await student.save({ validateBeforeSave: false });

  return res.status(201).json(
    new Apiresponse(201, { student: { _id: student._id, name, email, class_id }, accessToken, refreshToken }, "Registered")
  );
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new ApiErrorResponse(400, "Missing credentials");

  const student = await Student.findOne({ email });
  if (!student) throw new ApiErrorResponse(401, "Invalid credentials");

  const ok = await student.isCurrentPassword(password);
  if (!ok) throw new ApiErrorResponse(401, "Invalid credentials");

  const accessToken = student.generateAccessToken();
  const refreshToken = student.generateRefreshToken();
  student.refreshToken = refreshToken;
  await student.save({ validateBeforeSave: false });

  return res.status(200).json(new Apiresponse(200, { accessToken, refreshToken }, "Logged in"));
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) throw new ApiErrorResponse(400, "Missing refresh token");

  const student = await Student.findOne({ refreshToken });
  if (!student) throw new ApiErrorResponse(401, "Invalid refresh token");

  const accessToken = student.generateAccessToken();
  const newRefresh = student.generateRefreshToken();
  student.refreshToken = newRefresh;
  await student.save({ validateBeforeSave: false });

  return res.status(200).json(new Apiresponse(200, { accessToken, refreshToken: newRefresh }, "Refreshed"));
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) throw new ApiErrorResponse(400, "Missing refresh token");

  const student = await Student.findOne({ refreshToken });
  if (student) {
    student.refreshToken = null;
    await student.save({ validateBeforeSave: false });
  }
  return res.status(200).json(new Apiresponse(200, {}, "Logged out"));
});

export { register as studentRegister, login as studentLogin, refresh as studentRefresh, logout as studentLogout };
