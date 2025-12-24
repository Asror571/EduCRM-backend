const asyncHandler = require("express-async-handler");
const { Payment, Student } = require("../models");
const {
  successResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse,
  paginatedResponse,
} = require("../utils/apiResponse");
const paymentService = require("../services/payment.service");
const { sendPaymentReceiptEmail } = require("../services/email.service");
const { sendPaymentReceiptSMS } = require("../services/sms.service");
const logger = require("../utils/logger");

/**
 * @desc    Get all payments
 * @route   GET /api/v1/payments
 * @access  Private/Admin
 */
const getAllPayments = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    paymentMethod,
    startDate,
    endDate,
    studentId,
    search,
  } = req.query;

  const query = { organizationId: req.user.organizationId };

  if (status) {query.status = status;}
  if (paymentMethod) {query.paymentMethod = paymentMethod;}
  if (studentId) {query.studentId = studentId;}

  if (startDate || endDate) {
    query.paymentDate = {};
    if (startDate) {query.paymentDate.$gte = new Date(startDate);}
    if (endDate) {query.paymentDate.$lte = new Date(endDate);}
  }

  if (search) {
    query.receiptNumber = { $regex: search, $options: "i" };
  }

  const payments = await Payment.find(query)
    .populate("studentId", "userId studentId")
    .populate({
      path: "studentId",
      populate: {
        path: "userId",
        select: "firstName lastName phone",
      },
    })
    .populate("collectedBy", "firstName lastName")
    .populate("paymentFor.groupId", "name")
    .sort({ paymentDate: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Payment.countDocuments(query);

  return paginatedResponse(
    res,
    payments,
    page,
    limit,
    total,
    "Payments retrieved successfully",
  );
});

/**
 * @desc    Get payment by ID
 * @route   GET /api/v1/payments/:id
 * @access  Private
 */
const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate("studentId")
    .populate({
      path: "studentId",
      populate: {
        path: "userId",
        select: "firstName lastName email phone",
      },
    })
    .populate("collectedBy", "firstName lastName")
    .populate("paymentFor.groupId", "name code");

  if (!payment) {
    return notFoundResponse(res, "Payment not found");
  }

  // Check access for students
  if (req.user.role === "student") {
    const student = await require("../models/Student").findOne({
      userId: req.user._id,
    });
    if (
      !student ||
      payment.studentId._id.toString() !== student._id.toString()
    ) {
      return notFoundResponse(res, "Payment not found");
    }
  }

  return successResponse(res, "Payment retrieved successfully", payment);
});

/**
 * @desc    Create payment
 * @route   POST /api/v1/payments
 * @access  Private/Admin/Accountant
 */
const createPayment = asyncHandler(async (req, res) => {
  const paymentData = {
    ...req.body,
    organizationId: req.user.organizationId,
  };

  // Verify student exists
  const student = await Student.findById(paymentData.studentId).populate(
    "userId",
  );

  if (!student) {
    return notFoundResponse(res, "Student not found");
  }

  // Process payment using service
  const payment = await paymentService.processPayment(
    paymentData,
    req.user._id,
  );

  await payment.populate([
    {
      path: "studentId",
      populate: {
        path: "userId",
        select: "firstName lastName email phone",
      },
    },
    { path: "collectedBy", select: "firstName lastName" },
    { path: "paymentFor.groupId", select: "name" },
  ]);

  // Send receipt via email and SMS
  try {
    await sendPaymentReceiptEmail(student, payment);
    await sendPaymentReceiptSMS(student, payment);
  } catch (error) {
    logger.error("Error sending payment receipt:", error);
  }

  return createdResponse(res, "Payment created successfully", payment);
});

/**
 * @desc    Update payment
 * @route   PUT /api/v1/payments/:id
 * @access  Private/Admin
 */
const updatePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    return notFoundResponse(res, "Payment not found");
  }

  if (
    payment.organizationId.toString() !== req.user.organizationId.toString()
  ) {
    return notFoundResponse(res, "Payment not found");
  }

  // Can't update completed payments (except notes)
  if (
    payment.status === "completed" &&
    Object.keys(req.body).some((key) => key !== "notes")
  ) {
    return badRequestResponse(res, "Cannot update completed payment");
  }

  const { status, notes, verifiedBy } = req.body;

  if (status) {payment.status = status;}
  if (notes) {payment.notes = notes;}
  if (verifiedBy) {
    payment.verifiedBy = verifiedBy;
    payment.verifiedAt = new Date();
  }

  await payment.save();

  return successResponse(res, "Payment updated successfully", payment);
});

/**
 * @desc    Delete payment
 * @route   DELETE /api/v1/payments/:id
 * @access  Private/Admin
 */
const deletePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    return notFoundResponse(res, "Payment not found");
  }

  if (
    payment.organizationId.toString() !== req.user.organizationId.toString()
  ) {
    return notFoundResponse(res, "Payment not found");
  }

  // Can't delete completed payments
  if (payment.status === "completed") {
    return badRequestResponse(
      res,
      "Cannot delete completed payment. Please use refund instead.",
    );
  }

  await payment.deleteOne();

  return successResponse(res, "Payment deleted successfully");
});

/**
 * @desc    Refund payment
 * @route   POST /api/v1/payments/:id/refund
 * @access  Private/Admin
 */
const refundPayment = asyncHandler(async (req, res) => {
  const { amount, reason } = req.body;

  const payment = await Payment.findById(req.params.id)
    .populate("studentId")
    .populate({
      path: "studentId",
      populate: {
        path: "userId",
      },
    });

  if (!payment) {
    return notFoundResponse(res, "Payment not found");
  }

  if (payment.status !== "completed") {
    return badRequestResponse(res, "Can only refund completed payments");
  }

  if (amount > payment.amount) {
    return badRequestResponse(
      res,
      "Refund amount cannot exceed payment amount",
    );
  }

  // Process refund
  const refundedPayment = await paymentService.processRefund(
    payment._id,
    { amount, reason },
    req.user._id,
  );

  return successResponse(res, "Payment refunded successfully", refundedPayment);
});

/**
 * @desc    Get payment statistics
 * @route   GET /api/v1/payments/statistics
 * @access  Private/Admin
 */
const getPaymentStatistics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const stats = await paymentService.getPaymentStatistics(
    req.user.organizationId,
    startDate,
    endDate,
  );

  return successResponse(
    res,
    "Payment statistics retrieved successfully",
    stats,
  );
});

/**
 * @desc    Get today's payments
 * @route   GET /api/v1/payments/today
 * @access  Private/Admin
 */
const getTodayPayments = asyncHandler(async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const payments = await Payment.find({
    organizationId: req.user.organizationId,
    paymentDate: {
      $gte: todayStart,
      $lte: todayEnd,
    },
  })
    .populate("studentId", "userId studentId")
    .populate({
      path: "studentId",
      populate: {
        path: "userId",
        select: "firstName lastName",
      },
    })
    .populate("collectedBy", "firstName lastName")
    .sort({ paymentDate: -1 });

  const totalAmount = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);

  return successResponse(res, "Today's payments retrieved successfully", {
    payments,
    summary: {
      count: payments.length,
      totalAmount,
      completed: payments.filter((p) => p.status === "completed").length,
      pending: payments.filter((p) => p.status === "pending").length,
    },
  });
});

/**
 * @desc    Get pending payments
 * @route   GET /api/v1/payments/pending
 * @access  Private/Admin
 */
const getPendingPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({
    organizationId: req.user.organizationId,
    status: "pending",
  })
    .populate("studentId", "userId studentId")
    .populate({
      path: "studentId",
      populate: {
        path: "userId",
        select: "firstName lastName phone",
      },
    })
    .sort({ paymentDate: -1 });

  return successResponse(
    res,
    "Pending payments retrieved successfully",
    payments,
  );
});

/**
 * @desc    Verify cash payment
 * @route   POST /api/v1/payments/:id/verify
 * @access  Private/Admin
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    return notFoundResponse(res, "Payment not found");
  }

  if (payment.status !== "pending") {
    return badRequestResponse(res, "Payment is not pending verification");
  }

  payment.status = "completed";
  payment.verifiedBy = req.user._id;
  payment.verifiedAt = new Date();
  await payment.save();

  // Update student financials
  await paymentService.updateStudentFinancials(
    payment.studentId,
    payment.amount,
  );

  return successResponse(res, "Payment verified successfully", payment);
});

/**
 * @desc    Get payment receipt
 * @route   GET /api/v1/payments/:id/receipt
 * @access  Private
 */
const getPaymentReceipt = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate("studentId")
    .populate({
      path: "studentId",
      populate: {
        path: "userId organizationId",
        select: "firstName lastName email phone name address",
      },
    })
    .populate("collectedBy", "firstName lastName")
    .populate("paymentFor.groupId", "name");

  if (!payment) {
    return notFoundResponse(res, "Payment not found");
  }

  // Check access for students
  if (req.user.role === "student") {
    const student = await require("../models/Student").findOne({
      userId: req.user._id,
    });
    if (
      !student ||
      payment.studentId._id.toString() !== student._id.toString()
    ) {
      return notFoundResponse(res, "Payment not found");
    }
  }

  const receipt = {
    receiptNumber: payment.receiptNumber,
    date: payment.paymentDate,
    organization: {
      name: payment.studentId.organizationId.name,
      address: payment.studentId.organizationId.address,
    },
    student: {
      name: `${payment.studentId.userId.firstName} ${payment.studentId.userId.lastName}`,
      studentId: payment.studentId.studentId,
      phone: payment.studentId.userId.phone,
    },
    payment: {
      amount: payment.amount,
      discount: payment.discount.amount,
      lateFee: payment.lateFee.amount,
      netAmount: payment.netAmount,
      method: payment.paymentMethod,
      description: payment.paymentFor.description,
      group: payment.paymentFor.groupId?.name,
    },
    collectedBy: `${payment.collectedBy.firstName} ${payment.collectedBy.lastName}`,
  };

  return successResponse(
    res,
    "Payment receipt retrieved successfully",
    receipt,
  );
});

/**
 * @desc    Calculate student monthly fee
 * @route   GET /api/v1/payments/calculate-fee/:studentId
 * @access  Private/Admin
 */
const calculateMonthlyFee = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findById(studentId);
  if (!student) {
    return notFoundResponse(res, "Student not found");
  }

  const monthlyFee = await paymentService.calculateMonthlyFee(studentId);

  return successResponse(res, "Monthly fee calculated successfully", {
    studentId,
    monthlyFee,
    currentDebt: student.totalDebt,
  });
});

/**
 * @desc    Get overdue payments
 * @route   GET /api/v1/payments/overdue
 * @access  Private/Admin
 */
const getOverduePayments = asyncHandler(async (req, res) => {
  const students = await Student.find({
    organizationId: req.user.organizationId,
    status: "active",
    totalDebt: { $gt: 0 },
  })
    .populate("userId", "firstName lastName phone")
    .populate("currentGroups", "name");

  const overdueList = [];

  for (const student of students) {
    // Get last payment
    const lastPayment = await Payment.findOne({
      studentId: student._id,
      status: "completed",
    }).sort({ paymentDate: -1 });

    if (lastPayment) {
      const daysSincePayment = Math.floor(
        (Date.now() - lastPayment.paymentDate) / (1000 * 60 * 60 * 24),
      );

      if (daysSincePayment > 30) {
        // Overdue if more than 30 days
        overdueList.push({
          student: {
            id: student._id,
            name: `${student.userId.firstName} ${student.userId.lastName}`,
            phone: student.userId.phone,
            studentId: student.studentId,
          },
          debt: student.totalDebt,
          lastPaymentDate: lastPayment.paymentDate,
          daysOverdue: daysSincePayment,
          groups: student.currentGroups,
        });
      }
    }
  }

  // Sort by days overdue
  overdueList.sort((a, b) => b.daysOverdue - a.daysOverdue);

  return successResponse(res, "Overdue payments retrieved successfully", {
    count: overdueList.length,
    totalDebt: overdueList.reduce((sum, item) => sum + item.debt, 0),
    overduePayments: overdueList,
  });
});

module.exports = {
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
};
