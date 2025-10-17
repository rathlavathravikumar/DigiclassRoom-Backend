import { Router } from "express";
import { authenticate, authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { createAssignment, listAssignments, getAssignment, updateAssignment, deleteAssignment } from "../controllers/assignments.controller.js";

const router = Router();

// public list for now (or protected for students/teachers)
router.get("/", listAssignments);
router.get("/:id", getAssignment);

// teacher/admin can create/update/delete
router.post("/", authenticate, authorizeRoles("teacher", "admin"), createAssignment);
router.patch("/:id", authenticate, authorizeRoles("teacher", "admin"), updateAssignment);
router.delete("/:id", authenticate, authorizeRoles("teacher", "admin"), deleteAssignment);

export default router;
