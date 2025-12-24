const asyncHandler = require("express-async-handler");
const {
  Student,
  Teacher,
  Payment,
  Group,
  Lead,
  Attendance,
} = require("../models");
const { successResponse } = require("../utils/apiResponse");
const {
  getStartOfMonth,
  getEndOfMonth,
  formatDate,
} = require("../utils/dateHelpers");
const reportService = require("../services/report.service");

/**
 * @desc    Get dashboard overview
 * @route   GET /api/v1/dashboard/overview
 * @access  Private/Admin
 */
const getOverview = asyncHandler(async (req, res) => {
  const organizationId = req.user.organizationId;

  // Get basic statistics
  const stats = await reportService.generateDashboardStats(organizationId);

  // Get recent activities
  const recentPayments = await Payment.find({
    organizationId,
    status: "completed",
  })
    .populate("studentId", "userId")
    .populate({
      path: "studentId",
      populate: {
        path: "userId",
        select: "firstName lastName",
      },
    })
    .sort({ createdAt: -1 })
    .limit(5);

  const recentLeads = await Lead.find({
    organizationId,
    status: "new",
  })
    .populate("interestedCourse", "name")
    .sort({ createdAt: -1 })
    .limit(5);

  // Get this month's revenue
  const monthRevenue = await Payment.aggregate([
    {
      $match: {
        organizationId,
        status: "completed",
        paymentDate: {
          $gte: getStartOfMonth(),
          $lte: getEndOfMonth(),
        },
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

  // Get this month's enrollments
  const monthEnrollments = await Student.countDocuments({
    organizationId,
    enrollmentDate: {
      $gte: getStartOfMonth(),
      $lte: getEndOfMonth(),
    },
  });

  return successResponse(res, "Dashboard overview retrieved successfully", {
    statistics: stats,
    thisMonth: {
      revenue: monthRevenue[0]?.total || 0,
      payments: monthRevenue[0]?.count || 0,
      enrollments: monthEnrollments,
    },
    recentActivities: {
      payments: recentPayments,
      leads: recentLeads,
    },
  });
});

/**
 * @desc    Get financial dashboard
 * @route   GET /api/v1/dashboard/financial
 * @access  Private/Admin
 */
const getFinancialDashboard = asyncHandler(async (req, res) => {
  const { period = "month" } = req.query; // month, week, year
  const organizationId = req.user.organizationId;

  let startDate, endDate;
  const now = new Date();

  switch (period) {
  case "week":
    startDate = new Date(now.setDate(now.getDate() - 7));
    endDate = new Date();
    break;
  case "year":
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31);
    break;
  case "month":
  default:
    startDate = getStartOfMonth();
    endDate = getEndOfMonth();
  }

  // Revenue
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
        discount: { $sum: "$discount.amount" },
        lateFee: { $sum: "$lateFee.amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Revenue by payment method
  const byMethod = await Payment.aggregate([
    {
      $match: {
        organizationId,
        status: "completed",
        paymentDate: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$paymentMethod",
        amount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Daily revenue (for charts)
  const dailyRevenue = await Payment.aggregate([
    {
      $match: {
        organizationId,
        status: "completed",
        paymentDate: { $gte: startDate, $lte: endDate },
      },
    },
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
    {
      $match: {
        organizationId,
        status: "active",
        totalDebt: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$totalDebt" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Expected revenue (from active students)
  const activeStudents = await Student.find({
    organizationId,
    status: "active",
  }).populate("currentGroups");

  let expectedRevenue = 0;
  for (const student of activeStudents) {
    for (const groupId of student.currentGroups) {
      const group = await Group.findById(groupId);
      if (group && group.status === "active") {
        expectedRevenue += group.pricing.monthlyFee;
      }
    }
  }

  return successResponse(res, "Financial dashboard retrieved successfully", {
    period: {
      start: formatDate(startDate),
      end: formatDate(endDate),
      type: period,
    },
    revenue: revenue[0] || { total: 0, discount: 0, lateFee: 0, count: 0 },
    byMethod,
    dailyRevenue,
    debt: debt[0] || { total: 0, count: 0 },
    expectedRevenue,
    collectionRate:
      expectedRevenue > 0
        ? (((revenue[0]?.total || 0) / expectedRevenue) * 100).toFixed(2)
        : 0,
  });
});

/**
 * @desc    Get academic dashboard
 * @route   GET /api/v1/dashboard/academic
 * @access  Private/Admin
 */
const getAcademicDashboard = asyncHandler(async (req, res) => {
  const organizationId = req.user.organizationId;

  // Students statistics
  const studentStats = await Student.aggregate([
    { $match: { organizationId } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  // Groups statistics
  const groupStats = await Group.aggregate([
    { $match: { organizationId } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  // Average attendance (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const attendanceStats = await Attendance.aggregate([
    {
      $match: {
        organizationId,
        date: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const totalAttendance = attendanceStats.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const presentCount =
    attendanceStats.find((item) => item._id === "present")?.count || 0;
  const attendanceRate =
    totalAttendance > 0
      ? ((presentCount / totalAttendance) * 100).toFixed(2)
      : 0;

  // Top performing students
  const topStudents = await Student.find({
    organizationId,
    status: "active",
  })
    .populate("userId", "firstName lastName")
    .sort({ overallProgress: -1 })
    .limit(10);

  // Groups with low attendance
  const groups = await Group.find({
    organizationId,
    status: "active",
  }).populate("courseId", "name");

  const groupsWithAttendance = [];
  for (const group of groups) {
    const groupAttendance = await Attendance.aggregate([
      {
        $match: {
          groupId: group._id,
          date: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const total = groupAttendance.reduce((sum, item) => sum + item.count, 0);
    const present =
      groupAttendance.find((item) => item._id === "present")?.count || 0;
    const rate = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

    if (parseFloat(rate) < 75) {
      groupsWithAttendance.push({
        group: {
          id: group._id,
          name: group.name,
          course: group.courseId.name,
        },
        attendanceRate: rate,
        totalClasses: total,
      });
    }
  }

  return successResponse(res, "Academic dashboard retrieved successfully", {
    students: {
      byStatus: studentStats,
      total: studentStats.reduce((sum, item) => sum + item.count, 0),
    },
    groups: {
      byStatus: groupStats,
      total: groupStats.reduce((sum, item) => sum + item.count, 0),
    },
    attendance: {
      overall: attendanceRate,
      byStatus: attendanceStats,
      total: totalAttendance,
    },
    topStudents: topStudents.map((s) => ({
      id: s._id,
      name: `${s.userId.firstName} ${s.userId.lastName}`,
      progress: s.overallProgress,
      attendance: s.attendance.percentage,
    })),
    groupsWithLowAttendance: groupsWithAttendance,
  });
});

/**
 * @desc    Get CRM dashboard
 * @route   GET /api/v1/dashboard/crm
 * @access  Private/Admin
 */
const getCRMDashboard = asyncHandler(async (req, res) => {
  const organizationId = req.user.organizationId;

  // Leads statistics
  const leadStats = await Lead.aggregate([
    { $match: { organizationId } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  // Leads by source
  const leadsBySource = await Lead.aggregate([
    { $match: { organizationId } },
    {
      $group: {
        _id: "$source",
        count: { $sum: 1 },
      },
    },
  ]);

  // Conversion funnel
  const total = await Lead.countDocuments({ organizationId });
  const contacted = await Lead.countDocuments({
    organizationId,
    status: {
      $in: ["contacted", "test_scheduled", "test_completed", "enrolled"],
    },
  });
  const tested = await Lead.countDocuments({
    organizationId,
    status: { $in: ["test_completed", "enrolled"] },
  });
  const enrolled = await Lead.countDocuments({
    organizationId,
    status: "enrolled",
  });

  const conversionFunnel = {
    total,
    contacted,
    tested,
    enrolled,
    rates: {
      contactRate: total > 0 ? ((contacted / total) * 100).toFixed(2) : 0,
      testRate: contacted > 0 ? ((tested / contacted) * 100).toFixed(2) : 0,
      enrollmentRate: tested > 0 ? ((enrolled / tested) * 100).toFixed(2) : 0,
      overallConversion: total > 0 ? ((enrolled / total) * 100).toFixed(2) : 0,
    },
  };

  // Today's leads
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayLeads = await Lead.find({
    organizationId,
    createdAt: { $gte: todayStart },
  })
    .populate("interestedCourse", "name")
    .sort({ createdAt: -1 });

  // Leads requiring follow-up
  const followUpLeads = await Lead.find({
    organizationId,
    status: { $in: ["contacted", "test_scheduled"] },
    "contactHistory.nextFollowUp": { $lte: new Date() },
  })
    .populate("interestedCourse", "name")
    .populate("assignedTo", "firstName lastName")
    .limit(10);

  // Response time (average)
  const leadsWithContact = await Lead.find({
    organizationId,
    "contactHistory.0": { $exists: true },
  });

  let totalResponseTime = 0;
  let responseCount = 0;

  leadsWithContact.forEach((lead) => {
    if (lead.contactHistory.length > 0) {
      const firstContact = lead.contactHistory[0].contactDate;
      const created = lead.createdAt;
      const hours = (firstContact - created) / (1000 * 60 * 60);
      totalResponseTime += hours;
      responseCount++;
    }
  });

  const avgResponseTime =
    responseCount > 0 ? (totalResponseTime / responseCount).toFixed(2) : 0;

  return successResponse(res, "CRM dashboard retrieved successfully", {
    leads: {
      byStatus: leadStats,
      bySource: leadsBySource,
      total: leadStats.reduce((sum, item) => sum + item.count, 0),
    },
    conversionFunnel,
    todayLeads: {
      count: todayLeads.length,
      leads: todayLeads,
    },
    followUpRequired: {
      count: followUpLeads.length,
      leads: followUpLeads,
    },
    performance: {
      averageResponseTime: avgResponseTime,
      unit: "hours",
    },
  });
});

/**
 * @desc    Get teacher dashboard
 * @route   GET /api/v1/dashboard/teachers
 * @access  Private/Admin
 */
const getTeacherDashboard = asyncHandler(async (req, res) => {
  const organizationId = req.user.organizationId;

  // Total teachers
  const totalTeachers = await Teacher.countDocuments({ organizationId });
  const activeTeachers = await Teacher.countDocuments({
    organizationId,
    isActive: true,
  });

  // Teachers by employment type
  const byEmployment = await Teacher.aggregate([
    { $match: { organizationId, isActive: true } },
    {
      $group: {
        _id: "$employmentType",
        count: { $sum: 1 },
      },
    },
  ]);

  // Teachers performance
  const teachers = await Teacher.find({ organizationId, isActive: true })
    .populate("userId", "firstName lastName")
    .sort({ "rating.average": -1 });

  const teachersPerformance = teachers.map((t) => ({
    id: t._id,
    name: `${t.userId.firstName} ${t.userId.lastName}`,
    rating: t.rating.average,
    groups: t.currentGroups.length,
    students: t.currentStudents,
    weeklyHours: t.weeklyHours,
  }));

  // Top rated teachers
  const topRated = teachersPerformance.slice(0, 5);

  // Teachers with low ratings
  const lowRated = teachersPerformance.filter((t) => t.rating < 3.5);

  // Average statistics
  const avgRating =
    teachers.reduce((sum, t) => sum + t.rating.average, 0) / teachers.length ||
    0;
  const avgGroups =
    teachers.reduce((sum, t) => sum + t.currentGroups.length, 0) /
      teachers.length || 0;
  const avgStudents =
    teachers.reduce((sum, t) => sum + t.currentStudents, 0) / teachers.length ||
    0;

  return successResponse(res, "Teacher dashboard retrieved successfully", {
    summary: {
      total: totalTeachers,
      active: activeTeachers,
      inactive: totalTeachers - activeTeachers,
    },
    byEmployment,
    averages: {
      rating: avgRating.toFixed(2),
      groupsPerTeacher: avgGroups.toFixed(1),
      studentsPerTeacher: avgStudents.toFixed(1),
    },
    topRated,
    needsAttention: lowRated,
    allTeachers: teachersPerformance,
  });
});

/**
 * @desc    Get activity feed
 * @route   GET /api/v1/dashboard/activity
 * @access  Private/Admin
 */
const getActivityFeed = asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;
  const organizationId = req.user.organizationId;

  const activities = [];

  // Recent payments
  const recentPayments = await Payment.find({
    organizationId,
    status: "completed",
  })
    .populate("studentId", "userId")
    .populate({
      path: "studentId",
      populate: {
        path: "userId",
        select: "firstName lastName",
      },
    })
    .sort({ createdAt: -1 })
    .limit(5);

  recentPayments.forEach((payment) => {
    activities.push({
      type: "payment",
      icon: "💰",
      title: "Payment Received",
      description: `${payment.studentId.userId.firstName} ${payment.studentId.userId.lastName} paid ${payment.amount.toLocaleString()} UZS`,
      timestamp: payment.createdAt,
      link: `/payments/${payment._id}`,
    });
  });

  // New students
  const newStudents = await Student.find({
    organizationId,
    enrollmentDate: {
      $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    },
  })
    .populate("userId", "firstName lastName")
    .sort({ enrollmentDate: -1 })
    .limit(5);

  newStudents.forEach((student) => {
    activities.push({
      type: "enrollment",
      icon: "🎓",
      title: "New Student Enrolled",
      description: `${student.userId.firstName} ${student.userId.lastName} joined`,
      timestamp: student.enrollmentDate,
      link: `/students/${student._id}`,
    });
  });

  // New leads
  const newLeads = await Lead.find({
    organizationId,
    createdAt: {
      $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  })
    .sort({ createdAt: -1 })
    .limit(5);

  newLeads.forEach((lead) => {
    activities.push({
      type: "lead",
      icon: "📞",
      title: "New Lead",
      description: `${lead.firstName} ${lead.lastName} showed interest`,
      timestamp: lead.createdAt,
      link: `/leads/${lead._id}`,
    });
  });

  // Sort all activities by timestamp
  activities.sort((a, b) => b.timestamp - a.timestamp);

  return successResponse(res, "Activity feed retrieved successfully", {
    activities: activities.slice(0, parseInt(limit)),
  });
});

/**
 * @desc    Get quick stats
 * @route   GET /api/v1/dashboard/quick-stats
 * @access  Private
 */
const getQuickStats = asyncHandler(async (req, res) => {
  const organizationId = req.user.organizationId;

  // Different stats based on role
  let stats = {};

  if (req.user.role === "admin" || req.user.role === "superadmin") {
    // Admin sees everything
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    stats = {
      todayPayments: await Payment.countDocuments({
        organizationId,
        paymentDate: { $gte: todayStart },
        status: "completed",
      }),
      newLeadsToday: await Lead.countDocuments({
        organizationId,
        createdAt: { $gte: todayStart },
      }),
      activeStudents: await Student.countDocuments({
        organizationId,
        status: "active",
      }),
      activeGroups: await Group.countDocuments({
        organizationId,
        status: "active",
      }),
      pendingPayments: await Payment.countDocuments({
        organizationId,
        status: "pending",
      }),
      followUpLeads: await Lead.countDocuments({
        organizationId,
        "contactHistory.nextFollowUp": { $lte: new Date() },
      }),
    };
  } else if (req.user.role === "teacher") {
    // Teacher sees their own stats
    const teacher = await Teacher.findOne({ userId: req.user._id });

    if (teacher) {
      stats = {
        myGroups: teacher.currentGroups.length,
        myStudents: teacher.currentStudents,
        rating: teacher.rating.average,
        weeklyHours: teacher.weeklyHours,
      };
    }
  } else if (req.user.role === "student") {
    // Student sees their own stats
    const student = await Student.findOne({ userId: req.user._id });

    if (student) {
      stats = {
        myGroups: student.currentGroups.length,
        attendance: student.attendance.percentage,
        progress: student.overallProgress,
        debt: student.totalDebt,
      };
    }
  }

  return successResponse(res, "Quick stats retrieved successfully", stats);
});

module.exports = {
  getOverview,
  getFinancialDashboard,
  getAcademicDashboard,
  getCRMDashboard,
  getTeacherDashboard,
  getActivityFeed,
  getQuickStats,
};
