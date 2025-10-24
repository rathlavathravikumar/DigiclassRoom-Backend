import { Router } from "express";
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications
} from "../controllers/notification.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get user notifications
router.get("/", authorizeRoles("admin", "teacher", "student"), getUserNotifications);

// Get unread count
router.get("/unread-count", authorizeRoles("admin", "teacher", "student"), getUnreadCount);

// Mark notification as read
router.patch("/:id/read", authorizeRoles("admin", "teacher", "student"), markAsRead);

// Mark all as read
router.patch("/mark-all-read", authorizeRoles("admin", "teacher", "student"), markAllAsRead);

// Delete notification
router.delete("/:id", authorizeRoles("admin", "teacher", "student"), deleteNotification);

// Clear all notifications
router.delete("/", authorizeRoles("admin", "teacher", "student"), clearAllNotifications);

export default router;
