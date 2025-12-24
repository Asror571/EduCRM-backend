const asyncHandler = require("express-async-handler");
const { successResponse } = require("../utils/apiResponse");
const reportService = require("../services/report.service");
const { formatDate } = require("../utils/dateHelpers");

/**
 * @desc    Generate financial report
 * @route   GET /api/v1/reports/financial
 * @access  Private/Admin
 */
const getFinancialReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: "Start date and end date are required",
    });
  }

  const report = await reportService.generateFinancialReport(
    req.user.organizationId,
    startDate,
    endDate,
  );

  return successResponse(
    res,
    "Financial report generated successfully",
    report,
  );
});

/**
 * @desc    Generate student report
 * @route   GET /api/v1/reports/students
 * @access  Private/Admin
 */
const getStudentReport = asyncHandler(async (req, res) => {
  const report = await reportService.generateStudentReport(
    req.user.organizationId,
  );

  return successResponse(res, "Student report generated successfully", report);
});

/**
 * @desc    Generate teacher report
 * @route   GET /api/v1/reports/teachers
 * @access  Private/Admin
 */
const getTeacherReport = asyncHandler(async (req, res) => {
  const report = await reportService.generateTeacherReport(
    req.user.organizationId,
  );

  return successResponse(res, "Teacher report generated successfully", report);
});

/**
 * @desc    Generate attendance report
 * @route   GET /api/v1/reports/attendance
 * @access  Private/Admin
 */
const getAttendanceReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupId } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: "Start date and end date are required",
    });
  }

  const report = await reportService.generateAttendanceReport(
    req.user.organizationId,
    startDate,
    endDate,
    groupId,
  );

  return successResponse(
    res,
    "Attendance report generated successfully",
    report,
  );
});

/**
 * @desc    Generate lead report
 * @route   GET /api/v1/reports/leads
 * @access  Private/Admin
 */
const getLeadReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: "Start date and end date are required",
    });
  }

  const report = await reportService.generateLeadReport(
    req.user.organizationId,
    startDate,
    endDate,
  );

  return successResponse(res, "Lead report generated successfully", report);
});

/**
 * @desc    Generate custom report
 * @route   POST /api/v1/reports/custom
 * @access  Private/Admin
 */
const generateCustomReport = asyncHandler(async (req, res) => {
  const { reportType, filters, fields } = req.body;

  // This is a placeholder for custom report generation
  // You can implement specific logic based on reportType

  return successResponse(res, "Custom report generated successfully", {
    reportType,
    filters,
    fields,
    message:
      "Custom report generation will be implemented based on specific requirements",
  });
});

/**
 * @desc    Export report
 * @route   GET /api/v1/reports/export/:type
 * @access  Private/Admin
 */
const exportReport = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { format = "pdf", startDate, endDate } = req.query;

  // This is a placeholder for report export functionality
  // You would typically use libraries like:
  // - pdfkit or puppeteer for PDF
  // - xlsx or exceljs for Excel
  // - json2csv for CSV

  return successResponse(res, "Report export initiated", {
    type,
    format,
    startDate,
    endDate,
    message:
      "Report export functionality will be implemented based on format requirements",
  });
});

/**
 * @desc    Get monthly summary
 * @route   GET /api/v1/reports/monthly-summary
 * @access  Private/Admin
 */
const getMonthlySummary = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const organizationId = req.user.organizationId;

  const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
  const currentYear = year ? parseInt(year) : new Date().getFullYear();

  const startDate = new Date(currentYear, currentMonth - 1, 1);
  const endDate = new Date(currentYear, currentMonth, 0);

  // Financial
  const { Payment, Student, Lead, Group } = require("../models");

  const revenue = await Payment.aggregate([
    {
      $match: {
        organizationId,
        status: "completed",
        paymentDate: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Students
  const newStudents = await Student.countDocuments({
    organizationId,
    enrollmentDate: { $gte: startDate, $lte: endDate },
  });

  const leftStudents = await Student.countDocuments({
    organizationId,
    droppedDate: { $gte: startDate, $lte: endDate },
  });

  // Leads
  const newLeads = await Lead.countDocuments({
    organizationId,
    createdAt: { $gte: startDate, $lte: endDate },
  });

  const convertedLeads = await Lead.countDocuments({
    organizationId,
    "enrollmentStatus.enrolledDate": { $gte: startDate, $lte: endDate },
  });

  // Groups
  const newGroups = await Group.countDocuments({
    organizationId,
    startDate: { $gte: startDate, $lte: endDate },
  });

  const completedGroups = await Group.countDocuments({
    organizationId,
    status: "completed",
    endDate: { $gte: startDate, $lte: endDate },
  });

  return successResponse(res, "Monthly summary retrieved successfully", {
    period: {
      month: currentMonth,
      year: currentYear,
      start: formatDate(startDate),
      end: formatDate(endDate),
    },
    financial: {
      revenue: revenue[0]?.total || 0,
      payments: revenue[0]?.count || 0,
    },
    students: {
      new: newStudents,
      left: leftStudents,
      netGrowth: newStudents - leftStudents,
    },
    leads: {
      new: newLeads,
      converted: convertedLeads,
      conversionRate:
        newLeads > 0 ? ((convertedLeads / newLeads) * 100).toFixed(2) : 0,
    },
    groups: {
      new: newGroups,
      completed: completedGroups,
    },
  });
});

/**
 * @desc    Get year comparison
 * @route   GET /api/v1/reports/year-comparison
 * @access  Private/Admin
 */
const getYearComparison = asyncHandler(async (req, res) => {
  const { year1, year2 } = req.query;
  const organizationId = req.user.organizationId;

  const firstYear = year1 ? parseInt(year1) : new Date().getFullYear() - 1;
  const secondYear = year2 ? parseInt(year2) : new Date().getFullYear();

  const { Payment, Student } = require("../models");

  // Revenue comparison
  const revenue1 = await Payment.aggregate([
    {
      $match: {
        organizationId,
        status: "completed",
        paymentDate: {
          $gte: new Date(firstYear, 0, 1),
          $lte: new Date(firstYear, 11, 31),
        },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  const revenue2 = await Payment.aggregate([
    {
      $match: {
        organizationId,
        status: "completed",
        paymentDate: {
          $gte: new Date(secondYear, 0, 1),
          $lte: new Date(secondYear, 11, 31),
        },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  // Students comparison
  const students1 = await Student.countDocuments({
    organizationId,
    enrollmentDate: {
      $gte: new Date(firstYear, 0, 1),
      $lte: new Date(firstYear, 11, 31),
    },
  });

  const students2 = await Student.countDocuments({
    organizationId,
    enrollmentDate: {
      $gte: new Date(secondYear, 0, 1),
      $lte: new Date(secondYear, 11, 31),
    },
  });

  const revenueGrowth = revenue1[0]?.total
    ? (
      (((revenue2[0]?.total || 0) - revenue1[0].total) / revenue1[0].total) *
        100
    ).toFixed(2)
    : 0;

  const studentGrowth = students1
    ? (((students2 - students1) / students1) * 100).toFixed(2)
    : 0;

  return successResponse(res, "Year comparison retrieved successfully", {
    comparison: [
      {
        year: firstYear,
        revenue: revenue1[0]?.total || 0,
        students: students1,
      },
      {
        year: secondYear,
        revenue: revenue2[0]?.total || 0,
        students: students2,
      },
    ],
    growth: {
      revenue: {
        percentage: revenueGrowth,
        amount: (revenue2[0]?.total || 0) - (revenue1[0]?.total || 0),
      },
      students: {
        percentage: studentGrowth,
        count: students2 - students1,
      },
    },
  });
});

module.exports = {
  getFinancialReport,
  getStudentReport,
  getTeacherReport,
  getAttendanceReport,
  getLeadReport,
  generateCustomReport,
  exportReport,
  getMonthlySummary,
  getYearComparison,
};
