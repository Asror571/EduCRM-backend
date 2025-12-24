const {
  Student,
  Teacher,
  Payment,
  Group,
  Lead,
  Attendance,
} = require("../models");
const {
  formatDate,
  getStartOfMonth,
  getEndOfMonth,
} = require("../utils/dateHelpers");
const logger = require("../utils/logger");

/**
 * Generate financial report
 */
const generateFinancialReport = async (organizationId, startDate, endDate) => {
  try {
    const matchQuery = {
      organizationId,
      paymentDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    // Total revenue
    const revenue = await Payment.aggregate([
      { $match: { ...matchQuery, status: "completed" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          discount: { $sum: "$discount.amount" },
          lateFee: { $sum: "$lateFee.amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Revenue by payment method
    const byMethod = await Payment.aggregate([
      { $match: { ...matchQuery, status: "completed" } },
      {
        $group: {
          _id: "$paymentMethod",
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Revenue by payment type
    const byType = await Payment.aggregate([
      { $match: { ...matchQuery, status: "completed" } },
      {
        $group: {
          _id: "$paymentFor.type",
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Daily revenue
    const daily = await Payment.aggregate([
      { $match: { ...matchQuery, status: "completed" } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" } },
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Outstanding debt
    const debt = await Student.aggregate([
      { $match: { organizationId, status: "active" } },
      {
        $group: {
          _id: null,
          totalDebt: { $sum: "$totalDebt" },
          studentsWithDebt: {
            $sum: { $cond: [{ $gt: ["$totalDebt", 0] }, 1, 0] },
          },
        },
      },
    ]);

    return {
      period: {
        start: formatDate(startDate),
        end: formatDate(endDate),
      },
      revenue: revenue[0] || {
        total: 0,
        discount: 0,
        lateFee: 0,
        count: 0,
      },
      byMethod,
      byType,
      daily,
      debt: debt[0] || {
        totalDebt: 0,
        studentsWithDebt: 0,
      },
    };
  } catch (error) {
    logger.error("Error generating financial report:", error);
    throw error;
  }
};

/**
 * Generate student report
 */
const generateStudentReport = async (organizationId) => {
  try {
    // Total students by status
    const byStatus = await Student.aggregate([
      { $match: { organizationId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Students by gender
    const byGender = await Student.aggregate([
      { $match: { organizationId, status: "active" } },
      {
        $group: {
          _id: "$gender",
          count: { $sum: 1 },
        },
      },
    ]);

    // Average attendance
    const avgAttendance = await Student.aggregate([
      { $match: { organizationId, status: "active" } },
      {
        $group: {
          _id: null,
          avgPercentage: { $avg: "$attendance.percentage" },
        },
      },
    ]);

    // Students enrolled this month
    const thisMonth = await Student.countDocuments({
      organizationId,
      enrollmentDate: {
        $gte: getStartOfMonth(),
        $lte: getEndOfMonth(),
      },
    });

    // Students by group
    const byGroup = await Group.aggregate([
      { $match: { organizationId, status: "active" } },
      {
        $project: {
          name: 1,
          studentCount: { $size: "$currentStudents" },
          maxStudents: 1,
        },
      },
      { $sort: { studentCount: -1 } },
    ]);

    return {
      byStatus,
      byGender,
      averageAttendance: avgAttendance[0]?.avgPercentage || 0,
      enrolledThisMonth: thisMonth,
      byGroup,
    };
  } catch (error) {
    logger.error("Error generating student report:", error);
    throw error;
  }
};

/**
 * Generate teacher report
 */
const generateTeacherReport = async (organizationId) => {
  try {
    const teachers = await Teacher.find({ organizationId, isActive: true })
      .populate("userId", "firstName lastName")
      .populate("currentGroups");

    const report = teachers.map((teacher) => ({
      id: teacher._id,
      name: `${teacher.userId.firstName} ${teacher.userId.lastName}`,
      specialization: teacher.specialization,
      groupCount: teacher.currentGroups.length,
      studentCount: teacher.currentStudents,
      weeklyHours: teacher.weeklyHours,
      rating: teacher.rating.average,
      attendance: {
        total: teacher.attendance.totalClasses,
        conducted: teacher.attendance.conductedClasses,
        missed: teacher.attendance.missedClasses,
        late: teacher.attendance.lateClasses,
      },
    }));

    // Overall statistics
    const stats = {
      totalTeachers: teachers.length,
      averageRating:
        teachers.reduce((sum, t) => sum + t.rating.average, 0) /
        teachers.length,
      totalGroups: teachers.reduce((sum, t) => sum + t.currentGroups.length, 0),
      totalStudents: teachers.reduce((sum, t) => sum + t.currentStudents, 0),
    };

    return {
      teachers: report,
      statistics: stats,
    };
  } catch (error) {
    logger.error("Error generating teacher report:", error);
    throw error;
  }
};

/**
 * Generate attendance report
 */
const generateAttendanceReport = async (
  organizationId,
  startDate,
  endDate,
  groupId = null,
) => {
  try {
    const matchQuery = {
      organizationId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    if (groupId) {
      matchQuery.groupId = groupId;
    }

    // Attendance by status
    const byStatus = await Attendance.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Daily attendance
    const daily = await Attendance.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          late: {
            $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] },
          },
          excused: {
            $sum: { $cond: [{ $eq: ["$status", "excused"] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Students with low attendance
    const lowAttendance = await Student.find({
      organizationId,
      status: "active",
      "attendance.percentage": { $lt: 75 },
    })
      .populate("userId", "firstName lastName phone")
      .select("userId attendance")
      .limit(10);

    return {
      period: {
        start: formatDate(startDate),
        end: formatDate(endDate),
      },
      byStatus,
      daily,
      lowAttendance: lowAttendance.map((s) => ({
        student: `${s.userId.firstName} ${s.userId.lastName}`,
        phone: s.userId.phone,
        percentage: s.attendance.percentage,
        attended: s.attendance.attendedClasses,
        total: s.attendance.totalClasses,
      })),
    };
  } catch (error) {
    logger.error("Error generating attendance report:", error);
    throw error;
  }
};

/**
 * Generate lead report
 */
const generateLeadReport = async (organizationId, startDate, endDate) => {
  try {
    const matchQuery = {
      organizationId,
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    // Leads by status
    const byStatus = await Lead.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Leads by source
    const bySource = await Lead.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
        },
      },
    ]);

    // Conversion rate
    const total = await Lead.countDocuments(matchQuery);
    const enrolled = await Lead.countDocuments({
      ...matchQuery,
      status: "enrolled",
    });
    const conversionRate = total > 0 ? (enrolled / total) * 100 : 0;

    // Average response time (in hours)
    const avgResponseTime = await Lead.aggregate([
      { $match: matchQuery },
      {
        $project: {
          responseTime: {
            $divide: [
              { $subtract: ["$contactHistory.0.contactDate", "$createdAt"] },
              1000 * 60 * 60, // Convert to hours
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgHours: { $avg: "$responseTime" },
        },
      },
    ]);

    // Daily new leads
    const daily = await Lead.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      period: {
        start: formatDate(startDate),
        end: formatDate(endDate),
      },
      summary: {
        total,
        enrolled,
        conversionRate: conversionRate.toFixed(2),
      },
      byStatus,
      bySource,
      averageResponseTime: avgResponseTime[0]?.avgHours.toFixed(2) || 0,
      daily,
    };
  } catch (error) {
    logger.error("Error generating lead report:", error);
    throw error;
  }
};

/**
 * Generate dashboard statistics
 */
const generateDashboardStats = async (organizationId) => {
  try {
    // Students
    const totalStudents = await Student.countDocuments({ organizationId });
    const activeStudents = await Student.countDocuments({
      organizationId,
      status: "active",
    });

    // Groups
    const totalGroups = await Group.countDocuments({ organizationId });
    const activeGroups = await Group.countDocuments({
      organizationId,
      status: "active",
    });

    // Teachers
    const totalTeachers = await Teacher.countDocuments({ organizationId });
    const activeTeachers = await Teacher.countDocuments({
      organizationId,
      isActive: true,
    });

    // Today's revenue
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayRevenue = await Payment.aggregate([
      {
        $match: {
          organizationId,
          status: "completed",
          paymentDate: { $gte: todayStart, $lte: todayEnd },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    // Total debt
    const totalDebt = await Student.aggregate([
      { $match: { organizationId, status: "active" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalDebt" },
        },
      },
    ]);

    // New leads this month
    const newLeads = await Lead.countDocuments({
      organizationId,
      createdAt: {
        $gte: getStartOfMonth(),
        $lte: getEndOfMonth(),
      },
    });

    return {
      students: {
        total: totalStudents,
        active: activeStudents,
      },
      groups: {
        total: totalGroups,
        active: activeGroups,
      },
      teachers: {
        total: totalTeachers,
        active: activeTeachers,
      },
      revenue: {
        today: todayRevenue[0]?.total || 0,
      },
      debt: {
        total: totalDebt[0]?.total || 0,
      },
      leads: {
        thisMonth: newLeads,
      },
    };
  } catch (error) {
    logger.error("Error generating dashboard stats:", error);
    throw error;
  }
};

module.exports = {
  generateFinancialReport,
  generateStudentReport,
  generateTeacherReport,
  generateAttendanceReport,
  generateLeadReport,
  generateDashboardStats,
};
