import { Attendance } from "../models/attendance.model.js";
import { Course } from "../models/course.model.js";
import logger from "../logger.js";

// Mark attendance for a course on a specific date
export const markAttendance = async (req, res) => {
  try {
    const { course_id, date, records } = req.body;
    const teacher_id = req.user._id;

    // Validate inputs
    if (!course_id || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "Missing required fields: course_id, date, and records array",
        data: null,
      });
    }

    // Verify the teacher owns this course
    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({
        statusCode: 404,
        message: "Course not found",
        data: null,
      });
    }

    if (course.teacher_id.toString() !== teacher_id.toString()) {
      return res.status(403).json({
        statusCode: 403,
        message: "You can only mark attendance for your own courses",
        data: null,
      });
    }

    // Normalize date to start of day (remove time component)
    const attendanceDate = new Date(date);
    attendanceDate.setUTCHours(0, 0, 0, 0);

    // Upsert attendance record
    const attendance = await Attendance.findOneAndUpdate(
      { course_id, date: attendanceDate },
      {
        course_id,
        date: attendanceDate,
        records,
        marked_by: teacher_id,
      },
      { upsert: true, new: true }
    );

    logger.info(
      `Attendance marked for course ${course_id} on ${attendanceDate}`
    );

    return res.status(200).json({
      statusCode: 200,
      message: "Attendance marked successfully",
      data: attendance,
    });
  } catch (error) {
    logger.error(`Error marking attendance: ${error.message}`);
    return res.status(500).json({
      statusCode: 500,
      message: "Error marking attendance",
      data: null,
      error: error.message,
    });
  }
};

// Get attendance for a course on a specific date
export const getAttendanceByDate = async (req, res) => {
  try {
    const { course_id, date } = req.query;
    const teacher_id = req.user._id;

    if (!course_id || !date) {
      return res.status(400).json({
        statusCode: 400,
        message: "Missing required query parameters: course_id and date",
        data: null,
      });
    }

    // Verify the teacher owns this course
    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({
        statusCode: 404,
        message: "Course not found",
        data: null,
      });
    }

    if (course.teacher_id.toString() !== teacher_id.toString()) {
      return res.status(403).json({
        statusCode: 403,
        message: "You can only view attendance for your own courses",
        data: null,
      });
    }

    // Normalize date to start of day
    const attendanceDate = new Date(date);
    attendanceDate.setUTCHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      course_id,
      date: attendanceDate,
    }).populate("records.student_id", "name email clg_id");

    if (!attendance) {
      return res.status(200).json({
        statusCode: 200,
        message: "No attendance record found for this date",
        data: null,
      });
    }

    return res.status(200).json({
      statusCode: 200,
      message: "Attendance retrieved successfully",
      data: attendance,
    });
  } catch (error) {
    logger.error(`Error retrieving attendance: ${error.message}`);
    return res.status(500).json({
      statusCode: 500,
      message: "Error retrieving attendance",
      data: null,
      error: error.message,
    });
  }
};

// Get attendance history for a course (last N days or within date range)
export const getAttendanceHistory = async (req, res) => {
  try {
    const { course_id, limit = 30 } = req.query;
    const teacher_id = req.user._id;

    if (!course_id) {
      return res.status(400).json({
        statusCode: 400,
        message: "Missing required query parameter: course_id",
        data: null,
      });
    }

    // Verify the teacher owns this course
    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({
        statusCode: 404,
        message: "Course not found",
        data: null,
      });
    }

    if (course.teacher_id.toString() !== teacher_id.toString()) {
      return res.status(403).json({
        statusCode: 403,
        message: "You can only view attendance history for your own courses",
        data: null,
      });
    }

    const attendance = await Attendance.find({ course_id })
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .populate("records.student_id", "name email clg_id")
      .populate("marked_by", "name email");

    return res.status(200).json({
      statusCode: 200,
      message: "Attendance history retrieved successfully",
      data: attendance,
    });
  } catch (error) {
    logger.error(`Error retrieving attendance history: ${error.message}`);
    return res.status(500).json({
      statusCode: 500,
      message: "Error retrieving attendance history",
      data: null,
      error: error.message,
    });
  }
};

// Get attendance record for a specific student in a course
export const getStudentAttendance = async (req, res) => {
  try {
    const { course_id, student_id } = req.query;
    const teacher_id = req.user._id;

    if (!course_id || !student_id) {
      return res.status(400).json({
        statusCode: 400,
        message: "Missing required query parameters: course_id and student_id",
        data: null,
      });
    }

    // Verify the teacher owns this course
    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({
        statusCode: 404,
        message: "Course not found",
        data: null,
      });
    }

    if (course.teacher_id.toString() !== teacher_id.toString()) {
      return res.status(403).json({
        statusCode: 403,
        message: "You can only view attendance for your own courses",
        data: null,
      });
    }

    // Get all attendance records for this course that include this student
    const attendanceRecords = await Attendance.find({
      course_id,
      "records.student_id": student_id,
    })
      .sort({ date: -1 })
      .populate("records.student_id", "name email clg_id")
      .populate("marked_by", "name email");

    // Calculate statistics
    let presentCount = 0;
    let absentCount = 0;

    attendanceRecords.forEach((record) => {
      const studentRecord = record.records.find(
        (r) => r.student_id._id.toString() === student_id
      );
      if (studentRecord) {
        if (studentRecord.status === "present") presentCount++;
        else if (studentRecord.status === "absent") absentCount++;
      }
    });

    return res.status(200).json({
      statusCode: 200,
      message: "Student attendance retrieved successfully",
      data: {
        attendanceRecords,
        statistics: {
          totalClasses: attendanceRecords.length,
          presentCount,
          absentCount,
          attendancePercentage:
            attendanceRecords.length > 0
              ? ((presentCount / attendanceRecords.length) * 100).toFixed(2)
              : 0,
        },
      },
    });
  } catch (error) {
    logger.error(`Error retrieving student attendance: ${error.message}`);
    return res.status(500).json({
      statusCode: 500,
      message: "Error retrieving student attendance",
      data: null,
      error: error.message,
    });
  }
};