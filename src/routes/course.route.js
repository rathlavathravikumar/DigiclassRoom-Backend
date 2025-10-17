import { Router } from "express";
import { authenticate, authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { createCourse, listCourses, getCourse, updateCourse, deleteCourse } from "../controllers/course.controller.js";

const router = Router();

router.get("/", listCourses);
router.get("/:id", getCourse);

router.post("/", authenticate, authorizeRoles("admin", "teacher"), createCourse);
router.patch("/:id", authenticate, authorizeRoles("admin", "teacher"), updateCourse);
router.delete("/:id", authenticate, authorizeRoles("admin", "teacher"), deleteCourse);

export default router;
