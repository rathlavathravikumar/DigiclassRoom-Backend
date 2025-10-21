import { Router } from "express";
import { authenticate, authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import {
  createMeeting,
  listMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
  joinMeeting,
  getUpcomingMeetings
} from "../controllers/meeting.controller.js";

const router = Router();

// Get upcoming meetings for dashboard
router.get(
  "/upcoming",
  authenticate,
  authorizeRoles("admin", "teacher", "student"),
  getUpcomingMeetings
);

// List all meetings (with filters)
router.get(
  "/",
  authenticate,
  authorizeRoles("admin", "teacher", "student"),
  listMeetings
);

// Get specific meeting details
router.get(
  "/:id",
  authenticate,
  authorizeRoles("admin", "teacher", "student"),
  getMeeting
);

// Join a meeting (get meeting link)
router.get(
  "/:id/join",
  authenticate,
  authorizeRoles("admin", "teacher", "student"),
  joinMeeting
);

// Create new meeting
router.post(
  "/",
  authenticate,
  authorizeRoles("admin", "teacher"),
  createMeeting
);

// Update meeting
router.patch(
  "/:id",
  authenticate,
  authorizeRoles("admin", "teacher"),
  updateMeeting
);

// Cancel/Delete meeting
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin", "teacher"),
  deleteMeeting
);

export default router;
