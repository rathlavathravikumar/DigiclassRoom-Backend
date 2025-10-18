import { Router } from "express";
import { studentRegister, studentLogin, studentLogout, studentRefresh } from "../controllers/studentAuth.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { getTimetable } from "../controllers/timetable.controller.js";

const router = Router();

router.post("/register", studentRegister);
router.post("/login", studentLogin);
router.post("/logout", studentLogout);
router.post("/refresh", studentRefresh);

router.get("/me", authenticate, authorizeRoles("student"), (req, res) => {
  return res.status(200).json(new Apiresponse(200, { user: req.user }, "OK"));
});

// Student timetable (read-only)
router.get("/timetable", authenticate, authorizeRoles("student"), getTimetable);

export default router;