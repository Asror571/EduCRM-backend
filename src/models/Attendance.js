const mongoose = require("mongoose");
const { ATTENDANCE_STATUS } = require("../config/constants");

const attendanceSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },

    // Date and time
    date: {
      type: Date,
      required: true,
    },
    lessonNumber: {
      type: Number,
      required: true,
    },

    // Attendance status
    status: {
      type: String,
      enum: Object.values(ATTENDANCE_STATUS),
      required: true,
      default: ATTENDANCE_STATUS.PRESENT,
    },

    // Late arrival
    arrivedLate: {
      type: Boolean,
      default: false,
    },
    minutesLate: {
      type: Number,
      default: 0,
    },

    // Early departure
    leftEarly: {
      type: Boolean,
      default: false,
    },
    minutesEarly: {
      type: Number,
      default: 0,
    },

    // Excuse
    excuseReason: {
      type: String,
      maxlength: 500,
    },
    excuseDocument: String,

    // Marked by
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },

    // Modified
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    modifiedAt: Date,
    modificationReason: String,

    // Notes
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
attendanceSchema.index({ organizationId: 1, date: 1 });
attendanceSchema.index({ groupId: 1, date: 1 });
attendanceSchema.index({ studentId: 1, date: 1 });
attendanceSchema.index({ teacherId: 1, date: 1 });

// Compound unique index
attendanceSchema.index(
  { groupId: 1, studentId: 1, date: 1, lessonNumber: 1 },
  { unique: true },
);

module.exports = mongoose.model("Attendance", attendanceSchema);
