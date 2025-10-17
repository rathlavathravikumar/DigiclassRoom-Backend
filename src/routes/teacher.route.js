import { Router } from "express";
import { teacherRegister, teacherLogin, teacherLogout, teacherRefresh } from "../controllers/teacherAuth.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { Apiresponse } from "../utils/Apiresponse.js";

const router = Router();

router.post("/register", teacherRegister);
router.post("/login", teacherLogin);
router.post("/logout", teacherLogout);
router.post("/refresh", teacherRefresh);

router.get("/me", authenticate, authorizeRoles("teacher"), (req, res) => {
  return res.status(200).json(new Apiresponse(200, { user: req.user }, "OK"));
});

export default router