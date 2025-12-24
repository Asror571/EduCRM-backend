const mongoose = require("mongoose");
const { NOTIFICATION_TYPES } = require("../config/constants");

const notificationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    // Recipient
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Notification details
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },

    // Related data
    relatedTo: {
      model: {
        type: String,
        enum: [
          "Payment",
          "Group",
          "Course",
          "Student",
          "Teacher",
          "Lead",
          "Attendance",
        ],
      },
      id: mongoose.Schema.Types.ObjectId,
    },

    // Action URL
    actionUrl: String,

    // Status
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,

    // Priority
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },

    // Delivery channels
    channels: {
      inApp: {
        type: Boolean,
        default: true,
      },
      email: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String,
      },
      sms: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String,
      },
      push: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String,
      },
    },

    // Schedule
    scheduledFor: Date,

    // Expiry
    expiresAt: Date,
  },
  {
    timestamps: true,
  },
);

// Indexes
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ organizationId: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Notification", notificationSchema);
