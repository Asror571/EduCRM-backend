const mongoose = require("mongoose");
const { PAYMENT_STATUS, PAYMENT_METHODS } = require("../config/constants");

const paymentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    // Payment details
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: 0,
    },
    currency: {
      type: String,
      default: "UZS",
    },

    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },

    // Receipt
    receiptNumber: {
      type: String,
      unique: true,
      required: true,
    },

    // For what this payment is
    paymentFor: {
      type: {
        type: String,
        enum: [
          "tuition",
          "registration",
          "materials",
          "exam",
          "certificate",
          "other",
        ],
        required: true,
      },
      description: String,
      groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
      },
      courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
      month: String,
      year: Number,
    },

    // Dates
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
    },

    // Discount
    discount: {
      amount: {
        type: Number,
        default: 0,
      },
      percentage: {
        type: Number,
        default: 0,
      },
      reason: String,
    },

    // Late fee
    lateFee: {
      amount: {
        type: Number,
        default: 0,
      },
      daysLate: {
        type: Number,
        default: 0,
      },
    },

    // Transaction
    transactionId: String,

    // Online payment details
    onlinePayment: {
      provider: {
        type: String,
        enum: ["payme", "click", "uzum", "other"],
      },
      transactionId: String,
      transactionDate: Date,
      confirmationCode: String,
    },

    // Collected by
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Verified by (for cash payments)
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: Date,

    // Notes
    notes: {
      type: String,
      maxlength: 500,
    },

    // Refund (if applicable)
    refund: {
      amount: Number,
      reason: String,
      refundedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      refundDate: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
paymentSchema.index({ organizationId: 1, studentId: 1 });
paymentSchema.index({ receiptNumber: 1 });
paymentSchema.index({ paymentDate: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ "paymentFor.groupId": 1 });

// Calculate net amount (after discount and including late fee)
paymentSchema.virtual("netAmount").get(function () {
  return this.amount - this.discount.amount + this.lateFee.amount;
});

module.exports = mongoose.model("Payment", paymentSchema);
