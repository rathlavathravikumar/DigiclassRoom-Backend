import { Notification } from "../models/notification.model.js";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get all notifications for the current user
export const getUserNotifications = asyncHandler(async (req, res) => {
  const { _id: userId } = req.user;
  const { limit = 50, skip = 0, read } = req.query;

  const query = { recipient_id: userId };
  
  // Filter by read status if provided
  if (read !== undefined) {
    query.read = read === 'true';
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(skip))
    .lean();

  const unreadCount = await Notification.countDocuments({
    recipient_id: userId,
    read: false
  });

  return res.status(200).json(
    new Apiresponse(200, { notifications, unreadCount }, "Notifications fetched successfully")
  );
});

// Get unread count
export const getUnreadCount = asyncHandler(async (req, res) => {
  const { _id: userId } = req.user;

  const unreadCount = await Notification.countDocuments({
    recipient_id: userId,
    read: false
  });

  return res.status(200).json(
    new Apiresponse(200, { unreadCount }, "Unread count fetched successfully")
  );
});

// Mark notification as read
export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { _id: userId } = req.user;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, recipient_id: userId },
    { read: true },
    { new: true }
  );

  if (!notification) {
    throw new ApiErrorResponse(404, "Notification not found");
  }

  return res.status(200).json(
    new Apiresponse(200, { notification }, "Notification marked as read")
  );
});

// Mark all notifications as read
export const markAllAsRead = asyncHandler(async (req, res) => {
  const { _id: userId } = req.user;

  await Notification.updateMany(
    { recipient_id: userId, read: false },
    { read: true }
  );

  return res.status(200).json(
    new Apiresponse(200, {}, "All notifications marked as read")
  );
});

// Delete a notification
export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { _id: userId } = req.user;

  const notification = await Notification.findOneAndDelete({
    _id: id,
    recipient_id: userId
  });

  if (!notification) {
    throw new ApiErrorResponse(404, "Notification not found");
  }

  return res.status(200).json(
    new Apiresponse(200, {}, "Notification deleted successfully")
  );
});

// Delete all notifications for user
export const clearAllNotifications = asyncHandler(async (req, res) => {
  const { _id: userId } = req.user;

  await Notification.deleteMany({ recipient_id: userId });

  return res.status(200).json(
    new Apiresponse(200, {}, "All notifications cleared")
  );
});

// Create a notification (internal use)
export const createNotification = async ({
  recipient_id,
  recipient_type,
  type,
  title,
  message,
  related_id,
  related_name,
  metadata = {},
  admin_id
}) => {
  try {
    console.log('Creating notification:', { recipient_id, recipient_type, type, title });
    const notification = await Notification.create({
      recipient_id,
      recipient_type,
      type,
      title,
      message,
      related_id,
      related_name,
      metadata,
      admin_id
    });
    console.log('Notification created successfully:', notification._id);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    console.error('Notification data:', { recipient_id, recipient_type, type, title, admin_id });
    return null;
  }
};

// Bulk create notifications
export const createBulkNotifications = async (notifications) => {
  try {
    if (!notifications || notifications.length === 0) {
      console.log('No notifications to create');
      return [];
    }
    console.log(`Creating ${notifications.length} bulk notifications`);
    const created = await Notification.insertMany(notifications);
    console.log(`Successfully created ${created.length} notifications`);
    return created;
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    console.error('First notification sample:', notifications[0]);
    return [];
  }
};
