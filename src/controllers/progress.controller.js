import { Marks } from "../models/marks.model.js";
import { Student } from "../models/student.model.js";
import { Teacher } from "../models/teacher.model.js";
import { Course } from "../models/course.model.js";
import { Assignment } from "../models/assignment.model.js";
import { Test } from "../models/tests.model.js";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Student Progress - Get progress for a specific student across all their courses
export const getStudentProgress = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const requestingUserId = req.user?._id;
  
  // Authorization: Students can only view their own progress, teachers/admins can view any
  if (req.user?.role === 'student' && studentId !== requestingUserId.toString()) {
    throw new ApiErrorResponse(403, "You can only view your own progress");
  }

  // Get student info
  const student = await Student.findById(studentId);
  if (!student) {
    throw new ApiErrorResponse(404, "Student not found");
  }

  // Find courses where this student is enrolled
  const enrolledCourses = await Course.find({ students: studentId }).lean();

  const progressData = [];

  for (const course of enrolledCourses) {
    // Get all marks for this student in this course
    const marks = await Marks.find({
      student_id: studentId,
      course_id: course._id
    }).lean();

    // Get assignments and tests for this course
    const assignments = await Assignment.find({ course_id: course._id }).lean();
    const tests = await Test.find({ course_id: course._id }).lean();

    // Process assignments
    const assignmentProgress = assignments.map(assignment => {
      const mark = marks.find(m => m.type === 'assignment' && m.ref_id.toString() === assignment._id.toString());
      return {
        id: assignment._id,
        title: assignment.title,
        type: 'assignment',
        dueDate: assignment.due_date,
        maxScore: assignment.total_marks || 100,
        obtainedScore: mark?.score || 0,
        percentage: mark ? Math.round((mark.score / mark.max_score) * 100) : 0,
        remarks: mark?.remarks || '',
        submitted: !!mark,
        submittedAt: mark?.createdAt
      };
    });

    // Process tests
    const testProgress = tests.map(test => {
      const mark = marks.find(m => m.type === 'test' && m.ref_id.toString() === test._id.toString());
      return {
        id: test._id,
        title: test.title,
        type: 'test',
        scheduledAt: test.scheduled_at,
        maxScore: test.total_marks || 100,
        obtainedScore: mark?.score || 0,
        percentage: mark ? Math.round((mark.score / mark.max_score) * 100) : 0,
        remarks: mark?.remarks || '',
        completed: !!mark,
        completedAt: mark?.createdAt
      };
    });

    // Calculate course statistics
    const allItems = [...assignmentProgress, ...testProgress];
    const completedItems = allItems.filter(item => item.submitted || item.completed);
    const totalPossibleScore = allItems.reduce((sum, item) => sum + item.maxScore, 0);
    const totalObtainedScore = completedItems.reduce((sum, item) => sum + item.obtainedScore, 0);
    const coursePercentage = totalPossibleScore > 0 ? Math.round((totalObtainedScore / totalPossibleScore) * 100) : 0;

    progressData.push({
      course: {
        id: course._id,
        name: course.name,
        code: course.code,
        description: course.description
      },
      assignments: assignmentProgress,
      tests: testProgress,
      statistics: {
        totalItems: allItems.length,
        completedItems: completedItems.length,
        totalPossibleScore,
        totalObtainedScore,
        coursePercentage,
        averageScore: completedItems.length > 0 ? Math.round(completedItems.reduce((sum, item) => sum + item.percentage, 0) / completedItems.length) : 0
      }
    });
  }

  return res.status(200).json(new Apiresponse(200, {
    student: {
      id: student._id,
      name: student.name,
      email: student.email,
      clg_id: student.clg_id
    },
    courses: progressData,
    overallStatistics: {
      totalCourses: progressData.length,
      averagePercentage: progressData.length > 0 ? Math.round(progressData.reduce((sum, course) => sum + course.statistics.coursePercentage, 0) / progressData.length) : 0,
      totalCompletedItems: progressData.reduce((sum, course) => sum + course.statistics.completedItems, 0),
      totalItems: progressData.reduce((sum, course) => sum + course.statistics.totalItems, 0)
    }
  }, "Student progress retrieved successfully"));
});

// Teacher Progress View - Get progress for all students in a specific course taught by the teacher
export const getCourseProgress = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const teacherId = req.user?._id;

  // Verify teacher teaches this course (or is admin)
  if (req.user?.role === 'teacher') {
    const course = await Course.findOne({ _id: courseId, teacher_id: teacherId });
    if (!course) {
      throw new ApiErrorResponse(403, "You can only view progress for courses you teach");
    }
  }

  // Get course details with enrolled students
  const course = await Course.findById(courseId).populate('students', 'name email clg_id').lean();
  if (!course) {
    throw new ApiErrorResponse(404, "Course not found");
  }

  // Get all assignments and tests for this course
  const assignments = await Assignment.find({ course_id: courseId }).lean();
  const tests = await Test.find({ course_id: courseId }).lean();

  // Get all marks for this course
  const allMarks = await Marks.find({ course_id: courseId }).lean();

  const studentProgress = [];

  for (const student of course.students) {
    const studentMarks = allMarks.filter(mark => mark.student_id.toString() === student._id.toString());

    // Process assignments for this student
    const assignmentScores = assignments.map(assignment => {
      const mark = studentMarks.find(m => m.type === 'assignment' && m.ref_id.toString() === assignment._id.toString());
      return {
        assignmentId: assignment._id,
        title: assignment.title,
        maxScore: assignment.total_marks || 100,
        obtainedScore: mark?.score || 0,
        percentage: mark ? Math.round((mark.score / mark.max_score) * 100) : 0,
        submitted: !!mark
      };
    });

    // Process tests for this student
    const testScores = tests.map(test => {
      const mark = studentMarks.find(m => m.type === 'test' && m.ref_id.toString() === test._id.toString());
      return {
        testId: test._id,
        title: test.title,
        maxScore: test.total_marks || 100,
        obtainedScore: mark?.score || 0,
        percentage: mark ? Math.round((mark.score / mark.max_score) * 100) : 0,
        completed: !!mark
      };
    });

    // Calculate student statistics
    const allScores = [...assignmentScores, ...testScores];
    const completedScores = allScores.filter(score => score.submitted || score.completed);
    const totalPossibleScore = allScores.reduce((sum, score) => sum + score.maxScore, 0);
    const totalObtainedScore = completedScores.reduce((sum, score) => sum + score.obtainedScore, 0);
    const overallPercentage = totalPossibleScore > 0 ? Math.round((totalObtainedScore / totalPossibleScore) * 100) : 0;

    studentProgress.push({
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        clg_id: student.clg_id
      },
      assignments: assignmentScores,
      tests: testScores,
      statistics: {
        overallPercentage,
        totalObtainedScore,
        totalPossibleScore,
        completedItems: completedScores.length,
        totalItems: allScores.length,
        averageScore: completedScores.length > 0 ? Math.round(completedScores.reduce((sum, score) => sum + score.percentage, 0) / completedScores.length) : 0
      }
    });
  }

  // Calculate course statistics
  const courseStats = {
    totalStudents: studentProgress.length,
    averagePerformance: studentProgress.length > 0 ? Math.round(studentProgress.reduce((sum, sp) => sum + sp.statistics.overallPercentage, 0) / studentProgress.length) : 0,
    highestPerformance: studentProgress.length > 0 ? Math.max(...studentProgress.map(sp => sp.statistics.overallPercentage)) : 0,
    lowestPerformance: studentProgress.length > 0 ? Math.min(...studentProgress.map(sp => sp.statistics.overallPercentage)) : 0,
    totalAssignments: assignments.length,
    totalTests: tests.length
  };

  return res.status(200).json(new Apiresponse(200, {
    course: {
      id: course._id,
      name: course.name,
      code: course.code,
      description: course.description
    },
    students: studentProgress,
    courseStatistics: courseStats,
    assignments: assignments.map(a => ({ id: a._id, title: a.title, maxScore: a.total_marks || 100 })),
    tests: tests.map(t => ({ id: t._id, title: t.title, maxScore: t.total_marks || 100 }))
  }, "Course progress retrieved successfully"));
});

// Admin Progress Dashboard - Get overall progress for any course
export const getAdminCourseProgress = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  // Get course details with teacher and students
  const course = await Course.findById(courseId)
    .populate('teacher_id', 'name email')
    .populate('students', 'name email clg_id')
    .lean();

  if (!course) {
    throw new ApiErrorResponse(404, "Course not found");
  }

  // Get all marks for this course with aggregation
  const progressStats = await Marks.aggregate([
    { $match: { course_id: course._id } },
    {
      $group: {
        _id: "$student_id",
        totalScore: { $sum: "$score" },
        totalMaxScore: { $sum: "$max_score" },
        itemCount: { $sum: 1 },
        averagePercentage: {
          $avg: {
            $multiply: [
              { $divide: ["$score", "$max_score"] },
              100
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: "students",
        localField: "_id",
        foreignField: "_id",
        as: "student"
      }
    },
    { $unwind: "$student" },
    {
      $project: {
        studentId: "$_id",
        studentName: "$student.name",
        studentEmail: "$student.email",
        studentClgId: "$student.clg_id",
        totalScore: 1,
        totalMaxScore: 1,
        itemCount: 1,
        averagePercentage: { $round: ["$averagePercentage", 0] },
        overallPercentage: {
          $round: [
            { $multiply: [{ $divide: ["$totalScore", "$totalMaxScore"] }, 100] },
            0
          ]
        }
      }
    },
    { $sort: { overallPercentage: -1 } }
  ]);

  // Get performance distribution for chart
  const performanceDistribution = {
    excellent: progressStats.filter(s => s.overallPercentage >= 90).length,
    good: progressStats.filter(s => s.overallPercentage >= 75 && s.overallPercentage < 90).length,
    average: progressStats.filter(s => s.overallPercentage >= 60 && s.overallPercentage < 75).length,
    belowAverage: progressStats.filter(s => s.overallPercentage < 60).length
  };

  // Calculate overall course statistics
  const overallStats = {
    totalStudents: course.students.length,
    studentsWithMarks: progressStats.length,
    averagePerformance: progressStats.length > 0 ? Math.round(progressStats.reduce((sum, s) => sum + s.overallPercentage, 0) / progressStats.length) : 0,
    highestPerformance: progressStats.length > 0 ? Math.max(...progressStats.map(s => s.overallPercentage)) : 0,
    lowestPerformance: progressStats.length > 0 ? Math.min(...progressStats.map(s => s.overallPercentage)) : 0,
    performanceDistribution
  };

  return res.status(200).json(new Apiresponse(200, {
    course: {
      id: course._id,
      name: course.name,
      code: course.code,
      description: course.description,
      teacher: course.teacher_id
    },
    studentProgress: progressStats,
    overallStatistics: overallStats,
    performanceDistribution
  }, "Admin course progress retrieved successfully"));
});

// Get all courses for admin progress dashboard
export const getAdminCoursesOverview = asyncHandler(async (req, res) => {
  const courses = await Course.find({})
    .populate('teacher_id', 'name email')
    .lean();

  const coursesWithStats = await Promise.all(courses.map(async (course) => {
    const studentCount = course.students?.length || 0;
    const marksCount = await Marks.countDocuments({ course_id: course._id });
    
    // Get average performance for this course
    const avgPerformance = await Marks.aggregate([
      { $match: { course_id: course._id } },
      {
        $group: {
          _id: null,
          averagePercentage: {
            $avg: {
              $multiply: [
                { $divide: ["$score", "$max_score"] },
                100
              ]
            }
          }
        }
      }
    ]);

    return {
      id: course._id,
      name: course.name,
      code: course.code,
      teacher: course.teacher_id,
      studentCount,
      marksCount,
      averagePerformance: avgPerformance.length > 0 ? Math.round(avgPerformance[0].averagePercentage) : 0
    };
  }));

  return res.status(200).json(new Apiresponse(200, coursesWithStats, "Admin courses overview retrieved successfully"));
});
