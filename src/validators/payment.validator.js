const { body, param, query } = require("express-validator");

const createPaymentValidator = [
  body("studentId")
    .notEmpty()
    .withMessage("Student ID is required")
    .isMongoId()
    .withMessage("Invalid student ID"),

  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),

  body("paymentMethod")
    .notEmpty()
    .withMessage("Payment method is required")
    .isIn(["cash", "card", "bank_transfer", "payme", "click", "uzum"])
    .withMessage("Invalid payment method"),

  body("paymentFor.type")
    .notEmpty()
    .withMessage("Payment type is required")
    .isIn(["tuition", "registration", "materials", "exam", "certificate", "other"])
    .withMessage("Invalid payment type"),

  body("paymentFor.groupId")
    .optional()
    .isMongoId()
    .withMessage("Invalid group ID"),

  body("discount.amount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Discount amount must be 0 or positive"),

  body("discount.percentage")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Discount percentage must be between 0 and 100"),
];

const updatePaymentValidator = [
  body("status")
    .optional()
    .isIn(["pending", "completed", "failed", "refunded"])
    .withMessage("Invalid status"),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes must be 500 characters or less"),
];

const refundPaymentValidator = [
  body("amount")
    .notEmpty()
    .withMessage("Refund amount is required")
    .isFloat({ min: 0.01 })
    .withMessage("Refund amount must be greater than 0"),

  body("reason")
    .notEmpty()
    .withMessage("Refund reason is required")
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Reason must be between 3 and 200 characters"),
];

const paymentIdParamValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid payment ID"),
];

const paymentQueryValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("status")
    .optional()
    .isIn(["pending", "completed", "failed", "refunded"])
    .withMessage("Invalid status"),

  query("paymentMethod")
    .optional()
    .isIn(["cash", "card", "bank_transfer", "payme", "click", "uzum"])
    .withMessage("Invalid payment method"),
];

module.exports = {
  createPaymentValidator,
  updatePaymentValidator,
  refundPaymentValidator,
  paymentIdParamValidator,
  paymentQueryValidator,
};
