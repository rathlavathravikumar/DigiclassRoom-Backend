import { Router } from "express";
import { authenticate, authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { 
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
} from "../controllers/course.controller.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorizeRoles("admin", "teacher", "student"),
  listCourses
);
router.get(
  "/:id",
  authenticate,
  authorizeRoles("admin", "teacher", "student"),
  getCourse
);
router.get("/:id/plan", authenticate, getCoursePlan);

router.post("/", authenticate, authorizeRoles("admin", "teacher"), createCourse);
router.patch("/:id", authenticate, authorizeRoles("admin", "teacher"), updateCourse);
router.delete("/:id", authenticate, authorizeRoles("admin", "teacher"), deleteCourse);
router.patch(
  "/:id/students",
  authenticate,
  authorizeRoles("admin"),
  updateCourseStudents
);
router.patch(
  "/:id/teacher",
  authenticate,
  authorizeRoles("admin"),
  assignTeacher
);
router.patch(
  "/:id/plan",
  authenticate,
  authorizeRoles("admin"),
  setCoursePlan
);

// Course resources routes
router.get(
  "/:id/resources",
  authenticate,
  authorizeRoles("admin", "teacher", "student"),
  getCourseResources
);
router.post(
  "/:id/resources",
  authenticate,
  authorizeRoles("admin", "teacher"),
  upload.single("file"),
  uploadCourseResource
);

// Course discussions routes
router.get(
  "/:id/discussions",
  authenticate,
  authorizeRoles("admin", "teacher", "student"),
  getCourseDiscussions
);
router.post(
  "/:id/discussions",
  authenticate,
  authorizeRoles("admin", "teacher", "student"),
  postCourseDiscussion
);

// Resource deletion route (separate from course-specific routes)
router.delete(
  "/resources/:id",
  authenticate,
  authorizeRoles("admin", "teacher"),
  deleteCourseResource
);

// Student courses route
router.get(
  "/student/:studentId",
  authenticate,
  authorizeRoles("admin", "teacher", "student"),
  getStudentCourses
);

export default router;

