import { Admin } from "../models/admin.model.js";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const register = asyncHandler(async (req, res) => {

  console.log("came ");
  const { name, clgName, email, password } = req.body || {};
  if (!name || !clgName || !email || !password)
    throw new ApiErrorResponse(400, "Missing required fields");

  const existing = await Admin.findOne({ email });
  if (existing) throw new ApiErrorResponse(409, "Email already registered");

  const admin = await Admin.create({ name, clgName, email, password });
  const accessToken = admin.generateAccessToken();
  const refreshToken = admin.generateRefreshToken();
  admin.refreshToken = refreshToken;
  await admin.save({ validateBeforeSave: false });

  return res
    .status(201)
    .json(new Apiresponse(201, { admin: { _id: admin._id, name, clgName, email }, accessToken, refreshToken }, "Registered"));
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new ApiErrorResponse(400, "Missing credentials");

  const admin = await Admin.findOne({ email });
  if (!admin) throw new ApiErrorResponse(401, "Invalid credentials");

  const ok = await admin.isCurrentPassword(password);
  if (!ok) throw new ApiErrorResponse(401, "Invalid credentials");

  const accessToken = admin.generateAccessToken();
  const refreshToken = admin.generateRefreshToken();
  admin.refreshToken = refreshToken;
  await admin.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new Apiresponse(200, { accessToken, refreshToken }, "Logged in"));
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) throw new ApiErrorResponse(400, "Missing refresh token");

  const admin = await Admin.findOne({ refreshToken });
  if (!admin) throw new ApiErrorResponse(401, "Invalid refresh token");

  const accessToken = admin.generateAccessToken();
  const newRefresh = admin.generateRefreshToken();
  admin.refreshToken = newRefresh;
  await admin.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new Apiresponse(200, { accessToken, refreshToken: newRefresh }, "Refreshed"));
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) throw new ApiErrorResponse(400, "Missing refresh token");

  const admin = await Admin.findOne({ refreshToken });
  if (admin) {
    admin.refreshToken = null;
    await admin.save({ validateBeforeSave: false });
  }
  return res.status(200).json(new Apiresponse(200, {}, "Logged out"));
});

export { register as adminRegister, login as adminLogin, refresh as adminRefresh, logout as adminLogout };
