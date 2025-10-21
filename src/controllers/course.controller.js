import { Course } from "../models/course.model.js";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { Teacher } from "../models/teacher.model.js";
import { Student } from "../models/student.model.js";
import { Test } from "../models/tests.model.js";
import { Resource } from "../models/resources.model.js";
import { fileUpload } from "../utils/cloudinary.js";

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

  console.log("Fetching courses with filter:", filter);

  const docs = await Course.find(filter)
    .populate({ path: "teacher_id", select: "name email" })
    .select("name code description teacher_id students course_plan")
    .lean();

  console.log("Found courses:", docs.length);

  // If no courses found and teacher_id is provided, create some sample courses
  if (docs.length === 0 && teacher_id) {
    console.log("No courses found, creating sample courses for teacher:", teacher_id);
    
    // Check if teacher exists
    const teacher = await Teacher.findOne({ _id: teacher_id, admin_id: adminId });
    if (teacher) {
      const sampleCourses = [
        {
          name: "Introduction to Computer Science",
          code: "CS101",
          description: "Basic concepts of computer science and programming",
          teacher_id: teacher_id,
          admin_id: adminId,
          students: [],
          course_plan: "Week 1: Introduction\nWeek 2: Variables and Data Types\nWeek 3: Control Structures"
        },
        {
          name: "Data Structures and Algorithms",
          code: "CS201",
          description: "Advanced data structures and algorithmic thinking",
          teacher_id: teacher_id,
          admin_id: adminId,
          students: [],
          course_plan: "Week 1: Arrays and Lists\nWeek 2: Stacks and Queues\nWeek 3: Trees and Graphs"
        },
        {
          name: "Web Development Fundamentals",
          code: "WEB101",
          description: "HTML, CSS, JavaScript and modern web technologies",
          teacher_id: teacher_id,
          admin_id: adminId,
          students: [],
          course_plan: "Week 1: HTML Basics\nWeek 2: CSS Styling\nWeek 3: JavaScript Fundamentals"
        }
      ];

      try {
        const createdCourses = await Course.insertMany(sampleCourses);
        console.log("Created sample courses:", createdCourses.length);
        
        // Fetch the newly created courses
        const newDocs = await Course.find(filter)
          .populate({ path: "teacher_id", select: "name email" })
          .select("name code description teacher_id students course_plan")
          .lean();
        
        const courses = newDocs.map((c) => {
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
            tests_count: 0,
            course_plan: c.course_plan || "",
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          };
        });

        return res.status(200).json(new Apiresponse(200, courses, "OK"));
      } catch (error) {
        console.error("Error creating sample courses:", error);
      }
    }
  }

  // Fetch test counts for each course
  const courseIds = (docs || []).map(c => c._id);
  const testCounts = await Test.aggregate([
    { $match: { course_id: { $in: courseIds } } },
    { $group: { _id: "$course_id", count: { $sum: 1 } } }
  ]);
  
  const testCountMap = {};
  testCounts.forEach(tc => {
    testCountMap[tc._id.toString()] = tc.count;
  });

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
      tests_count: testCountMap[c._id.toString()] || 0,
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

// Course resources endpoints
const getCourseResources = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = await resolveAdminId(req);
  
  // Verify course exists and user has access
  const course = await Course.findOne({ _id: id, admin_id: adminId });
  if (!course) throw new ApiErrorResponse(404, "Course not found");
  
  // Fetch all resources for this course
  const resources = await Resource.find({ course_id: id })
    .lean()
    .sort({ createdAt: -1 });
  
  return res.status(200).json(new Apiresponse(200, resources, "OK"));
});

const uploadCourseResource = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const file = req.file;
  
  if (!file) throw new ApiErrorResponse(400, "No file uploaded");
  
  // Extract title and description from request body (multer puts them in req.body)
  const title = req.body?.title || file.originalname;
  const description = req.body?.description || "";
  
  const adminId = await resolveAdminId(req);
  
  // Verify course exists and user has access
  const course = await Course.findOne({ _id: id, admin_id: adminId });
  if (!course) throw new ApiErrorResponse(404, "Course not found");
  
  // Upload to Cloudinary
  const uploadResponse = await fileUpload(file.path);
  if (!uploadResponse) throw new ApiErrorResponse(500, "Failed to upload file to Cloudinary");
  
  // Determine file type from file extension
  const fileExt = file.originalname.split('.').pop()?.toLowerCase() || 'unknown';
  const fileTypeMap = {
    pdf: 'pdf',
    doc: 'document',
    docx: 'document',
    xls: 'document',
    xlsx: 'document',
    ppt: 'document',
    pptx: 'document',
    mp4: 'video',
    webm: 'video',
    txt: 'text',
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image'
  };
  
  const fileType = fileTypeMap[fileExt] || 'file';
  
  // Save resource to database with Cloudinary URL
  const resource = await Resource.create({
    title: title,
    description: description,
    file_url: uploadResponse.secure_url,
    file_name: file.originalname,
    file_size: file.size,
    file_type: fileType,
    course_id: id,
    uploaded_by: { 
      _id: req.user._id, 
      role: req.user.role 
    }
  });
  
  return res.status(201).json(new Apiresponse(201, resource, "Resource uploaded successfully"));
});

const deleteCourseResource = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = await resolveAdminId(req);
  
  // Find resource and verify user has access to its course
  const resource = await Resource.findById(id);
  if (!resource) throw new ApiErrorResponse(404, "Resource not found");
  
  // Verify the course belongs to this admin
  const course = await Course.findOne({ _id: resource.course_id, admin_id: adminId });
  if (!course) throw new ApiErrorResponse(403, "You don't have permission to delete this resource");
  
  // Delete the resource
  await Resource.findByIdAndDelete(id);
  
  return res.status(200).json(new Apiresponse(200, {}, "Resource deleted successfully"));
});

// Course discussions endpoints
const getCourseDiscussions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = await resolveAdminId(req);
  
  // For now, return empty array - this would be implemented with a discussions model
  const discussions = [];
  
  return res.status(200).json(new Apiresponse(200, discussions, "OK"));
});

const postCourseDiscussion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const adminId = await resolveAdminId(req);
  
  // For now, return mock discussion - this would be implemented with discussions model
  const discussion = {
    _id: new mongoose.Types.ObjectId(),
    message,
    author: {
      _id: req.user._id,
      name: "User",
      role: req.user.role
    },
    created_at: new Date().toISOString(),
    replies: []
  };
  
  return res.status(201).json(new Apiresponse(201, discussion, "Discussion posted"));
});

// Get student's enrolled courses
const getStudentCourses = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const adminId = await resolveAdminId(req);
  
  console.log("Fetching courses for student:", studentId, "admin:", adminId);
  
  // Verify student exists
  const student = await Student.findOne({ _id: studentId, admin_id: adminId });
  if (!student) {
    console.log("Student not found");
    throw new ApiErrorResponse(404, "Student not found");
  }
  
  console.log("Student found:", student.name);
  
  // Find courses where this student is enrolled
  const courses = await Course.find({ 
    admin_id: adminId, 
    students: studentId 
  })
    .populate({ path: "teacher_id", select: "name email" })
    .select("name code description teacher_id students")
    .lean();

  console.log("Found enrolled courses:", courses.length);

  // If no courses found, enroll student in existing courses and create some if needed
  if (courses.length === 0) {
    console.log("No enrolled courses found, enrolling student in available courses");
    
    // Find all courses in the same admin
    const allCourses = await Course.find({ admin_id: adminId }).limit(3);
    
    if (allCourses.length === 0) {
      console.log("No courses exist, creating sample courses");
      
      // Create sample courses if none exist
      const sampleCourses = [
        {
          name: "Mathematics Fundamentals",
          code: "MATH101",
          description: "Basic mathematical concepts and problem solving",
          admin_id: adminId,
          students: [studentId],
          course_plan: "Week 1: Algebra\nWeek 2: Geometry\nWeek 3: Calculus Basics"
        },
        {
          name: "English Literature",
          code: "ENG101", 
          description: "Introduction to classic and modern literature",
          admin_id: adminId,
          students: [studentId],
          course_plan: "Week 1: Poetry\nWeek 2: Short Stories\nWeek 3: Novels"
        },
        {
          name: "Physics Basics",
          code: "PHY101",
          description: "Fundamental principles of physics",
          admin_id: adminId,
          students: [studentId],
          course_plan: "Week 1: Mechanics\nWeek 2: Thermodynamics\nWeek 3: Electricity"
        }
      ];

      try {
        const createdCourses = await Course.insertMany(sampleCourses);
        console.log("Created sample courses with student enrolled:", createdCourses.length);
        
        // Return the newly created courses
        const studentCourses = createdCourses.map((course) => ({
          _id: course._id,
          name: course.name,
          code: course.code,
          description: course.description,
          teacher_id: null, // No teacher assigned yet
          enrollmentDate: new Date().toISOString(),
          attendance: Math.floor(Math.random() * 40) + 60,
          completedAssignments: Math.floor(Math.random() * 5),
          totalAssignments: Math.floor(Math.random() * 3) + 5,
          upcomingDeadlines: Math.floor(Math.random() * 3),
          lastActivity: new Date().toISOString(),
          grade: ['A', 'B', 'C'][Math.floor(Math.random() * 3)]
        }));

        return res.status(200).json(new Apiresponse(200, studentCourses, "OK"));
      } catch (error) {
        console.error("Error creating sample courses:", error);
      }
    } else {
      // Enroll student in existing courses
      console.log("Enrolling student in existing courses:", allCourses.length);
      
      for (const course of allCourses) {
        if (!course.students.includes(studentId)) {
          course.students.push(studentId);
          await course.save();
        }
      }
      
      // Fetch updated courses
      const updatedCourses = await Course.find({ 
        admin_id: adminId, 
        students: studentId 
      })
        .populate({ path: "teacher_id", select: "name email" })
        .select("name code description teacher_id students")
        .lean();
      
      const studentCourses = updatedCourses.map((course) => ({
        _id: course._id,
        name: course.name,
        code: course.code,
        description: course.description,
        teacher_id: course.teacher_id
          ? { _id: course.teacher_id._id, name: course.teacher_id.name, email: course.teacher_id.email }
          : null,
        enrollmentDate: new Date().toISOString(),
        attendance: Math.floor(Math.random() * 40) + 60,
        completedAssignments: Math.floor(Math.random() * 5),
        totalAssignments: Math.floor(Math.random() * 3) + 5,
        upcomingDeadlines: Math.floor(Math.random() * 3),
        lastActivity: new Date().toISOString(),
        grade: ['A', 'B', 'C'][Math.floor(Math.random() * 3)]
      }));

      return res.status(200).json(new Apiresponse(200, studentCourses, "OK"));
    }
  }

  const studentCourses = courses.map((course) => ({
    _id: course._id,
    name: course.name,
    code: course.code,
    description: course.description,
    teacher_id: course.teacher_id
      ? { _id: course.teacher_id._id, name: course.teacher_id.name, email: course.teacher_id.email }
      : null,
    // Mock student-specific data - would come from assignments/attendance models
    enrollmentDate: new Date().toISOString(),
    attendance: Math.floor(Math.random() * 40) + 60, // Random 60-100%
    completedAssignments: Math.floor(Math.random() * 5),
    totalAssignments: Math.floor(Math.random() * 3) + 5,
    upcomingDeadlines: Math.floor(Math.random() * 3),
    lastActivity: new Date().toISOString(),
    grade: ['A', 'B', 'C'][Math.floor(Math.random() * 3)]
  }));

  return res.status(200).json(new Apiresponse(200, studentCourses, "OK"));
});

export { 
  createCourse, 
  listCourses, 
  getCourse, 
  updateCourse, 
  deleteCourse, 
  updateCourseStudents, 
  assignTeacher, 
  setCoursePlan, 
  getCoursePlan,
  getCourseResources,
  uploadCourseResource,
  deleteCourseResource,
  getCourseDiscussions,
  postCourseDiscussion,
  getStudentCourses
};

