import { Test } from "../models/tests.model.js";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTest = asyncHandler(async (req, res) => {
  const { title, description, scheduled_at, course_id } = req.body || {};
  if (!title || !scheduled_at || !course_id)
    throw new ApiErrorResponse(400, "Missing required fields");

  const teacher_id = req.user?._id;
  const test = await Test.create({ title, description, scheduled_at, course_id, teacher_id });
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
