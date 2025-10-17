import { Router } from "express";
import { createNotice } from "../controllers/notice.controller.js";
import { adminRegister, adminLogin, adminLogout, adminRefresh } from "../controllers/adminAuth.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { createTeacher, createStudent, listUsers } from "../controllers/adminUsers.controller.js";

const router = Router();

router.post("/register", adminRegister);
router.post("/login", adminLogin);
router.post("/logout", adminLogout);
router.post("/refresh", adminRefresh);

router.post("/createNotice", authenticate, authorizeRoles("admin"), createNotice);

router.post("/users/teacher", authenticate, authorizeRoles("admin"), createTeacher);
router.post("/users/student", authenticate, authorizeRoles("admin"), createStudent);
router.get("/users", authenticate, authorizeRoles("admin"), listUsers);

router.get("/me", authenticate, authorizeRoles("admin"), (req, res) => {
  res.status(200).json({ statusCode: 200, data: { user: req.user }, message: "OK" });
});

export default router;