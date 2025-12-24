const {
  Student,
  Teacher,
  Payment,
  Group,
  Lead,
  Attendance,
  Course,
} = require("../models");
const logger = require("../utils/logger");
const {
  getStartOfMonth,
  getEndOfMonth,
} = require("../utils/dateHelpers");

/**
 * Generate dashboard statistics
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Object>} Dashboard statistics
 */
const generateDashboardStats = async (organizationId) => {
  try {
    // Get total students
    const totalStudents = await Student.countDocuments({ organizationId });

    // Get total teachers
    const totalTeachers = await Teacher.countDocuments({ organizationId });

    // Get total groups
    const totalGroups = await Group.countDocuments({ organizationId });

    // Get active groups (started but not ended)
    const activeGroups = await Group.countDocuments({
      organizationId,
      status: "active",
    });

    // Get total revenue (completed payments)
    const revenueResult = await Payment.aggregate([
      {
        $match: {
          organizationId,
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$netAmount" },
        },
      },
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    // Get this month revenue
    const now = new Date();
    const startOfMonth = getStartOfMonth(now);
    const endOfMonth = getEndOfMonth(now);

    const monthlyRevenueResult = await Payment.aggregate([
      {
        $match: {
          organizationId,
          status: "completed",
          createdAt: {
            $gte: startOfMonth,
            $lte: endOfMonth,
          },
        },
      },
      {
        $group: {
          _id: null,
          monthlyRevenue: { $sum: "$netAmount" },
        },
      },
    ]);

    const monthlyRevenue = monthlyRevenueResult[0]?.monthlyRevenue || 0;

    // Get pending payments count
    const pendingPayments = await Payment.countDocuments({
      organizationId,
      status: "pending",
    });

    // Get total leads
    const totalLeads = await Lead.countDocuments({ organizationId });

    // Get new leads this month
    const newLeads = await Lead.countDocuments({
      organizationId,
      createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    });

    // Get total courses
    const totalCourses = await Course.countDocuments({ organizationId });

    logger.info("Dashboard stats generated", {
      organizationId,
      totalStudents,
      totalTeachers,
      totalGroups,
      totalRevenue,
    });

    return {
      students: {
        total: totalStudents,
      },
      teachers: {
        total: totalTeachers,
      },
      groups: {
        total: totalGroups,
        active: activeGroups,
      },
      revenue: {
        total: totalRevenue,
        monthly: monthlyRevenue,
      },
      payments: {
        pending: pendingPayments,
      },
      leads: {
        total: totalLeads,
        newThisMonth: newLeads,
      },
      courses: {
        total: totalCourses,
      },
    };
  } catch (error) {
    logger.error("Error generating dashboard stats", {
      error: error.message,
      organizationId,
    });
    throw error;
  }
};

/**
 * Generate financial report
 * @param {string} organizationId - Organization ID
 * @param {string} startDate - Report start date
 * @param {string} endDate - Report end date
 * @returns {Promise<Object>} Financial report
 */
const generateFinancialReport = async (organizationId, startDate, endDate) => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get total revenue in period
    const revenueResult = await Payment.aggregate([
      {
        $match: {
          organizationId,
          status: "completed",
          createdAt: {
            $gte: start,
            $lte: end,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$netAmount" },
          totalGrossAmount: { $sum: "$grossAmount" },
          totalDiscount: { $sum: "$discount" },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    // Get revenue by payment method
    const byMethodResult = await Payment.aggregate([
      {
        $match: {
          organizationId,
          status: "completed",
          createdAt: {
            $gte: start,
            $lte: end,
          },
        },
      },
      {
        $group: {
          _id: "$paymentMethod",
          amount: { $sum: "$netAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get daily revenue breakdown
    const dailyRevenueResult = await Payment.aggregate([
      {
        $match: {
          organizationId,
          status: "completed",
          createdAt: {
            $gte: start,
            $lte: end,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          amount: { $sum: "$netAmount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const report = {
      period: {
        startDate,
        endDate,
      },
      summary: {
        totalRevenue: revenueResult[0]?.totalRevenue || 0,
        totalGrossAmount: revenueResult[0]?.totalGrossAmount || 0,
        totalDiscount: revenueResult[0]?.totalDiscount || 0,
        transactionCount: revenueResult[0]?.transactionCount || 0,
        averageTransaction:
          (revenueResult[0]?.totalRevenue || 0) /
          (revenueResult[0]?.transactionCount || 1),
      },
      byPaymentMethod: byMethodResult,
      dailyBreakdown: dailyRevenueResult,
    };

    logger.info("Financial report generated", {
      organizationId,
      period: `${startDate} to ${endDate}`,
      totalRevenue: report.summary.totalRevenue,
    });

    return report;
  } catch (error) {
    logger.error("Error generating financial report", {
      error: error.message,
      organizationId,
      startDate,
      endDate,
    });
    throw error;
  }
};

/**
 * Generate student report
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Object>} Student report
 */
const generateStudentReport = async (organizationId) => {
  try {
    // Total students
    const totalStudents = await Student.countDocuments({ organizationId });

    // Students by status
    const byStatusResult = await Student.aggregate([
      {
        $match: { organizationId },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Students with debt
    const withDebtResult = await Student.aggregate([
      {
        $match: {
          organizationId,
          debt: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalDebt: { $sum: "$debt" },
        },
      },
    ]);

    // Students by group
    const byGroupResult = await Group.aggregate([
      {
        $match: { organizationId },
      },
      {
        $group: {
          _id: "$_id",
          groupName: { $first: "$name" },
          studentCount: { $sum: { $size: "$students" } },
        },
      },
      {
        $sort: { studentCount: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    const report = {
      totalStudents,
      byStatus: byStatusResult,
      withDebt: {
        count: withDebtResult[0]?.count || 0,
        totalDebt: withDebtResult[0]?.totalDebt || 0,
      },
      topGroups: byGroupResult,
    };

    logger.info("Student report generated", {
      organizationId,
      totalStudents,
    });

    return report;
  } catch (error) {
    logger.error("Error generating student report", {
      error: error.message,
      organizationId,
    });
    throw error;
  }
};

/**
 * Generate teacher report
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Object>} Teacher report
 */
const generateTeacherReport = async (organizationId) => {
  try {
    // Total teachers
    const totalTeachers = await Teacher.countDocuments({ organizationId });

    // Teachers by status
    const byStatusResult = await Teacher.aggregate([
      {
        $match: { organizationId },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Top teachers by groups
    const topTeachersResult = await Group.aggregate([
      {
        $match: { organizationId },
      },
      {
        $group: {
          _id: "$teacherId",
          groupCount: { $sum: 1 },
          totalStudents: { $sum: { $size: "$students" } },
        },
      },
      {
        $sort: { groupCount: -1 },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: "teachers",
          localField: "_id",
          foreignField: "_id",
          as: "teacher",
        },
      },
    ]);

    const report = {
      totalTeachers,
      byStatus: byStatusResult,
      topTeachers: topTeachersResult,
    };

    logger.info("Teacher report generated", {
      organizationId,
      totalTeachers,
    });

    return report;
  } catch (error) {
    logger.error("Error generating teacher report", {
      error: error.message,
      organizationId,
    });
    throw error;
  }
};

/**
 * Generate attendance report
 * @param {string} organizationId - Organization ID
 * @param {string} startDate - Report start date
 * @param {string} endDate - Report end date
 * @returns {Promise<Object>} Attendance report
 */
const generateAttendanceReport = async (organizationId, startDate, endDate) => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get attendance statistics
    const attendanceResult = await Attendance.aggregate([
      {
        $match: {
          organizationId,
          date: {
            $gte: start,
            $lte: end,
          },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get average attendance rate
    const totalRecords = await Attendance.countDocuments({
      organizationId,
      date: {
        $gte: start,
        $lte: end,
      },
    });

    const presentCount =
      attendanceResult.find((r) => r._id === "present")?.count || 0;

    const report = {
      period: {
        startDate,
        endDate,
      },
      totalRecords,
      attendanceBreakdown: attendanceResult,
      averageAttendanceRate:
        totalRecords > 0
          ? Math.round((presentCount / totalRecords) * 100)
          : 0,
    };

    logger.info("Attendance report generated", {
      organizationId,
      period: `${startDate} to ${endDate}`,
    });

    return report;
  } catch (error) {
    logger.error("Error generating attendance report", {
      error: error.message,
      organizationId,
      startDate,
      endDate,
    });
    throw error;
  }
};

/**
 * Generate lead report
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Object>} Lead report
 */
const generateLeadReport = async (organizationId) => {
  try {
    // Total leads
    const totalLeads = await Lead.countDocuments({ organizationId });

    // Leads by status
    const byStatusResult = await Lead.aggregate([
      {
        $match: { organizationId },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Leads by source
    const bySourceResult = await Lead.aggregate([
      {
        $match: { organizationId },
      },
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
        },
      },
    ]);

    // Conversion rate (converted leads / total leads)
    const convertedLeads = await Lead.countDocuments({
      organizationId,
      status: "converted",
    });

    const report = {
      totalLeads,
      convertedLeads,
      conversionRate:
        totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0,
      byStatus: byStatusResult,
      bySource: bySourceResult,
    };

    logger.info("Lead report generated", {
      organizationId,
      totalLeads,
      convertedLeads,
    });

    return report;
  } catch (error) {
    logger.error("Error generating lead report", {
      error: error.message,
      organizationId,
    });
    throw error;
  }
};

module.exports = {
  generateDashboardStats,
  generateFinancialReport,
  generateStudentReport,
  generateTeacherReport,
  generateAttendanceReport,
  generateLeadReport,
};
