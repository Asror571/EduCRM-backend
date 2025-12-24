const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    teacherId: {
      type: String,
      required: true,
      unique: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    // Professional Information
    specialization: [
      {
        type: String,
        required: true,
      },
    ],
    education: [
      {
        degree: String,
        institution: String,
        fieldOfStudy: String,
        graduationYear: Number,
      },
    ],
    certifications: [
      {
        name: String,
        issuingOrganization: String,
        issueDate: Date,
        expiryDate: Date,
        credentialId: String,
      },
    ],

    // Experience
    experience: {
      years: {
        type: Number,
        default: 0,
      },
      previousInstitutions: [
        {
          name: String,
          position: String,
          startDate: Date,
          endDate: Date,
          description: String,
        },
      ],
    },

    // Employment
    employmentDate: {
      type: Date,
      default: Date.now,
    },
    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "freelance"],
      default: "full-time",
    },
    contractNumber: String,
    contractStartDate: Date,
    contractEndDate: Date,

    // Salary
    salary: {
      baseSalary: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        default: "UZS",
      },
      paymentFrequency: {
        type: String,
        enum: ["monthly", "bi-weekly", "weekly", "hourly"],
        default: "monthly",
      },
      bonuses: [
        {
          amount: Number,
          reason: String,
          date: Date,
        },
      ],
      deductions: [
        {
          amount: Number,
          reason: String,
          date: Date,
        },
      ],
    },

    // Schedule
    availableDays: [
      {
        type: String,
        enum: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ],
      },
    ],
    maxHoursPerWeek: {
      type: Number,
      default: 40,
    },

    // Current workload
    currentGroups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
      },
    ],
    currentStudents: {
      type: Number,
      default: 0,
    },
    weeklyHours: {
      type: Number,
      default: 0,
    },

    // Performance
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    reviews: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        comment: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Attendance
    attendance: {
      totalClasses: { type: Number, default: 0 },
      conductedClasses: { type: Number, default: 0 },
      missedClasses: { type: Number, default: 0 },
      lateClasses: { type: Number, default: 0 },
    },

    // Documents
    documents: [
      {
        type: {
          type: String,
          enum: ["passport", "diploma", "certificate", "contract", "other"],
        },
        fileName: String,
        fileUrl: String,
        uploadDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Additional
    bio: {
      type: String,
      maxlength: 1000,
    },
    skills: [String],
    languages: [
      {
        language: String,
        proficiency: {
          type: String,
          enum: ["beginner", "intermediate", "advanced", "native"],
        },
      },
    ],
    notes: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
teacherSchema.index({ teacherId: 1 });
teacherSchema.index({ organizationId: 1, isActive: 1 });
teacherSchema.index({ userId: 1 });
teacherSchema.index({ specialization: 1 });

// Virtual populate
teacherSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

// Calculate average rating
teacherSchema.methods.updateRating = function () {
  if (this.reviews.length > 0) {
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    this.rating.average = sum / this.reviews.length;
    this.rating.count = this.reviews.length;
  }
};

module.exports = mongoose.model("Teacher", teacherSchema);
