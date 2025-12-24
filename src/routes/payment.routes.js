const express = require("express");
const router = express.Router();
const {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  refundPayment,
  getPaymentStatistics,
  getTodayPayments,
  getPendingPayments,
  verifyPayment,
  getPaymentReceipt,
  calculateMonthlyFee,
  getOverduePayments,
} = require("../controllers/payment.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");
const { isAdminOrSuperAdmin } = require("../middlewares/role.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  createPaymentValidator,
  updatePaymentValidator,
  refundPaymentValidator,
} = require("../validators/payment.validator");

router.use(protect);

// Statistics and summaries
router.get("/statistics", isAdminOrSuperAdmin, getPaymentStatistics);
router.get("/today", isAdminOrSuperAdmin, getTodayPayments);
router.get("/pending", isAdminOrSuperAdmin, getPendingPayments);
router.get("/overdue", isAdminOrSuperAdmin, getOverduePayments);

// Calculate fee
router.get(
  "/calculate-fee/:studentId",
  isAdminOrSuperAdmin,
  calculateMonthlyFee,
);

// CRUD operations
router
  .route("/")
  .get(getAllPayments)
  .post(
    authorize("admin", "accountant"),
    createPaymentValidator,
    validate,
    createPayment,
  );

router
  .route("/:id")
  .get(getPaymentById)
  .put(isAdminOrSuperAdmin, updatePaymentValidator, validate, updatePayment)
  .delete(isAdminOrSuperAdmin, deletePayment);

// Payment actions
router.post(
  "/:id/refund",
  isAdminOrSuperAdmin,
  refundPaymentValidator,
  validate,
  refundPayment,
);
router.post("/:id/verify", isAdminOrSuperAdmin, verifyPayment);
router.get("/:id/receipt", getPaymentReceipt);

module.exports = router;
