import { Router } from "express";
import { upsertMarks, updateMarks, listMarks, listByStudent, listByItem } from "../controllers/marks.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";

const router = Router();

// Create or update marks for a student for a specific item (assignment/test)
router.post("/", authenticate, authorizeRoles("teacher", "admin"), upsertMarks);

// Update marks by marks document id
router.patch("/:id", authenticate, authorizeRoles("teacher", "admin"), updateMarks);

// List marks with optional filters: type, ref_id, student_id, course_id
router.get("/", listMarks);

// List marks for a student
router.get("/student/:studentId", listByStudent);

// List marks for an item (assignment or test) by type and ref id
router.get("/:type/:refId", listByItem);

export default router;
