import { asyncHandler } from "../utils/asyncHandler.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";
import { Student } from "../models/student.model.js";
import { Teacher } from "../models/teacher.model.js";
import { Course } from "../models/course.model.js";
import { Notice } from "../models/notice.model.js";
import { Assignment } from "../models/assignment.model.js";
import { Test } from "../models/tests.model.js";
import { Submission } from "../models/submissions.model.js";
import { Marks } from "../models/marks.model.js";

// Admin dashboard statistics
const getAdminStats = asyncHandler(async (req, res) => {
  try {
    const [totalStudents, totalTeachers, totalCourses, totalNotices] = await Promise.all([
      Student.countDocuments(),
      Teacher.countDocuments(),
      Course.countDocuments(),
      Notice.countDocuments()
    ]);

    const stats = {
      totalStudents,
      totalTeachers,
      totalCourses,
      totalNotices
    };

    return res.status(200).json(
      new Apiresponse(200, stats, "Admin statistics retrieved successfully")
    );
  } catch (error) {
    throw new ApiErrorResponse(500, "Failed to retrieve admin statistics");
  }
});

// Teacher dashboard statistics
const getTeacherStats = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;

  if (!teacherId) {
    throw new ApiErrorResponse(400, "Teacher ID is required");
  }

  try {
    // Get courses taught by this teacher
    const teacherCourses = await Course.find({ teacher_id: teacherId });
    const courseIds = teacherCourses.map(course => course._id);

    // Count total students across all courses
    let totalStudents = 0;
    for (const course of teacherCourses) {
      totalStudents += course.students?.length || 0;
    }

    // Count pending submissions (assignments without marks)
    const assignments = await Assignment.find({ 
      course_id: { $in: courseIds } 
    });
    const assignmentIds = assignments.map(a => a._id);
    
    const markedSubmissions = await Marks.find({
      type: 'assignment',
      ref_id: { $in: assignmentIds }
    }).distinct('ref_id');

    const totalSubmissions = await Submission.countDocuments({
      type: 'assignment',
      ref_id: { $in: assignmentIds }
    });

    const pendingSubmissions = Math.max(0, totalSubmissions - markedSubmissions.length);

    // Count tests created by this teacher
    const testsCreated = await Test.countDocuments({
      course_id: { $in: courseIds }
    });

    const stats = {
      activeCourses: teacherCourses.length,
      totalStudents,
      pendingSubmissions,
      testsCreated
    };

    return res.status(200).json(
      new Apiresponse(200, stats, "Teacher statistics retrieved successfully")
    );
  } catch (error) {
    throw new ApiErrorResponse(500, "Failed to retrieve teacher statistics");
  }
});

// Student dashboard statistics
const getStudentStats = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  if (!studentId) {
    throw new ApiErrorResponse(400, "Student ID is required");
  }

  try {
    // Get student's enrolled courses
    const student = await Student.findById(studentId);
    if (!student) {
      throw new ApiErrorResponse(404, "Student not found");
    }

    const enrolledCourses = await Course.countDocuments({
      students: studentId
    });

    // Get assignments for student's courses
    const studentCourses = await Course.find({
      students: studentId
    });
    const courseIds = studentCourses.map(course => course._id);

    const assignments = await Assignment.find({
      course_id: { $in: courseIds }
    });
    const assignmentIds = assignments.map(a => a._id);

    // Count completed assignments (with submissions)
    const completedAssignments = await Submission.countDocuments({
      student_id: studentId,
      type: 'assignment',
      ref_id: { $in: assignmentIds }
    });

    const pendingAssignments = Math.max(0, assignments.length - completedAssignments);

    // Calculate average grade
    const marks = await Marks.find({
      student_id: studentId
    });

    let averageGrade = 0;
    if (marks.length > 0) {
      const totalScore = marks.reduce((sum, mark) => sum + (mark.score || 0), 0);
      const totalMaxScore = marks.reduce((sum, mark) => sum + (mark.max_score || 100), 0);
      averageGrade = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
    }

    const stats = {
      enrolledCourses,
      completedAssignments,
      pendingAssignments,
      averageGrade
    };

    return res.status(200).json(
      new Apiresponse(200, stats, "Student statistics retrieved successfully")
    );
  } catch (error) {
    throw new ApiErrorResponse(500, "Failed to retrieve student statistics");
  }
});

export {
  getAdminStats,
  getTeacherStats,
  getStudentStats
};
