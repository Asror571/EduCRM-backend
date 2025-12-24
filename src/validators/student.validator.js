const { body, param } = require("express-validator");

const createStudentValidator = [
  body("userId")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("Invalid user ID"),

  body("organizationId")
    .notEmpty()
    .withMessage("Organization ID is required")
    .isMongoId()
    .withMessage("Invalid organization ID"),

  body("dateOfBirth")
    .notEmpty()
    .withMessage("Date of birth is required")
    .isISO8601()
    .withMessage("Invalid date format"),

  body("gender")
    .notEmpty()
    .withMessage("Gender is required")
    .isIn(["male", "female"])
    .withMessage("Gender must be male or female"),

  body("address.city")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("City must be at least 2 characters"),

  body("parentInfo.fatherPhone")
    .optional()
    .matches(/^\+?998[0-9]{9}$/)
    .withMessage("Invalid phone number"),

  body("parentInfo.motherPhone")
    .optional()
    .matches(/^\+?998[0-9]{9}$/)
    .withMessage("Invalid phone number"),
];

const updateStudentValidator = [
  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format"),

  body("gender")
    .optional()
    .isIn(["male", "female"])
    .withMessage("Gender must be male or female"),

  body("status")
    .optional()
    .isIn(["active", "frozen", "completed", "dropped"])
    .withMessage("Invalid status"),

  body("parentInfo.fatherPhone")
    .optional()
    .matches(/^\+?998[0-9]{9}$/)
    .withMessage("Invalid phone number"),

  body("parentInfo.motherPhone")
    .optional()
    .matches(/^\+?998[0-9]{9}$/)
    .withMessage("Invalid phone number"),
];

const enrollStudentValidator = [
  body("groupId")
    .notEmpty()
    .withMessage("Group ID is required")
    .isMongoId()
    .withMessage("Invalid group ID"),
];

const studentIdParamValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid student ID"),
];

module.exports = {
  createStudentValidator,
  updateStudentValidator,
  enrollStudentValidator,
  studentIdParamValidator,
};
