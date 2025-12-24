const mongoose = require("mongoose");
const { SUBSCRIPTION_PLANS } = require("../config/constants");

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
      unique: true,
      maxlength: [100, "Organization name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
    },
    address: {
      street: String,
      city: String,
      region: String,
      country: { type: String, default: "Uzbekistan" },
      postalCode: String,
    },
    logo: {
      type: String,
      default: null,
    },
    website: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    // Subscription
    subscription: {
      plan: {
        type: String,
        enum: Object.values(SUBSCRIPTION_PLANS),
        default: SUBSCRIPTION_PLANS.FREE,
      },
      startDate: {
        type: Date,
        default: Date.now,
      },
      endDate: {
        type: Date,
        required: function () {
          return this.subscription.plan !== SUBSCRIPTION_PLANS.FREE;
        },
      },
      isActive: {
        type: Boolean,
        default: true,
      },
      maxStudents: {
        type: Number,
        default: 50,
      },
      maxTeachers: {
        type: Number,
        default: 5,
      },
    },

    // Settings
    settings: {
      currency: {
        type: String,
        default: "UZS",
      },
      language: {
        type: String,
        default: "uz",
        enum: ["uz", "ru", "en"],
      },
      timezone: {
        type: String,
        default: "Asia/Tashkent",
      },
      weekStartDay: {
        type: String,
        default: "monday",
        enum: ["sunday", "monday"],
      },
      academicYear: {
        startMonth: { type: Number, default: 9 },
        endMonth: { type: Number, default: 6 },
      },
    },

    // Business hours
    businessHours: [
      {
        day: {
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
        openTime: String,
        closeTime: String,
        isClosed: { type: Boolean, default: false },
      },
    ],

    // Contact person
    contactPerson: {
      name: String,
      position: String,
      phone: String,
      email: String,
    },

    // Financial settings
    financialSettings: {
      taxRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      lateFeePerDay: {
        type: Number,
        default: 0,
      },
      gracePeriodDays: {
        type: Number,
        default: 3,
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Statistics (cached)
    stats: {
      totalStudents: { type: Number, default: 0 },
      activeStudents: { type: Number, default: 0 },
      totalTeachers: { type: Number, default: 0 },
      totalCourses: { type: Number, default: 0 },
      totalGroups: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
organizationSchema.index({ slug: 1 });
organizationSchema.index({ email: 1 });
organizationSchema.index({ "subscription.plan": 1 });

// Generate slug before saving
organizationSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
  }
  next();
});

module.exports = mongoose.model("Organization", organizationSchema);
