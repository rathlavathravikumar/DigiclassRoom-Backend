import { Router } from "express";
import {
  markAttendance,
  getAttendanceByDate,
  getAttendanceHistory,
  getStudentAttendance,
  getAttendanceSummary,
} from "../controllers/attendance.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";

const router = Router();

router.use(authenticate);

router.post("/mark", authorizeRoles("teacher", "admin"), markAttendance);
router.get("/date", authorizeRoles("teacher", "admin"), getAttendanceByDate);
router.get("/history", authorizeRoles("teacher", "admin"), getAttendanceHistory);
router.get("/student", authorizeRoles("teacher", "admin"), getStudentAttendance);
router.get("/summary", authorizeRoles("teacher", "admin", "student"), getAttendanceSummary);

export default router;