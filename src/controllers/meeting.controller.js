import { Meeting } from "../models/meeting.model.js";
import { Course } from "../models/course.model.js";
import { Teacher } from "../models/teacher.model.js";
import { Student } from "../models/student.model.js";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import meetingService from "../services/meetingService.js";
import mongoose from "mongoose";

// Resolve the tenant adminId based on the requester role
const resolveAdminId = async (req) => {
  const { _id, role } = req.user || {};
  if (!role || !_id) throw new ApiErrorResponse(401, "Unauthorized");
  if (role === "admin") return _id;
  if (role === "teacher") {
    const t = await Teacher.findById(_id).select("admin_id");
    if (!t) throw new ApiErrorResponse(401, "Unauthorized");
    return String(t.admin_id);
  }
  if (role === "student") {
    const s = await Student.findById(_id).select("admin_id");
    if (!s) throw new ApiErrorResponse(401, "Unauthorized");
    return String(s.admin_id);
  }
  throw new ApiErrorResponse(403, "Forbidden");
};

/**
 * Create a new meeting
 * Only teachers and admins can create meetings
 */
const createMeeting = asyncHandler(async (req, res) => {
  const { title, description, course_id, scheduled_time, duration = 60 } = req.body || {};
  
  if (!title || !course_id || !scheduled_time) {
    throw new ApiErrorResponse(400, "Missing required fields: title, course_id, scheduled_time");
  }

  const adminId = await resolveAdminId(req);
  const { _id: userId, role } = req.user;

  // Validate course exists and user has access
  const course = await Course.findOne({ _id: course_id, admin_id: adminId })
    .populate('teacher_id', 'name email')
    .populate('students', '_id');
  
  if (!course) {
    throw new ApiErrorResponse(404, "Course not found");
  }

  // Determine teacher_id based on user role
  let teacherId;
  if (role === "admin") {
    teacherId = course.teacher_id._id;
  } else if (role === "teacher") {
    if (String(course.teacher_id._id) !== String(userId)) {
      throw new ApiErrorResponse(403, "You can only create meetings for your own courses");
    }
    teacherId = userId;
  } else {
    throw new ApiErrorResponse(403, "Only teachers and admins can create meetings");
  }

  // Validate scheduled time is in the future (allow 1 minute buffer for processing time)
  const scheduledDate = new Date(scheduled_time);
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60000); // 1 minute buffer
  
  console.log('Scheduled time validation:');
  console.log('- Scheduled date:', scheduledDate.toISOString());
  console.log('- Current time:', now.toISOString());
  console.log('- Buffer time:', oneMinuteAgo.toISOString());
  
  if (scheduledDate <= oneMinuteAgo) {
    throw new ApiErrorResponse(400, "Scheduled time must be in the future");
  }

  // Generate meeting link and details
  const meetingData = {
    title,
    courseCode: course.code,
    teacherName: course.teacher_id.name,
    scheduledTime: scheduledDate,
    duration
  };

  const meetingDetails = await meetingService.createMeeting(meetingData);
  console.log('Meeting details from service:', meetingDetails);

  // Create meeting in database
  const meeting = await Meeting.create({
    title,
    description: description || "",
    course_id,
    teacher_id: teacherId,
    scheduled_time: scheduledDate,
    duration,
    meeting_link: meetingDetails.meeting_link,
    meeting_id: meetingDetails.meeting_id,
    meeting_password: meetingDetails.meeting_password || "",
    provider: meetingDetails.provider || 'zoom',
    attendees: course.students || [],
    admin_id: adminId
  });
  console.log('Meeting created in database:', meeting._id);

  const populatedMeeting = await Meeting.findById(meeting._id)
    .populate('course_id', 'name code')
    .populate('teacher_id', 'name email')
    .populate('attendees', 'name email clg_id');

  return res.status(201).json(new Apiresponse(201, populatedMeeting, "Meeting created successfully"));
});

/**
 * List meetings based on user role and filters
 */
const listMeetings = asyncHandler(async (req, res) => {
  const adminId = await resolveAdminId(req);
  const { _id: userId, role } = req.user;
  const { course_id, status, from_date, to_date, limit = 50, page = 1 } = req.query || {};

  // Build filter based on user role
  let filter = { admin_id: adminId };

  if (role === "teacher") {
    filter.teacher_id = userId;
  } else if (role === "student") {
    filter.attendees = userId;
  }

  // Apply additional filters
  if (course_id) filter.course_id = course_id;
  if (status) {
    // Handle comma-separated status values
    const statusArray = status.split(',').map(s => s.trim());
    if (statusArray.length > 1) {
      filter.status = { $in: statusArray };
    } else {
      filter.status = status;
    }
  }
  
  if (from_date || to_date) {
    filter.scheduled_time = {};
    if (from_date) filter.scheduled_time.$gte = new Date(from_date);
    if (to_date) filter.scheduled_time.$lte = new Date(to_date);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [meetings, total] = await Promise.all([
    Meeting.find(filter)
      .populate('course_id', 'name code')
      .populate('teacher_id', 'name email')
      .populate('attendees', 'name email clg_id')
      .sort({ scheduled_time: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Meeting.countDocuments(filter)
  ]);

  // Add computed fields
  const enrichedMeetings = meetings.map(meeting => ({
    ...meeting,
    can_join: new Meeting(meeting).canJoin(),
    is_active: new Meeting(meeting).isActive(),
    end_time: new Date(meeting.scheduled_time.getTime() + (meeting.duration * 60 * 1000))
  }));

  return res.status(200).json(new Apiresponse(200, {
    meetings: enrichedMeetings,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    }
  }, "Meetings retrieved successfully"));
});

/**
 * Get a specific meeting by ID
 */
const getMeeting = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = await resolveAdminId(req);
  const { _id: userId, role } = req.user;

  let filter = { _id: id, admin_id: adminId };

  // Apply role-based access control
  if (role === "teacher") {
    filter.teacher_id = userId;
  } else if (role === "student") {
    filter.attendees = userId;
  }

  const meeting = await Meeting.findOne(filter)
    .populate('course_id', 'name code description')
    .populate('teacher_id', 'name email')
    .populate('attendees', 'name email clg_id')
    .lean();

  if (!meeting) {
    throw new ApiErrorResponse(404, "Meeting not found or access denied");
  }

  // Add computed fields
  const enrichedMeeting = {
    ...meeting,
    can_join: new Meeting(meeting).canJoin(),
    is_active: new Meeting(meeting).isActive(),
    end_time: new Date(meeting.scheduled_time.getTime() + (meeting.duration * 60 * 1000))
  };

  return res.status(200).json(new Apiresponse(200, enrichedMeeting, "Meeting retrieved successfully"));
});

/**
 * Update a meeting
 * Only teachers (for their meetings) and admins can update meetings
 */
const updateMeeting = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, scheduled_time, duration, status } = req.body || {};
  const adminId = await resolveAdminId(req);
  const { _id: userId, role } = req.user;

  let filter = { _id: id, admin_id: adminId };
  if (role === "teacher") {
    filter.teacher_id = userId;
  } else if (role === "student") {
    throw new ApiErrorResponse(403, "Students cannot update meetings");
  }

  const meeting = await Meeting.findOne(filter);
  if (!meeting) {
    throw new ApiErrorResponse(404, "Meeting not found or access denied");
  }

  // Prevent updating past meetings
  if (meeting.scheduled_time < new Date() && meeting.status !== 'scheduled') {
    throw new ApiErrorResponse(400, "Cannot update past meetings");
  }

  // Update fields
  const updateData = {};
  if (title) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (scheduled_time) {
    const newScheduledTime = new Date(scheduled_time);
    if (newScheduledTime <= new Date()) {
      throw new ApiErrorResponse(400, "Scheduled time must be in the future");
    }
    updateData.scheduled_time = newScheduledTime;
  }
  if (duration) updateData.duration = duration;
  if (status && ['scheduled', 'ongoing', 'completed', 'cancelled'].includes(status)) {
    updateData.status = status;
  }

  const updatedMeeting = await Meeting.findByIdAndUpdate(id, updateData, { new: true })
    .populate('course_id', 'name code')
    .populate('teacher_id', 'name email')
    .populate('attendees', 'name email clg_id');

  return res.status(200).json(new Apiresponse(200, updatedMeeting, "Meeting updated successfully"));
});

/**
 * Delete/Cancel a meeting
 */
const deleteMeeting = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = await resolveAdminId(req);
  const { _id: userId, role } = req.user;

  let filter = { _id: id, admin_id: adminId };
  if (role === "teacher") {
    filter.teacher_id = userId;
  } else if (role === "student") {
    throw new ApiErrorResponse(403, "Students cannot delete meetings");
  }

  const meeting = await Meeting.findOne(filter);
  if (!meeting) {
    throw new ApiErrorResponse(404, "Meeting not found or access denied");
  }

  // Cancel the meeting in the external service
  if (meeting.provider && meeting.provider !== 'jitsi') {
    await meetingService.deleteMeeting(meeting.meeting_id, meeting.provider);
  }

  // Update status to cancelled instead of deleting
  meeting.status = 'cancelled';
  await meeting.save();

  return res.status(200).json(new Apiresponse(200, {}, "Meeting cancelled successfully"));
});

/**
 * Join a meeting - get meeting link and validate access
 */
const joinMeeting = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = await resolveAdminId(req);
  const { _id: userId, role } = req.user;

  let filter = { _id: id, admin_id: adminId };

  // Students can only join meetings they're enrolled in
  if (role === "student") {
    filter.attendees = userId;
  }

  const meeting = await Meeting.findOne(filter)
    .populate('course_id', 'name code')
    .populate('teacher_id', 'name email');

  if (!meeting) {
    throw new ApiErrorResponse(404, "Meeting not found or access denied");
  }

  if (meeting.status === 'cancelled') {
    throw new ApiErrorResponse(400, "Meeting has been cancelled");
  }

  if (!meeting.canJoin()) {
    throw new ApiErrorResponse(400, "Meeting is not available for joining at this time");
  }

  // Update meeting status to ongoing if it's the scheduled time
  const now = new Date();
  if (now >= meeting.scheduled_time && meeting.status === 'scheduled') {
    meeting.status = 'ongoing';
    await meeting.save();
  }

  return res.status(200).json(new Apiresponse(200, {
    meeting_link: meeting.meeting_link,
    meeting_password: meeting.meeting_password,
    title: meeting.title,
    course: meeting.course_id,
    teacher: meeting.teacher_id,
    scheduled_time: meeting.scheduled_time,
    duration: meeting.duration
  }, "Meeting link retrieved successfully"));
});

/**
 * Get upcoming meetings for dashboard
 */
const getUpcomingMeetings = asyncHandler(async (req, res) => {
  const adminId = await resolveAdminId(req);
  const { _id: userId, role } = req.user;
  const { limit = 5 } = req.query || {};

  let filter = { 
    admin_id: adminId,
    scheduled_time: { $gte: new Date() },
    status: { $in: ['scheduled', 'ongoing'] }
  };

  if (role === "teacher") {
    filter.teacher_id = userId;
  } else if (role === "student") {
    filter.attendees = userId;
  }

  const meetings = await Meeting.find(filter)
    .populate('course_id', 'name code')
    .populate('teacher_id', 'name email')
    .sort({ scheduled_time: 1 })
    .limit(parseInt(limit))
    .lean();

  const enrichedMeetings = meetings.map(meeting => ({
    ...meeting,
    can_join: new Meeting(meeting).canJoin(),
    is_active: new Meeting(meeting).isActive(),
    end_time: new Date(meeting.scheduled_time.getTime() + (meeting.duration * 60 * 1000))
  }));

  return res.status(200).json(new Apiresponse(200, enrichedMeetings, "Upcoming meetings retrieved successfully"));
});

export {
  createMeeting,
  listMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
  joinMeeting,
  getUpcomingMeetings
};
