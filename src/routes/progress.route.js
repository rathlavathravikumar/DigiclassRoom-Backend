import { Router } from "express";
import { 
  getStudentProgress, 
  getCourseProgress, 
  getAdminCourseProgress, 
  getAdminCoursesOverview 
} from "../controllers/progress.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";

const router = Router();

// Student progress - accessible by student (own data), teachers, and admins
router.get("/student/:studentId", authenticate, authorizeRoles("student", "teacher", "admin"), getStudentProgress);

// Course progress for teachers - shows all students in a course
router.get("/course/:courseId", authenticate, authorizeRoles("teacher", "admin"), getCourseProgress);

// Admin course progress - detailed course analytics
router.get("/admin/course/:courseId", authenticate, authorizeRoles("admin"), getAdminCourseProgress);

// Admin courses overview - list all courses with basic stats
router.get("/admin/courses", authenticate, authorizeRoles("admin"), getAdminCoursesOverview);

export default router;
