import { Router } from "express";
import { listPublicNotices } from "../controllers/notice.controller.js";

const router = Router();

// Public/teacher access: list notices by optional target
router.get("/", listPublicNotices);

export default router;
