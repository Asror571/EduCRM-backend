const mongoose = require("mongoose");
const { GROUP_STATUS, DAYS_OF_WEEK } = require("../config/constants");

const groupSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
    },
    code: {
      type: String,
      unique: true,
    },

    // Teachers
    mainTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    assistantTeachers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher",
      },
    ],

    // Schedule
    schedule: [
      {
        day: {
          type: String,
          enum: Object.values(DAYS_OF_WEEK),
          required: true,
        },
        startTime: {
          type: String,
          required: true,
        },
        endTime: {
          type: String,
          required: true,
        },
      },
    ],

    // Room
    roomNumber: {
      type: String,
      required: true,
    },
    roomCapacity: {
      type: Number,
      default: 15,
    },

    // Dates
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },

    // Students
    maxStudents: {
      type: Number,
      required: true,
      default: 12,
    },
    minStudents: {
      type: Number,
      default: 5,
    },
    currentStudents: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
        },
        enrollmentDate: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["active", "frozen", "completed", "dropped"],
          default: "active",
        },
      },
    ],

    // Pricing (can override course pricing)
    pricing: {
      monthlyFee: {
        type: Number,
        required: true,
      },
      registrationFee: {
        type: Number,
        default: 0,
      },
      materialsFee: {
        type: Number,
        default: 0,
      },
    },

    // Status
    status: {
      type: String,
      enum: Object.values(GROUP_STATUS),
      default: GROUP_STATUS.PLANNED,
    },

    // Academic progress
    progress: {
      totalLessons: {
        type: Number,
        default: 0,
      },
      completedLessons: {
        type: Number,
        default: 0,
      },
      percentage: {
        type: Number,
        default: 0,
      },
    },

    // Current lesson
    currentLesson: {
      lessonNumber: Number,
      topic: String,
      date: Date,
    },

    // Attendance tracking
    totalClasses: {
      type: Number,
      default: 0,
    },
    averageAttendance: {
      type: Number,
      default: 0,
    },

    // Notes
    description: {
      type: String,
      maxlength: 500,
    },
    notes: {
      type: String,
      maxlength: 1000,
    },

    // Special settings
    settings: {
      allowLateEnrollment: {
        type: Boolean,
        default: true,
      },
      requirePrerequisites: {
        type: Boolean,
        default: false,
      },
      autoCreateAttendance: {
        type: Boolean,
        default: true,
      },
      sendClassReminders: {
        type: Boolean,
        default: true,
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
groupSchema.index({ organizationId: 1, status: 1 });
groupSchema.index({ courseId: 1 });
groupSchema.index({ mainTeacher: 1 });
groupSchema.index({ code: 1 });
groupSchema.index({ startDate: 1, endDate: 1 });

// Generate group code
groupSchema.pre("save", function (next) {
  if (!this.code) {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.code = `GRP-${year}${month}-${random}`;
  }
  next();
});

// Calculate progress percentage
groupSchema.methods.updateProgress = function () {
  if (this.progress.totalLessons > 0) {
    this.progress.percentage = Math.round(
      (this.progress.completedLessons / this.progress.totalLessons) * 100,
    );
  }
};

// Get available slots
groupSchema.methods.getAvailableSlots = function () {
  return (
    this.maxStudents -
    this.currentStudents.filter((s) => s.status === "active").length
  );
};

// Check if group is full
groupSchema.methods.isFull = function () {
  return this.getAvailableSlots() <= 0;
};

module.exports = mongoose.model("Group", groupSchema);
