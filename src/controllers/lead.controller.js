const asyncHandler = require("express-async-handler");
const { Lead } = require("../models");
const {
  successResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse,
  paginatedResponse,
} = require("../utils/apiResponse");
const { sendTestReminderSMS } = require("../services/sms.service");
const logger = require("../utils/logger");

/**
 * @desc    Get all leads
 * @route   GET /api/v1/leads
 * @access  Private/Admin
 */
const getAllLeads = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    source,
    assignedTo,
    priority,
    search,
  } = req.query;

  const query = { organizationId: req.user.organizationId };

  if (status) {query.status = status;}
  if (source) {query.source = source;}
  if (assignedTo) {query.assignedTo = assignedTo;}
  if (priority) {query.priority = priority;}

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const leads = await Lead.find(query)
    .populate("interestedCourse", "name level")
    .populate("assignedTo", "firstName lastName")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Lead.countDocuments(query);

  return paginatedResponse(
    res,
    leads,
    page,
    limit,
    total,
    "Leads retrieved successfully",
  );
});

/**
 * @desc    Get lead by ID
 * @route   GET /api/v1/leads/:id
 * @access  Private/Admin
 */
const getLeadById = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id)
    .populate("interestedCourse")
    .populate("assignedTo", "firstName lastName email")
    .populate("contactHistory.contactedBy", "firstName lastName")
    .populate("test.conductedBy", "firstName lastName")
    .populate("enrollmentStatus.enrolledGroupId", "name code")
    .populate("enrollmentStatus.studentId");

  if (!lead) {
    return notFoundResponse(res, "Lead not found");
  }

  return successResponse(res, "Lead retrieved successfully", lead);
});

/**
 * @desc    Create new lead
 * @route   POST /api/v1/leads
 * @access  Public/Private
 */
const createLead = asyncHandler(async (req, res) => {
  const leadData = {
    ...req.body,
    organizationId: req.user?.organizationId || req.body.organizationId,
  };

  // Auto-assign if specified
  if (!leadData.assignedTo && req.user) {
    leadData.assignedTo = req.user._id;
    leadData.assignedAt = new Date();
  }

  const lead = await Lead.create(leadData);

  await lead.populate([
    { path: "interestedCourse", select: "name level" },
    { path: "assignedTo", select: "firstName lastName" },
  ]);

  return createdResponse(res, "Lead created successfully", lead);
});

/**
 * @desc    Update lead
 * @route   PUT /api/v1/leads/:id
 * @access  Private/Admin
 */
const updateLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    return notFoundResponse(res, "Lead not found");
  }

  if (lead.organizationId.toString() !== req.user.organizationId.toString()) {
    return notFoundResponse(res, "Lead not found");
  }

  const updatedLead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate("interestedCourse assignedTo");

  return successResponse(res, "Lead updated successfully", updatedLead);
});

/**
 * @desc    Delete lead
 * @route   DELETE /api/v1/leads/:id
 * @access  Private/Admin
 */
const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    return notFoundResponse(res, "Lead not found");
  }

  if (lead.organizationId.toString() !== req.user.organizationId.toString()) {
    return notFoundResponse(res, "Lead not found");
  }

  await lead.deleteOne();

  return successResponse(res, "Lead deleted successfully");
});

/**
 * @desc    Assign lead to user
 * @route   POST /api/v1/leads/:id/assign
 * @access  Private/Admin
 */
const assignLead = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    return notFoundResponse(res, "Lead not found");
  }

  const { User } = require("../models");
  const user = await User.findById(userId);
  if (!user) {
    return notFoundResponse(res, "User not found");
  }

  lead.assignedTo = userId;
  lead.assignedAt = new Date();
  await lead.save();

  await lead.populate("assignedTo", "firstName lastName email");

  return successResponse(res, "Lead assigned successfully", lead);
});

/**
 * @desc    Add contact history
 * @route   POST /api/v1/leads/:id/contact
 * @access  Private/Admin
 */
const addContactHistory = asyncHandler(async (req, res) => {
  const { method, outcome, notes, nextFollowUp } = req.body;

  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    return notFoundResponse(res, "Lead not found");
  }

  lead.contactHistory.push({
    contactedBy: req.user._id,
    contactDate: new Date(),
    method,
    outcome,
    notes,
    nextFollowUp,
  });

  // Update lead status based on outcome
  if (outcome === "not-interested") {
    lead.status = "rejected";
    lead.rejection = {
      reason: "not-interested",
      details: notes,
      date: new Date(),
    };
  } else if (outcome === "follow-up-scheduled") {
    if (lead.status === "new") {
      lead.status = "contacted";
    }
  }

  await lead.save();
  await lead.populate("contactHistory.contactedBy", "firstName lastName");

  return successResponse(res, "Contact history added successfully", lead);
});

/**
 * @desc    Schedule test
 * @route   POST /api/v1/leads/:id/schedule-test
 * @access  Private/Admin
 */
const scheduleTest = asyncHandler(async (req, res) => {
  const { scheduledDate, scheduledTime } = req.body;

  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    return notFoundResponse(res, "Lead not found");
  }

  lead.test.isScheduled = true;
  lead.test.scheduledDate = new Date(scheduledDate);
  lead.test.scheduledTime = scheduledTime;
  lead.status = "test_scheduled";

  await lead.save();

  // Send SMS reminder
  try {
    await sendTestReminderSMS(lead, scheduledDate, scheduledTime);
  } catch (error) {
    logger.error("Error sending test reminder SMS:", error);
  }

  return successResponse(res, "Test scheduled successfully", lead);
});

/**
 * @desc    Record test results
 * @route   POST /api/v1/leads/:id/test-results
 * @access  Private/Admin
 */
const recordTestResults = asyncHandler(async (req, res) => {
  const { writtenScore, oralScore, overallScore, recommendedLevel, notes } =
    req.body;

  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    return notFoundResponse(res, "Lead not found");
  }

  lead.test.conductedBy = req.user._id;
  lead.test.conductedDate = new Date();
  lead.test.results = {
    writtenScore,
    oralScore,
    overallScore,
    recommendedLevel,
    notes,
  };
  lead.status = "test_completed";

  await lead.save();

  return successResponse(res, "Test results recorded successfully", lead);
});

/**
 * @desc    Convert lead to student
 * @route   POST /api/v1/leads/:id/convert
 * @access  Private/Admin
 */
const convertToStudent = asyncHandler(async (req, res) => {
  const { groupId, dateOfBirth, gender, address, parentInfo } = req.body;

  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    return notFoundResponse(res, "Lead not found");
  }

  // Check if already converted
  if (lead.enrollmentStatus.isEnrolled) {
    return badRequestResponse(res, "Lead already converted to student");
  }

  const { User, Student, Group } = require("../models");
  const {
    generatePassword,
    generateStudentId,
    generateContractNumber,
  } = require("../utils/generators");

  // Verify group exists
  const group = await Group.findById(groupId);
  if (!group) {
    return notFoundResponse(res, "Group not found");
  }

  // Check if group is full
  if (group.isFull()) {
    return badRequestResponse(res, "Group is full");
  }

  // Create user account
  const tempPassword = generatePassword();
  const user = await User.create({
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email || `${lead.phone}@educrm.temp`,
    password: tempPassword,
    phone: lead.phone,
    role: "student",
    organizationId: lead.organizationId,
  });

  // Create student profile
  const student = await Student.create({
    userId: user._id,
    studentId: generateStudentId(),
    organizationId: lead.organizationId,
    dateOfBirth,
    gender,
    address,
    parentInfo,
    contractNumber: generateContractNumber(),
    contractDate: new Date(),
  });

  // Enroll in group
  student.currentGroups.push(groupId);
  await student.save();

  group.currentStudents.push({
    studentId: student._id,
    enrollmentDate: new Date(),
    status: "active",
  });
  await group.save();

  // Update lead
  lead.enrollmentStatus = {
    isEnrolled: true,
    enrolledDate: new Date(),
    enrolledGroupId: groupId,
    studentId: student._id,
  };
  lead.status = "enrolled";
  await lead.save();

  // Send welcome messages
  try {
    const emailService = require("../services/email.service");
    const smsService = require("../services/sms.service");

    if (lead.email) {
      await emailService.sendWelcomeEmail(user, tempPassword);
    }
    await smsService.sendWelcomeSMS(user, tempPassword);
  } catch (error) {
    logger.error("Error sending welcome messages:", error);
  }

  return createdResponse(res, "Lead converted to student successfully", {
    lead,
    student,
    credentials: {
      email: user.email,
      phone: user.phone,
      tempPassword,
    },
  });
});

/**
 * @desc    Reject lead
 * @route   POST /api/v1/leads/:id/reject
 * @access  Private/Admin
 */
const rejectLead = asyncHandler(async (req, res) => {
  const { reason, details } = req.body;

  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    return notFoundResponse(res, "Lead not found");
  }

  lead.status = "rejected";
  lead.rejection = {
    reason,
    details,
    date: new Date(),
  };

  await lead.save();

  return successResponse(res, "Lead rejected successfully", lead);
});

/**
 * @desc    Get lead statistics
 * @route   GET /api/v1/leads/statistics
 * @access  Private/Admin
 */
const getLeadStatistics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const matchQuery = { organizationId: req.user.organizationId };

  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) {matchQuery.createdAt.$gte = new Date(startDate);}
    if (endDate) {matchQuery.createdAt.$lte = new Date(endDate);}
  }

  // Count by status
  const byStatus = await Lead.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  // Count by source
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
  const conversionRate = total > 0 ? ((enrolled / total) * 100).toFixed(2) : 0;

  return successResponse(res, "Lead statistics retrieved successfully", {
    total,
    enrolled,
    conversionRate: parseFloat(conversionRate),
    byStatus,
    bySource,
  });
});

/**
 * @desc    Get new leads (today)
 * @route   GET /api/v1/leads/new
 * @access  Private/Admin
 */
const getNewLeads = asyncHandler(async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const leads = await Lead.find({
    organizationId: req.user.organizationId,
    createdAt: { $gte: todayStart },
  })
    .populate("interestedCourse", "name")
    .populate("assignedTo", "firstName lastName")
    .sort({ createdAt: -1 });

  return successResponse(res, "New leads retrieved successfully", {
    count: leads.length,
    leads,
  });
});

/**
 * @desc    Bulk import leads
 * @route   POST /api/v1/leads/bulk-import
 * @access  Private/Admin
 */
const bulkImportLeads = asyncHandler(async (req, res) => {
  const { leads } = req.body;

  if (!Array.isArray(leads) || leads.length === 0) {
    return badRequestResponse(res, "Please provide an array of leads");
  }

  const results = {
    success: [],
    failed: [],
  };

  for (const leadData of leads) {
    try {
      const lead = await Lead.create({
        ...leadData,
        organizationId: req.user.organizationId,
      });

      results.success.push({
        name: `${lead.firstName} ${lead.lastName}`,
        phone: lead.phone,
      });
    } catch (error) {
      results.failed.push({
        data: leadData,
        reason: error.message,
      });
    }
  }

  return successResponse(res, "Bulk import completed", results);
});

module.exports = {
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  assignLead,
  addContactHistory,
  scheduleTest,
  recordTestResults,
  convertToStudent,
  rejectLead,
  getLeadStatistics,
  getNewLeads,
  bulkImportLeads,
};
