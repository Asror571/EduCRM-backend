const mongoose = require("mongoose");
const { STUDENT_STATUS } = require("../config/constants");

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    studentId: {
      type: String,
      required: true,
      unique: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    // Personal Information
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },
    address: {
      street: String,
      city: String,
      region: String,
      postalCode: String,
    },
    passportNumber: {
      type: String,
      sparse: true,
    },

    // Parent/Guardian Information
    parentInfo: {
      fatherName: String,
      fatherPhone: String,
      fatherOccupation: String,
      motherName: String,
      motherPhone: String,
      motherOccupation: String,
      guardianName: String,
      guardianPhone: String,
      guardianRelation: String,
    },

    // Emergency Contact
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },

    // Education
    previousEducation: {
      schoolName: String,
      graduationYear: Number,
      specialization: String,
    },

    // Enrollment
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: Object.values(STUDENT_STATUS),
      default: STUDENT_STATUS.ACTIVE,
    },

    // Current Groups
    currentGroups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
      },
    ],

    // Academic
    overallProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    attendance: {
      totalClasses: { type: Number, default: 0 },
      attendedClasses: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
    },

    // Financial
    totalDebt: {
      type: Number,
      default: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
    },

    // Additional
    notes: {
      type: String,
      maxlength: 1000,
    },
    tags: [String],

    // Contract
    contractNumber: String,
    contractDate: Date,
    contractEndDate: Date,

    // Status dates
    frozenDate: Date,
    frozenReason: String,
    completedDate: Date,
    droppedDate: Date,
    droppedReason: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
studentSchema.index({ studentId: 1 });
studentSchema.index({ organizationId: 1, status: 1 });
studentSchema.index({ userId: 1 });
studentSchema.index({ "parentInfo.fatherPhone": 1 });

// Virtual populate
studentSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

// Calculate attendance percentage
studentSchema.methods.updateAttendance = function () {
  if (this.attendance.totalClasses > 0) {
    this.attendance.percentage = Math.round(
      (this.attendance.attendedClasses / this.attendance.totalClasses) * 100,
    );
  }
};

module.exports = mongoose.model("Student", studentSchema);
