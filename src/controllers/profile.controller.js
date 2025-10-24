import { Admin } from "../models/admin.model.js";
import { Teacher } from "../models/teacher.model.js";
import { Student } from "../models/student.model.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";

// Update Admin Profile
export const updateAdminProfile = async (req, res, next) => {
  try {
    const { name, email, clgName } = req.body;
    const adminId = req.user._id;

    // Find admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return next(new ApiErrorResponse(404, "Admin not found"));
    }

    // Check if email is being changed and if it already exists
    if (email && email !== admin.email) {
      const existingAdmin = await Admin.findOne({ email, _id: { $ne: adminId } });
      if (existingAdmin) {
        return next(new ApiErrorResponse(400, "Email already in use"));
      }
    }

    // Build update object with only the fields to update
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (clgName) updateData.clgName = clgName;

    // Use findByIdAndUpdate to avoid triggering password hashing
    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password -refreshToken");

    return res.status(200).json(
      new Apiresponse(200, { user: updatedAdmin }, "Profile updated successfully")
    );
  } catch (error) {
    return next(new ApiErrorResponse(500, error.message || "Error updating profile"));
  }
};

// Update Teacher Profile
export const updateTeacherProfile = async (req, res, next) => {
  try {
    const { name, email, clg_id } = req.body;
    const teacherId = req.user._id;

    // Find teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return next(new ApiErrorResponse(404, "Teacher not found"));
    }

    // Check if email is being changed and if it already exists
    if (email && email !== teacher.email) {
      const existingTeacher = await Teacher.findOne({ email, _id: { $ne: teacherId } });
      if (existingTeacher) {
        return next(new ApiErrorResponse(400, "Email already in use"));
      }
    }

    // Check if clg_id is being changed and if it already exists for this admin
    if (clg_id && clg_id !== teacher.clg_id) {
      const existingClgId = await Teacher.findOne({
        admin_id: teacher.admin_id,
        clg_id,
        _id: { $ne: teacherId }
      });
      if (existingClgId) {
        return next(new ApiErrorResponse(400, "College ID already in use"));
      }
    }

    // Build update object with only the fields to update
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (clg_id !== undefined) updateData.clg_id = clg_id;

    // Use findByIdAndUpdate to avoid triggering password hashing
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password -refreshToken");

    return res.status(200).json(
      new Apiresponse(200, { user: updatedTeacher }, "Profile updated successfully")
    );
  } catch (error) {
    return next(new ApiErrorResponse(500, error.message || "Error updating profile"));
  }
};

// Update Student Profile
export const updateStudentProfile = async (req, res, next) => {
  try {
    const { name, email, clg_id } = req.body;
    const studentId = req.user._id;

    // Find student
    const student = await Student.findById(studentId);
    if (!student) {
      return next(new ApiErrorResponse(404, "Student not found"));
    }

    // Check if email is being changed and if it already exists
    if (email && email !== student.email) {
      const existingStudent = await Student.findOne({ email, _id: { $ne: studentId } });
      if (existingStudent) {
        return next(new ApiErrorResponse(400, "Email already in use"));
      }
    }

    // Check if clg_id is being changed and if it already exists for this admin
    if (clg_id && clg_id !== student.clg_id) {
      const existingClgId = await Student.findOne({
        admin_id: student.admin_id,
        clg_id,
        _id: { $ne: studentId }
      });
      if (existingClgId) {
        return next(new ApiErrorResponse(400, "College ID already in use"));
      }
    }

    // Build update object with only the fields to update
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (clg_id) updateData.clg_id = clg_id;

    // Use findByIdAndUpdate to avoid triggering password hashing
    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password -refreshToken");

    return res.status(200).json(
      new Apiresponse(200, { user: updatedStudent }, "Profile updated successfully")
    );
  } catch (error) {
    return next(new ApiErrorResponse(500, error.message || "Error updating profile"));
  }
};
