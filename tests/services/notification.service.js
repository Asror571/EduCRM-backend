const { Notification } = require("../models");
const logger = require("../utils/logger");
const emailService = require("./email.service");
const smsService = require("./sms.service");

/**
 * Create notification
 */
const createNotification = async (data) => {
  try {
    const notification = await Notification.create(data);
    logger.info(`Notification created: ${notification._id}`);

    // Send via enabled channels
    if (data.channels?.email?.enabled) {
      await sendViaEmail(notification);
    }

    if (data.channels?.sms?.enabled) {
      await sendViaSMS(notification);
    }

    return notification;
  } catch (error) {
    logger.error("Error creating notification:", error);
    throw error;
  }
};

/**
 * Send notification via email
 */
const sendViaEmail = async (notification) => {
  try {
    const user = await require("../models/User").findById(notification.userId);

    if (!user || !user.email) {
      return;
    }

    const result = await emailService.sendEmail({
      email: user.email,
      subject: notification.title,
      html: notification.message,
    });

    // Update notification
    await Notification.findByIdAndUpdate(notification._id, {
      "channels.email.sent": result.success,
      "channels.email.sentAt": new Date(),
      "channels.email.error": result.error || null,
    });
  } catch (error) {
    logger.error("Error sending notification via email:", error);
  }
};

/**
 * Send notification via SMS
 */
const sendViaSMS = async (notification) => {
  try {
    const user = await require("../models/User").findById(notification.userId);

    if (!user || !user.phone) {
      return;
    }

    // Extract plain text from HTML message
    const plainText = notification.message.replace(/<[^>]*>/g, "");

    const result = await smsService.sendSMS(user.phone, plainText);

    // Update notification
    await Notification.findByIdAndUpdate(notification._id, {
      "channels.sms.sent": result.success,
      "channels.sms.sentAt": new Date(),
      "channels.sms.error": result.error || null,
    });
  } catch (error) {
    logger.error("Error sending notification via SMS:", error);
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true },
    );

    return notification;
  } catch (error) {
    logger.error("Error marking notification as read:", error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 */
const markAllAsRead = async (userId) => {
  try {
    await Notification.updateMany(
      { userId, isRead: false },
      {
        isRead: true,
        readAt: new Date(),
      },
    );

    return true;
  } catch (error) {
    logger.error("Error marking all notifications as read:", error);
    throw error;
  }
};

/**
 * Get user notifications
 */
const getUserNotifications = async (userId, options = {}) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = options;

    const query = { userId };

    if (unreadOnly) {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Error getting user notifications:", error);
    throw error;
  }
};

/**
 * Delete notification
 */
const deleteNotification = async (notificationId) => {
  try {
    await Notification.findByIdAndDelete(notificationId);
    return true;
  } catch (error) {
    logger.error("Error deleting notification:", error);
    throw error;
  }
};

/**
 * Send payment reminder notifications
 */
const sendPaymentReminders = async (organizationId) => {
  try {
    const { Student, Payment } = require("../models");

    // Get students with debt
    const students = await Student.find({
      organizationId,
      status: "active",
      totalDebt: { $gt: 0 },
    }).populate("userId");

    const notifications = [];

    for (const student of students) {
      // Calculate days overdue
      const lastPayment = await Payment.findOne({
        studentId: student._id,
        status: "completed",
      }).sort({ paymentDate: -1 });

      if (lastPayment) {
        const daysOverdue = Math.floor(
          (Date.now() - lastPayment.paymentDate) / (1000 * 60 * 60 * 24),
        );

        if (daysOverdue >= 7) {
          const notification = await createNotification({
            organizationId,
            userId: student.userId._id,
            type: "payment_reminder",
            title: "Payment Reminder",
            message: `You have an outstanding balance of ${student.totalDebt} UZS. Please make payment soon.`,
            priority: daysOverdue >= 30 ? "high" : "normal",
            channels: {
              inApp: true,
              email: { enabled: true },
              sms: { enabled: daysOverdue >= 14 },
            },
          });

          notifications.push(notification);
        }
      }
    }

    return notifications;
  } catch (error) {
    logger.error("Error sending payment reminders:", error);
    throw error;
  }
};

/**
 * Send class reminders
 */
const sendClassReminders = async (organizationId, date) => {
  try {
    const { Group, Student } = require("../models");

    // Get groups with classes on the specified date
    const dayOfWeek = new Date(date).toLocaleDateString("en-US", {
      weekday: "lowercase",
    });

    const groups = await Group.find({
      organizationId,
      status: "active",
      "schedule.day": dayOfWeek,
    }).populate("currentStudents.studentId");

    const notifications = [];

    for (const group of groups) {
      for (const enrollment of group.currentStudents) {
        if (enrollment.status === "active") {
          const student = await Student.findById(enrollment.studentId).populate(
            "userId",
          );

          if (student) {
            const notification = await createNotification({
              organizationId,
              userId: student.userId._id,
              type: "class_reminder",
              title: "Class Reminder",
              message: `Reminder: You have class today at ${group.schedule[0].startTime} in room ${group.roomNumber}`,
              relatedTo: {
                model: "Group",
                id: group._id,
              },
              channels: {
                inApp: true,
                sms: { enabled: true },
              },
            });

            notifications.push(notification);
          }
        }
      }
    }

    return notifications;
  } catch (error) {
    logger.error("Error sending class reminders:", error);
    throw error;
  }
};

/**
 * Send birthday wishes
 */
const sendBirthdayWishes = async (organizationId) => {
  try {
    const { Student } = require("../models");

    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    // Find students with birthday today
    const students = await Student.find({
      organizationId,
      status: "active",
      $expr: {
        $and: [
          { $eq: [{ $month: "$dateOfBirth" }, todayMonth] },
          { $eq: [{ $dayOfMonth: "$dateOfBirth" }, todayDay] },
        ],
      },
    }).populate("userId");

    const notifications = [];

    for (const student of students) {
      const notification = await createNotification({
        organizationId,
        userId: student.userId._id,
        type: "birthday",
        title: "Happy Birthday! 🎉",
        message: `Happy Birthday ${student.userId.firstName}! Wishing you all the best on your special day!`,
        priority: "normal",
        channels: {
          inApp: true,
          sms: { enabled: true },
        },
      });

      notifications.push(notification);
    }

    return notifications;
  } catch (error) {
    logger.error("Error sending birthday wishes:", error);
    throw error;
  }
};

module.exports = {
  createNotification,
  markAsRead,
  markAllAsRead,
  getUserNotifications,
  deleteNotification,
  sendPaymentReminders,
  sendClassReminders,
  sendBirthdayWishes,
};
