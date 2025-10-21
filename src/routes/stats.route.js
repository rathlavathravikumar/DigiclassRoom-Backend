import { Router } from "express";
import { 
  getAdminStats,
  getTeacherStats,
  getStudentStats
} from "../controllers/stats.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";

const router = Router();

// Admin stats - only accessible by admins
router.route("/admin/stats").get(
  authenticate,
  authorizeRoles("admin"),
  getAdminStats
);

// Teacher stats - accessible by teachers and admins
router.route("/teacher/stats/:teacherId").get(
  authenticate,
  authorizeRoles("teacher", "admin"),
  getTeacherStats
);

// Student stats - accessible by students, teachers, and admins
router.route("/student/stats/:studentId").get(
  authenticate,
  authorizeRoles("student", "teacher", "admin"),
  getStudentStats
);

export default router;
