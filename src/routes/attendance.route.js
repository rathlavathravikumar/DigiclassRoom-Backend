import { Router } from "express";
import {
  markAttendance,
  getAttendanceByDate,
  getAttendanceHistory,
  getStudentAttendance,
} from "../controllers/attendance.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";

const router = Router();

// Protect all attendance routes - only teachers/admins can access
router.use(authenticate);

// Mark attendance for a course on a specific date
router.post("/mark", authorizeRoles("teacher", "admin"), markAttendance);

// Get attendance for a course on a specific date
router.get("/date", authorizeRoles("teacher", "admin"), getAttendanceByDate);

// Get attendance history for a course
router.get("/history", authorizeRoles("teacher", "admin"), getAttendanceHistory);

// Get attendance record for a specific student in a course
router.get("/student", authorizeRoles("teacher", "admin"), getStudentAttendance);

export default router;