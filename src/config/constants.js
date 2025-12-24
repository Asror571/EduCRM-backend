module.exports = {
  // User Roles
  ROLES: {
    SUPERADMIN: "superadmin",
    ADMIN: "admin",
    TEACHER: "teacher",
    STUDENT: "student",
    ACCOUNTANT: "accountant",
    RECEPTIONIST: "receptionist",
  },

  // User Status
  USER_STATUS: {
    ACTIVE: "active",
    INACTIVE: "inactive",
    BLOCKED: "blocked",
    PENDING: "pending",
  },

  // Student Status
  STUDENT_STATUS: {
    ACTIVE: "active",
    FROZEN: "frozen",
    COMPLETED: "completed",
    DROPPED: "dropped",
  },

  // Group Status
  GROUP_STATUS: {
    PLANNED: "planned",
    ACTIVE: "active",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
  },

  // Payment Status
  PAYMENT_STATUS: {
    PENDING: "pending",
    COMPLETED: "completed",
    FAILED: "failed",
    REFUNDED: "refunded",
  },

  // Payment Methods
  PAYMENT_METHODS: {
    CASH: "cash",
    CARD: "card",
    BANK_TRANSFER: "bank_transfer",
    PAYME: "payme",
    CLICK: "click",
    UZUM: "uzum",
  },

  // Lead Status
  LEAD_STATUS: {
    NEW: "new",
    CONTACTED: "contacted",
    TEST_SCHEDULED: "test_scheduled",
    TEST_COMPLETED: "test_completed",
    ENROLLED: "enrolled",
    REJECTED: "rejected",
    LOST: "lost",
  },

  // Lead Sources
  LEAD_SOURCES: {
    WEBSITE: "website",
    PHONE: "phone",
    INSTAGRAM: "instagram",
    FACEBOOK: "facebook",
    TELEGRAM: "telegram",
    REFERRAL: "referral",
    WALK_IN: "walk_in",
    OTHER: "other",
  },

  // Attendance Status
  ATTENDANCE_STATUS: {
    PRESENT: "present",
    ABSENT: "absent",
    LATE: "late",
    EXCUSED: "excused",
  },

  // Course Levels
  COURSE_LEVELS: {
    BEGINNER: "beginner",
    ELEMENTARY: "elementary",
    PRE_INTERMEDIATE: "pre_intermediate",
    INTERMEDIATE: "intermediate",
    UPPER_INTERMEDIATE: "upper_intermediate",
    ADVANCED: "advanced",
    PROFICIENCY: "proficiency",
  },

  // Days of Week
  DAYS_OF_WEEK: {
    MONDAY: "monday",
    TUESDAY: "tuesday",
    WEDNESDAY: "wednesday",
    THURSDAY: "thursday",
    FRIDAY: "friday",
    SATURDAY: "saturday",
    SUNDAY: "sunday",
  },

  // Notification Types
  NOTIFICATION_TYPES: {
    PAYMENT_REMINDER: "payment_reminder",
    CLASS_REMINDER: "class_reminder",
    BIRTHDAY: "birthday",
    ANNOUNCEMENT: "announcement",
    SYSTEM: "system",
  },

  // File Upload
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/jpg", "image/png"],
  ALLOWED_DOCUMENT_TYPES: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],

  // Pagination
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,

  // Date Formats
  DATE_FORMAT: "YYYY-MM-DD",
  DATETIME_FORMAT: "YYYY-MM-DD HH:mm:ss",
  TIME_FORMAT: "HH:mm",

  // Subscription Plans
  SUBSCRIPTION_PLANS: {
    FREE: "free",
    BASIC: "basic",
    STANDARD: "standard",
    PREMIUM: "premium",
    ENTERPRISE: "enterprise",
  },

  // Discount Types
  DISCOUNT_TYPES: {
    PERCENTAGE: "percentage",
    FIXED: "fixed",
  },
};
