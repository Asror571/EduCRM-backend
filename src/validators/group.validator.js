const { body, param } = require("express-validator");

const createGroupValidator = [
  body("name")
    .notEmpty()
    .withMessage("Group name is required")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Group name must be between 2 and 100 characters"),

  body("code")
    .notEmpty()
    .withMessage("Group code is required")
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage("Group code must be between 2 and 20 characters"),

  body("courseId")
    .notEmpty()
    .withMessage("Course ID is required")
    .isMongoId()
    .withMessage("Invalid course ID"),

  body("teacherId")
    .notEmpty()
    .withMessage("Teacher ID is required")
    .isMongoId()
    .withMessage("Invalid teacher ID"),

  body("level")
    .optional()
    .isIn([
      "beginner",
      "elementary",
      "pre_intermediate",
      "intermediate",
      "upper_intermediate",
      "advanced",
      "proficiency",
    ])
    .withMessage("Invalid level"),

  body("startDate")
    .notEmpty()
    .withMessage("Start date is required")
    .isISO8601()
    .withMessage("Invalid start date format"),

  body("endDate")
    .notEmpty()
    .withMessage("End date is required")
    .isISO8601()
    .withMessage("Invalid end date format"),

  body("maxStudents")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Max students must be at least 1"),

  body("pricing.monthlyFee")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Monthly fee must be 0 or positive"),

  body("schedule")
    .optional()
    .isArray()
    .withMessage("Schedule must be an array"),
];

const updateGroupValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Group name must be between 2 and 100 characters"),

  body("status")
    .optional()
    .isIn(["planned", "active", "completed", "cancelled"])
    .withMessage("Invalid status"),

  body("level")
    .optional()
    .isIn([
      "beginner",
      "elementary",
      "pre_intermediate",
      "intermediate",
      "upper_intermediate",
      "advanced",
      "proficiency",
    ])
    .withMessage("Invalid level"),

  body("maxStudents")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Max students must be at least 1"),

  body("pricing.monthlyFee")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Monthly fee must be 0 or positive"),
];

const groupIdParamValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid group ID"),
];

module.exports = {
  createGroupValidator,
  updateGroupValidator,
  groupIdParamValidator,
};
