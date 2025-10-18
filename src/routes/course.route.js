import { Router } from "express";
import { authenticate, authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { createCourse, listCourses, getCourse, updateCourse, deleteCourse, updateCourseStudents, assignTeacher, setCoursePlan, getCoursePlan } from "../controllers/course.controller.js";

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

export default router;

