import { Router } from 'express';
import {
  forgotPassword,
  verifyResetToken,
  resetPassword,
  changePassword
} from '../controllers/passwordReset.controller.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.middleware.js';

const router = Router();

// Public routes (no authentication required)
router.post('/forgot-password', forgotPassword);
router.get('/verify-token', verifyResetToken);
router.post('/reset-password', resetPassword);

// Protected route (authentication required)
router.post('/change-password', authorizeRoles(['admin', 'teacher', 'student']), changePassword);

export default router;
