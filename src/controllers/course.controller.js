import { Course } from "../models/course.model.js";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { Teacher } from "../models/teacher.model.js";
import { Student } from "../models/student.model.js";

// Resolve the tenant adminId based on the requester role
const resolveAdminId = async (req) => {
  const { _id, role } = req.user || {};
  if (!role || !_id) throw new ApiErrorResponse(401, "Unauthorized");
  if (role === "admin") return _id;
  if (role === "teacher") {
    const t = await Teacher.findById(_id).select("admin_id");
    if (!t) throw new ApiErrorResponse(401, "Unauthorized");
    return String(t.admin_id);
  }
  if (role === "student") {
    const s = await Student.findById(_id).select("admin_id");
    if (!s) throw new ApiErrorResponse(401, "Unauthorized");
    return String(s.admin_id);
  }
  throw new ApiErrorResponse(403, "Forbidden");
};

const createCourse = asyncHandler(async (req, res) => {
  const { name, code, description, teacher_id } = req.body || {};
  if (!name || !code || !teacher_id) throw new ApiErrorResponse(400, "Missing required fields");
  const adminId = await resolveAdminId(req);

  // Teacher must be in same admin
  const teacher = await Teacher.findOne({ _id: teacher_id, admin_id: adminId });
  if (!teacher) throw new ApiErrorResponse(400, "Teacher not found in your organization");

  const exists = await Course.findOne({ admin_id: adminId, code });
  if (exists) throw new ApiErrorResponse(409, "Course code already exists");
  const course = await Course.create({ name, code, description, teacher_id, admin_id: adminId });
  return res.status(201).json(new Apiresponse(201, course, "Course created"));
});

const listCourses = asyncHandler(async (req, res) => {
  const adminId = await resolveAdminId(req);
  const { teacher_id } = req.query || {};
  const filter = { admin_id: adminId };
  if (teacher_id) filter.teacher_id = teacher_id;

  const docs = await Course.find(filter)
    .populate({ path: "teacher_id", select: "name email" })
    .select("name code description teacher_id students course_plan")
    .lean();

  const courses = (docs || []).map((c) => {
    const teacher = c.teacher_id
      ? { _id: c.teacher_id._id, name: c.teacher_id.name, email: c.teacher_id.email }
      : null;
    return {
      _id: c._id,
      name: c.name,
      code: c.code,
      description: c.description,
      teacher,
      students_count: Array.isArray(c.students) ? c.students.length : 0,
      course_plan: c.course_plan || "",
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  });

  return res.status(200).json(new Apiresponse(200, courses, "OK"));
});

const getCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = await resolveAdminId(req);
  const c = await Course.findOne({ _id: id, admin_id: adminId })
    .populate({ path: "teacher_id", select: "name email" })
    .populate({ path: "students", select: "name email clg_id" })
    .lean();
  if (!c) throw new ApiErrorResponse(404, "Course not found");

  const course = {
    _id: c._id,
    name: c.name,
    code: c.code,
    description: c.description,
    teacher: c.teacher_id
      ? { _id: c.teacher_id._id, name: c.teacher_id.name, email: c.teacher_id.email }
      : null,
    students: (c.students || []).map((s) => ({ _id: s._id, name: s.name, email: s.email, clg_id: s.clg_id })),
    course_plan: c.course_plan || "",
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };

  return res.status(200).json(new Apiresponse(200, course, "OK"));
});

const updateCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = await resolveAdminId(req);
  const update = req.body || {};
  const c = await Course.findOneAndUpdate({ _id: id, admin_id: adminId }, update, { new: true })
    .populate({ path: "teacher_id", select: "name email" })
    .populate({ path: "students", select: "name email clg_id" });
  if (!c) throw new ApiErrorResponse(404, "Course not found");
  const course = c.toObject();
  const shaped = {
    _id: course._id,
    name: course.name,
    code: course.code,
    description: course.description,
    teacher: course.teacher_id
      ? { _id: course.teacher_id._id, name: course.teacher_id.name, email: course.teacher_id.email }
      : null,
    students: (course.students || []).map((s) => ({ _id: s._id, name: s.name, email: s.email, clg_id: s.clg_id })),
    course_plan: course.course_plan || "",
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
  return res.status(200).json(new Apiresponse(200, shaped, "Updated"));
});

const deleteCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = await resolveAdminId(req);
  const course = await Course.findOneAndDelete({ _id: id, admin_id: adminId });
  if (!course) throw new ApiErrorResponse(404, "Course not found");
  return res.status(200).json(new Apiresponse(200, {}, "Deleted"));
});

// Admin: update enrolled students (add/remove or set list)
const updateCourseStudents = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { add_clg_ids = [], remove_clg_ids = [], set_clg_ids } = req.body || {};
  const adminId = await resolveAdminId(req);

  const course = await Course.findOne({ _id: id, admin_id: adminId });
  if (!course) throw new ApiErrorResponse(404, "Course not found");

  // Helper to fetch student ObjectIds by clg_id within tenant
  const getStudentIdsByClg = async (clgIds) => {
    const ids = Array.isArray(clgIds) ? clgIds.filter(Boolean).map(String) : [];
    if (!ids.length) return [];
    const students = await Student.find({ admin_id: adminId, clg_id: { $in: ids } }).select("_id clg_id");
    if (students.length !== ids.length) throw new ApiErrorResponse(400, "One or more clg_id not found");
    return students.map((s) => s._id);
  };

  if (set_clg_ids) {
    const setIds = await getStudentIdsByClg(set_clg_ids);
    course.students = setIds;
  } else {
    const addIds = await getStudentIdsByClg(add_clg_ids);
    const removeIds = await getStudentIdsByClg(remove_clg_ids);

    if (addIds.length) {
      const current = new Set((course.students || []).map(String));
      addIds.forEach((oid) => current.add(String(oid)));
      course.students = Array.from(current).map((s) => new mongoose.Types.ObjectId(s));
    }

    if (removeIds.length) {
      const removeSet = new Set(removeIds.map(String));
      course.students = (course.students || []).filter((sid) => !removeSet.has(String(sid)));
    }
  }

  await course.save();
  const c = await Course.findById(id)
    .populate({ path: "teacher_id", select: "name email" })
    .populate({ path: "students", select: "name email clg_id" })
    .lean();
  const shaped = {
    _id: c._id,
    name: c.name,
    code: c.code,
    description: c.description,
    teacher: c.teacher_id
      ? { _id: c.teacher_id._id, name: c.teacher_id.name, email: c.teacher_id.email }
      : null,
    students: (c.students || []).map((s) => ({ _id: s._id, name: s.name, email: s.email, clg_id: s.clg_id })),
    course_plan: c.course_plan || "",
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
  return res.status(200).json(new Apiresponse(200, shaped, "Students updated"));
});

// Admin: assign or change course teacher
const assignTeacher = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { teacher_id } = req.body || {};
  if (!teacher_id || !/^[a-f\d]{24}$/i.test(String(teacher_id))) {
    throw new ApiErrorResponse(400, "Invalid teacher_id");
  }

  const adminId = await resolveAdminId(req);
  const [course, teacher] = await Promise.all([
    Course.findOne({ _id: id, admin_id: adminId }),
    Teacher.findOne({ _id: teacher_id, admin_id: adminId }),
  ]);
  if (!course) throw new ApiErrorResponse(404, "Course not found");
  if (!teacher) throw new ApiErrorResponse(400, "Teacher not found");

  course.teacher_id = teacher._id;
  await course.save();

  const c = await Course.findById(id)
    .populate({ path: "teacher_id", select: "name email" })
    .populate({ path: "students", select: "name email clg_id" })
    .lean();
  const shaped = {
    _id: c._id,
    name: c.name,
    code: c.code,
    description: c.description,
    teacher: c.teacher_id
      ? { _id: c.teacher_id._id, name: c.teacher_id.name, email: c.teacher_id.email }
      : null,
    students: (c.students || []).map((s) => ({ _id: s._id, name: s.name, email: s.email, clg_id: s.clg_id })),
    course_plan: c.course_plan || "",
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
  return res.status(200).json(new Apiresponse(200, shaped, "Teacher assigned"));
});

// Admin: set or update course plan (simple string/markdown)
const setCoursePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { course_plan = "" } = req.body || {};
  const adminId = await resolveAdminId(req);
  const course = await Course.findOneAndUpdate(
    { _id: id, admin_id: adminId },
    { course_plan: String(course_plan) },
    { new: true }
  );
  if (!course) throw new ApiErrorResponse(404, "Course not found");
  return res.status(200).json(new Apiresponse(200, course, "Course plan updated"));
});

const getCoursePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = await resolveAdminId(req);
  const course = await Course.findOne({ _id: id, admin_id: adminId }).select("course_plan");
  if (!course) throw new ApiErrorResponse(404, "Course not found");
  return res.status(200).json(new Apiresponse(200, { course_plan: course.course_plan || "" }, "OK"));
});

export { createCourse, listCourses, getCourse, updateCourse, deleteCourse, updateCourseStudents, assignTeacher, setCoursePlan, getCoursePlan };

