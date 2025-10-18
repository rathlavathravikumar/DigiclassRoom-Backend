import { Notice } from "../models/notice.model.js";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";
import { Apiresponse } from "../utils/Apiresponse.js";

const createNotice = async (req, res) => {
  try {
    const adminId = req.user?._id;
    const { title, content, priority, target } = req.body;
    if (!title || !content || !priority || !target) {
      throw new ApiErrorResponse(404, "values are empty");
    }

    const notice = await Notice.create({
      title,
      content,
      priority,
      target,
      admin_id: adminId,
    });

    res.status(201).send(new Apiresponse(201, notice, "successfully notice uploaded"));
  } catch (error) {
    console.log("failed to createNotice:", error.message);
    throw new ApiErrorResponse(500, "failed to createNotice");
  }
};

const listNotices = async (req, res) => {
  try {
    const adminId = req.user?._id;
    const { target } = req.query || {};
    const filter = { admin_id: adminId };
    if (target && ["all", "students", "teachers"].includes(String(target))) {
      filter.target = String(target);
    }
    const notices = await Notice.find(filter)
      .sort({ createdAt: -1 })
      .select("title content priority target createdAt updatedAt")
      .lean();
    return res.status(200).send(new Apiresponse(200, notices, "OK"));
  } catch (error) {
    console.log("failed to listNotices:", error.message);
    throw new ApiErrorResponse(500, "failed to listNotices");
  }
};

const deleteNotice = async (req, res) => {
  try {
    const adminId = req.user?._id;
    const { id } = req.params;
    const doc = await Notice.findOneAndDelete({ _id: id, admin_id: adminId });
    if (!doc) throw new ApiErrorResponse(404, "Notice not found");
    return res.status(200).send(new Apiresponse(200, {}, "Deleted"));
  } catch (error) {
    if (error instanceof ApiErrorResponse) throw error;
    console.log("failed to deleteNotice:", error.message);
    throw new ApiErrorResponse(500, "failed to deleteNotice");
  }
};

// Public/teacher-accessible listing: filter by target only
const listPublicNotices = async (req, res) => {
  try {
    const { target, admin_id } = req.query || {};
    const filter = {};
    if (target && ["all", "students", "teachers"].includes(String(target))) {
      filter.target = String(target);
    }
    if (admin_id) {
      filter.admin_id = admin_id;
    }
    const notices = await Notice.find(filter)
      .sort({ createdAt: -1 })
      .select("title content priority target createdAt updatedAt")
      .lean();
    return res.status(200).send(new Apiresponse(200, notices, "OK"));
  } catch (error) {
    console.log("failed to listPublicNotices:", error.message);
    throw new ApiErrorResponse(500, "failed to listPublicNotices");
  }
};

export { createNotice, listNotices, listPublicNotices, deleteNotice };