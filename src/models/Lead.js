const mongoose = require("mongoose");
const { LEAD_STATUS, LEAD_SOURCES } = require("../config/constants");

const leadSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    // Personal info
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    // Interested course
    interestedCourse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
    courseLevel: String,
    preferredSchedule: [String],

    // Source
    source: {
      type: String,
      enum: Object.values(LEAD_SOURCES),
      required: true,
    },
    sourceDetails: String,

    // Referral
    referredBy: {
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
      name: String,
      phone: String,
    },

    // Status
    status: {
      type: String,
      enum: Object.values(LEAD_STATUS),
      default: LEAD_STATUS.NEW,
    },

    // Assignment
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedAt: Date,

    // Contact history
    contactHistory: [
      {
        contactedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        contactDate: {
          type: Date,
          default: Date.now,
        },
        method: {
          type: String,
          enum: ["phone", "email", "sms", "whatsapp", "telegram", "in-person"],
        },
        outcome: {
          type: String,
          enum: [
            "answered",
            "no-answer",
            "busy",
            "wrong-number",
            "follow-up-scheduled",
            "not-interested",
          ],
        },
        notes: String,
        nextFollowUp: Date,
      },
    ],

    // Test/Interview
    test: {
      isScheduled: {
        type: Boolean,
        default: false,
      },
      scheduledDate: Date,
      scheduledTime: String,
      conductedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      conductedDate: Date,
      results: {
        writtenScore: Number,
        oralScore: Number,
        overallScore: Number,
        recommendedLevel: String,
        notes: String,
      },
    },

    // Enrollment
    enrollmentStatus: {
      isEnrolled: {
        type: Boolean,
        default: false,
      },
      enrolledDate: Date,
      enrolledGroupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
      },
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    },

    // Rejection/Lost
    rejection: {
      reason: {
        type: String,
        enum: [
          "too-expensive",
          "schedule-conflict",
          "distance",
          "chose-competitor",
          "not-interested",
          "other",
        ],
      },
      details: String,
      date: Date,
    },

    // Priority
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    // Budget
    budget: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: "UZS",
      },
    },

    // Additional info
    age: Number,
    occupation: String,
    motivation: String,
    previousExperience: String,

    // Notes
    notes: {
      type: String,
      maxlength: 1000,
    },
    tags: [String],

    // Next action
    nextAction: {
      action: String,
      dueDate: Date,
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
leadSchema.index({ organizationId: 1, status: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ createdAt: -1 });

// Virtual for full name
leadSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Get days since creation
leadSchema.virtual("daysSinceCreated").get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model("Lead", leadSchema);
