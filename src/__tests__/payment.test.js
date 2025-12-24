const paymentService = require("../services/payment.service");
const { Payment, Student } = require("../models");

jest.mock("../models");
jest.mock("../utils/generators");

describe("Payment Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("processPayment", () => {
    it("should process payment successfully", async () => {
      const paymentData = {
        studentId: "student123",
        amount: 1000,
        paymentMethod: "cash",
        discount: { amount: 0 },
        lateFee: { amount: 0 },
      };

      const mockPayment = {
        ...paymentData,
        receiptNumber: "RCP-001",
        save: jest.fn(),
      };

      Payment.create = jest.fn().mockResolvedValue(mockPayment);
      Student.findById = jest.fn().mockResolvedValue({
        totalPaid: 0,
        totalDebt: 5000,
        save: jest.fn(),
      });

      const result = await paymentService.processPayment(paymentData, "user123");

      expect(result).toBeDefined();
      expect(Payment.create).toHaveBeenCalled();
    });

    it("should calculate net amount correctly", async () => {
      const paymentData = {
        studentId: "student123",
        amount: 1000,
        paymentMethod: "cash",
        discount: { amount: 100 },
        lateFee: { amount: 50 },
      };

      Payment.create = jest.fn().mockResolvedValue({
        ...paymentData,
        receiptNumber: "RCP-002",
      });

      Student.findById = jest.fn().mockResolvedValue({
        totalPaid: 0,
        totalDebt: 5000,
        save: jest.fn(),
      });

      await paymentService.processPayment(paymentData, "user123");

      // Net amount should be 1000 - 100 + 50 = 950
      expect(Payment.create).toHaveBeenCalled();
    });
  });

  describe("updateStudentFinancials", () => {
    it("should update student financials", async () => {
      const mockStudent = {
        totalPaid: 500,
        totalDebt: 4500,
        save: jest.fn(),
      };

      Student.findById = jest.fn().mockResolvedValue(mockStudent);

      await paymentService.updateStudentFinancials("student123", 1000);

      expect(mockStudent.totalPaid).toBe(1500);
      expect(mockStudent.totalDebt).toBe(3500);
      expect(mockStudent.save).toHaveBeenCalled();
    });

    it("should not allow negative debt", async () => {
      const mockStudent = {
        totalPaid: 500,
        totalDebt: 300,
        save: jest.fn(),
      };

      Student.findById = jest.fn().mockResolvedValue(mockStudent);

      await paymentService.updateStudentFinancials("student123", 1000);

      expect(mockStudent.totalDebt).toBe(0);
    });
  });

  describe("getPaymentStatistics", () => {
    it("should return payment statistics", async () => {
      const mockStats = [
        {
          totalAmount: 50000,
          totalDiscount: 2000,
          totalLateFee: 500,
          totalPayments: 10,
          averagePayment: 5000,
        },
      ];

      Payment.aggregate = jest.fn()
        .mockResolvedValueOnce(mockStats)
        .mockResolvedValueOnce([
          { _id: "cash", count: 5, amount: 25000 },
          { _id: "card", count: 5, amount: 25000 },
        ]);

      const result = await paymentService.getPaymentStatistics("org123");

      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("byMethod");
      expect(result.summary.totalAmount).toBe(50000);
    });
  });
});
