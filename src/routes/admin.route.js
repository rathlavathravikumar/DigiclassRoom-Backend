import { Router } from "express";
import { createNotice, listNotices, deleteNotice } from "../controllers/notice.controller.js";
import { adminRegister, adminLogin, adminLogout, adminRefresh } from "../controllers/adminAuth.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { createTeacher, createStudent, listUsers, deleteUser } from "../controllers/adminUsers.controller.js";
import { getTimetable, setTimetable } from "../controllers/timetable.controller.js";

const router = Router();

router.post("/register", adminRegister);
router.post("/login", adminLogin);
router.post("/logout", adminLogout);
router.post("/refresh", adminRefresh);

// Notices
router.get("/notices", authenticate, authorizeRoles("admin"), listNotices);
router.post("/notices", authenticate, authorizeRoles("admin"), createNotice);
router.delete("/notices/:id", authenticate, authorizeRoles("admin"), deleteNotice);

router.post("/users/teacher", authenticate, authorizeRoles("admin"), createTeacher);
router.post("/users/student", authenticate, authorizeRoles("admin"), createStudent);
router.get("/users", authenticate, authorizeRoles("admin"), listUsers);
router.delete("/users/:userId", authenticate, authorizeRoles("admin"), deleteUser);

// Timetable
router.get("/timetable", authenticate, authorizeRoles("admin"), getTimetable);
router.put("/timetable", authenticate, authorizeRoles("admin"), setTimetable);

router.get("/me", authenticate, authorizeRoles("admin"), (req, res) => {
  res.status(200).json({ statusCode: 200, data: { user: req.user }, message: "OK" });
});

export default router;