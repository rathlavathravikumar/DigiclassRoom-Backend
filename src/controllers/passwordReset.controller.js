import crypto from 'crypto';
import { Admin } from '../models/admin.model.js';
import { Teacher } from '../models/teacher.model.js';
import { Student } from '../models/student.model.js';
import { ApiErrorResponse } from '../utils/ApiErrorResponse.js';
import { Apiresponse } from '../utils/Apiresponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Get the appropriate model based on role
const getModelByRole = (role) => {
  switch (role) {
    case 'admin':
      return Admin;
    case 'teacher':
      return Teacher;
    case 'student':
      return Student;
    default:
      throw new ApiErrorResponse(400, 'Invalid role specified');
  }
};

// Forgot Password - Generate reset token and send email
const forgotPassword = asyncHandler(async (req, res) => {
  const { email, role } = req.body;

  if (!email || !role) {
    throw new ApiErrorResponse(400, 'Email and role are required');
  }

  const Model = getModelByRole(role);
  const user = await Model.findOne({ email });

  if (!user) {
    // For security, don't reveal if user exists or not
    return res.status(200).json(
      new Apiresponse(200, {}, 'If an account with this email exists, you will receive a password reset link.')
    );
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

  // Save reset token to user
  user.passwordResetToken = resetToken;
  user.passwordResetExpiry = resetTokenExpiry;
  await user.save({ validateBeforeSave: false });

  // In development, return the reset URL for testing
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${resetToken}&role=${role}`;

  try {
    // TODO: Send email with reset link
    // For now, we'll just return success with the reset URL for development
    console.log('Password reset requested for:', email);
    console.log('Reset URL:', resetUrl);
    console.log('Reset Token:', resetToken);

    return res.status(200).json(
      new Apiresponse(200, {
        message: 'Password reset link sent to your email',
        // Include reset URL in development for testing
        ...(process.env.NODE_ENV === 'development' && { resetUrl, token: resetToken })
      }, 'Password reset link sent successfully')
    );
  } catch (error) {
    // Clear reset token if email sending fails
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    throw new ApiErrorResponse(500, 'Failed to send reset email. Please try again.');
  }
});

// Verify Reset Token
const verifyResetToken = asyncHandler(async (req, res) => {
  const { token, role } = req.query;

  if (!token || !role) {
    throw new ApiErrorResponse(400, 'Token and role are required');
  }

  const Model = getModelByRole(role);
  const user = await Model.findOne({
    passwordResetToken: token,
    passwordResetExpiry: { $gt: new Date() }
  });

  if (!user) {
    throw new ApiErrorResponse(400, 'Invalid or expired reset token');
  }

  return res.status(200).json(
    new Apiresponse(200, { valid: true }, 'Token is valid')
  );
});

// Reset Password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, role, newPassword } = req.body;

  if (!token || !role || !newPassword) {
    throw new ApiErrorResponse(400, 'Token, role, and new password are required');
  }

  if (newPassword.length < 6) {
    throw new ApiErrorResponse(400, 'Password must be at least 6 characters long');
  }

  const Model = getModelByRole(role);
  const user = await Model.findOne({
    passwordResetToken: token,
    passwordResetExpiry: { $gt: new Date() }
  });

  if (!user) {
    throw new ApiErrorResponse(400, 'Invalid or expired reset token');
  }

  // Update password and clear reset token
  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpiry = undefined;
  user.refreshToken = undefined; // Invalidate existing sessions
  await user.save();

  return res.status(200).json(
    new Apiresponse(200, {}, 'Password reset successfully')
  );
});

// Change Password (for authenticated users)
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { _id, role } = req.user;

  if (!currentPassword || !newPassword) {
    throw new ApiErrorResponse(400, 'Current password and new password are required');
  }

  if (newPassword.length < 6) {
    throw new ApiErrorResponse(400, 'New password must be at least 6 characters long');
  }

  const Model = getModelByRole(role);
  const user = await Model.findById(_id);

  if (!user) {
    throw new ApiErrorResponse(404, 'User not found');
  }

  // Verify current password
  const isCurrentPasswordValid = await user.isCurrentPassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new ApiErrorResponse(400, 'Current password is incorrect');
  }

  // Prevent setting the same password
  const isSamePassword = await user.isCurrentPassword(newPassword);
  if (isSamePassword) {
    throw new ApiErrorResponse(400, 'New password must be different from current password');
  }

  // Update password
  user.password = newPassword;
  user.refreshToken = undefined; // Invalidate existing sessions
  await user.save();

  return res.status(200).json(
    new Apiresponse(200, {}, 'Password changed successfully')
  );
});

export {
  forgotPassword,
  verifyResetToken,
  resetPassword,
  changePassword
};
