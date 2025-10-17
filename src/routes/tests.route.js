import { Router } from "express";
import { authenticate, authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { createTest, listTests, getTest, updateTest, deleteTest } from "../controllers/tests.controller.js";

const router = Router();

router.get("/", listTests);
router.get("/:id", getTest);

router.post("/", authenticate, authorizeRoles("teacher", "admin"), createTest);
router.patch("/:id", authenticate, authorizeRoles("teacher", "admin"), updateTest);
router.delete("/:id", authenticate, authorizeRoles("teacher", "admin"), deleteTest);

export default router;
