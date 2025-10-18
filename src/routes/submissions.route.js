import { Router } from "express";
import { createOrUpdateSubmission, listSubmissionsByItem, listSubmissionsByStudent } from "../controllers/submissions.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";

const router = Router();

// Student create/update submission
router.post("/", authenticate, authorizeRoles("student"), createOrUpdateSubmission);

// List submissions for an item (assignment/test)
router.get("/:type/:refId", authenticate, authorizeRoles("teacher", "admin"), listSubmissionsByItem);

// List submissions for a student (student can view own; teachers/admins can view all)
router.get("/student/:studentId", authenticate, listSubmissionsByStudent);

export default router;
