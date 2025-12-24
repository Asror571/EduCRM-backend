const mongoose = require("mongoose");
const { COURSE_LEVELS } = require("../config/constants");

const courseSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    name: {
      type: String,
      required: [true, "Course name is required"],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Course description is required"],
      maxlength: 2000,
    },
    shortDescription: {
      type: String,
      maxlength: 200,
    },

    // Course details
    level: {
      type: String,
      enum: Object.values(COURSE_LEVELS),
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },

    // Duration
    duration: {
      value: {
        type: Number,
        required: true,
      },
      unit: {
        type: String,
        enum: ["hours", "days", "weeks", "months"],
        default: "months",
      },
    },
    totalHours: {
      type: Number,
      required: true,
    },
    lessonsPerWeek: {
      type: Number,
      default: 3,
    },
    hoursPerLesson: {
      type: Number,
      default: 2,
    },

    // Pricing
    pricing: {
      basePrice: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        default: "UZS",
      },
      discountedPrice: Number,
      discountPercentage: Number,
      discountValidUntil: Date,
    },

    // Curriculum
    curriculum: [
      {
        module: {
          type: String,
          required: true,
        },
        topics: [String],
        duration: Number,
        order: Number,
      },
    ],

    // Requirements
    prerequisites: [String],
    targetAudience: [String],
    learningOutcomes: [String],

    // Materials
    materials: [
      {
        name: String,
        type: {
          type: String,
          enum: [
            "textbook",
            "workbook",
            "handout",
            "video",
            "audio",
            "software",
            "other",
          ],
        },
        isRequired: {
          type: Boolean,
          default: false,
        },
        cost: Number,
        description: String,
      },
    ],

    // Media
    thumbnail: String,
    images: [String],
    videoUrl: String,

    // Certificate
    certificateTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CertificateTemplate",
    },
    isCertificateProvided: {
      type: Boolean,
      default: true,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },

    // Stats
    stats: {
      totalStudents: { type: Number, default: 0 },
      activeStudents: { type: Number, default: 0 },
      completedStudents: { type: Number, default: 0 },
      totalGroups: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      ratingCount: { type: Number, default: 0 },
    },

    // SEO
    seo: {
      title: String,
      description: String,
      keywords: [String],
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
courseSchema.index({ organizationId: 1, isActive: 1 });
courseSchema.index({ slug: 1 });
courseSchema.index({ category: 1, level: 1 });

// Generate slug
courseSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
  }
  next();
});

module.exports = mongoose.model("Course", courseSchema);
