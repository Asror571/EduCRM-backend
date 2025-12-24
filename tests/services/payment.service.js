const { Payment, Student } = require("../models");
const { generateReceiptNumber } = require("../utils/generators");
const logger = require("../utils/logger");

/**
 * Process payment
 */
const processPayment = async (paymentData, collectedBy) => {
  try {
    // Generate receipt number
    const receiptNumber = generateReceiptNumber();

    // Calculate net amount
    const netAmount =
      paymentData.amount -
      (paymentData.discount?.amount || 0) +
      (paymentData.lateFee?.amount || 0);

    // Create payment
    const payment = await Payment.create({
      ...paymentData,
      receiptNumber,
      collectedBy,
      status: "completed",
    });

    // Update student's financial data
    await updateStudentFinancials(paymentData.studentId, netAmount);

    logger.info(`Payment processed: ${payment.receiptNumber}`);

    return payment;
  } catch (error) {
    logger.error("Error processing payment:", error);
    throw error;
  }
};

/**
 * Update student financials
 */
const updateStudentFinancials = async (studentId, amount) => {
  try {
    const student = await Student.findById(studentId);

    if (!student) {
      throw new Error("Student not found");
    }

    // Update total paid
    student.totalPaid += amount;

    // Update debt
    student.totalDebt = Math.max(0, student.totalDebt - amount);

    await student.save();

    return student;
  } catch (error) {
    logger.error("Error updating student financials:", error);
    throw error;
  }
};

/**
 * Calculate monthly fee for student
 */
const calculateMonthlyFee = async (studentId) => {
  try {
    const { Group } = require("../models");

    const student = await Student.findById(studentId);

    if (!student) {
      throw new Error("Student not found");
    }

    let totalFee = 0;

    // Get all active groups for student
    for (const groupId of student.currentGroups) {
      const group = await Group.findById(groupId);
      if (group && group.status === "active") {
        totalFee += group.pricing.monthlyFee;
      }
    }

    return totalFee;
  } catch (error) {
    logger.error("Error calculating monthly fee:", error);
    throw error;
  }
};

/**
 * Calculate late fee
 */
const calculateLateFee = async (studentId, daysLate, _baseFee) => {
  try {
    const { Organization } = require("../models");
    const student = await Student.findById(studentId);

    if (!student) {
      throw new Error("Student not found");
    }

    const organization = await Organization.findById(student.organizationId);

    if (!organization) {
      throw new Error("Organization not found");
    }

    // Check grace period
    if (daysLate <= organization.financialSettings.gracePeriodDays) {
      return {
        amount: 0,
        daysLate: 0,
      };
    }

    // Calculate late fee
    const actualDaysLate =
      daysLate - organization.financialSettings.gracePeriodDays;
    const lateFeePerDay = organization.financialSettings.lateFeePerDay;
    const lateFeeAmount = actualDaysLate * lateFeePerDay;

    return {
      amount: lateFeeAmount,
      daysLate: actualDaysLate,
    };
  } catch (error) {
    logger.error("Error calculating late fee:", error);
    throw error;
  }
};

/**
 * Process refund
 */
const processRefund = async (paymentId, refundData, refundedBy) => {
  try {
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.status === "refunded") {
      throw new Error("Payment already refunded");
    }

    // Update payment
    payment.status = "refunded";
    payment.refund = {
      amount: refundData.amount,
      reason: refundData.reason,
      refundedBy,
      refundDate: new Date(),
    };

    await payment.save();

    // Update student financials (subtract refund)
    const student = await Student.findById(payment.studentId);
    student.totalPaid -= refundData.amount;
    student.totalDebt += refundData.amount;
    await student.save();

    logger.info(`Payment refunded: ${payment.receiptNumber}`);

    return payment;
  } catch (error) {
    logger.error("Error processing refund:", error);
    throw error;
  }
};

/**
 * Get payment history
 */
const getPaymentHistory = async (studentId, options = {}) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, status } = options;

    const query = { studentId };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) {query.paymentDate.$gte = new Date(startDate);}
      if (endDate) {query.paymentDate.$lte = new Date(endDate);}
    }

    const payments = await Payment.find(query)
      .sort({ paymentDate: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate("collectedBy", "firstName lastName")
      .populate("paymentFor.groupId", "name");

    const total = await Payment.countDocuments(query);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Error getting payment history:", error);
    throw error;
  }
};

/**
 * Get payment statistics
 */
const getPaymentStatistics = async (organizationId, startDate, endDate) => {
  try {
    const matchQuery = {
      organizationId,
      status: "completed",
    };

    if (startDate || endDate) {
      matchQuery.paymentDate = {};
      if (startDate) {matchQuery.paymentDate.$gte = new Date(startDate);}
      if (endDate) {matchQuery.paymentDate.$lte = new Date(endDate);}
    }

    const stats = await Payment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalDiscount: { $sum: "$discount.amount" },
          totalLateFee: { $sum: "$lateFee.amount" },
          totalPayments: { $sum: 1 },
          averagePayment: { $avg: "$amount" },
        },
      },
    ]);

    // Payment methods breakdown
    const paymentMethods = await Payment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
        },
      },
    ]);

    return {
      summary: stats[0] || {
        totalAmount: 0,
        totalDiscount: 0,
        totalLateFee: 0,
        totalPayments: 0,
        averagePayment: 0,
      },
      byMethod: paymentMethods,
    };
  } catch (error) {
    logger.error("Error getting payment statistics:", error);
    throw error;
  }
};

module.exports = {
  processPayment,
  updateStudentFinancials,
  calculateMonthlyFee,
  calculateLateFee,
  processRefund,
  getPaymentHistory,
  getPaymentStatistics,
};
