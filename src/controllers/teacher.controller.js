const asyncHandler = require("express-async-handler");
const { Teacher, User, Group } = require("../models");
const {
  successResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse,
  paginatedResponse,
} = require("../utils/apiResponse");
const { generateTeacherId } = require("../utils/generators");
const logger = require("../utils/logger");

/**
 * @desc    Get all teachers
 * @route   GET /api/v1/teachers
 * @access  Private/Admin
 */
const getAllTeachers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, isActive, specialization, search } = req.query;

  const query = { organizationId: req.user.organizationId };

  if (isActive !== undefined) {query.isActive = isActive === "true";}
  if (specialization) {query.specialization = specialization;}

  if (search) {
    const users = await User.find({
      organizationId: req.user.organizationId,
      role: "teacher",
      $or: [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    });

    const userIds = users.map((u) => u._id);
    query.userId = { $in: userIds };
  }

  const teachers = await Teacher.find(query)
    .populate("userId", "firstName lastName email phone avatar")
    .populate("currentGroups", "name code")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Teacher.countDocuments(query);

  return paginatedResponse(
    res,
    teachers,
    page,
    limit,
    total,
    "Teachers retrieved successfully",
  );
});

/**
 * @desc    Get teacher by ID
 * @route   GET /api/v1/teachers/:id
 * @access  Private
 */
const getTeacherById = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id)
    .populate("userId")
    .populate("currentGroups")
    .populate("organizationId", "name");

  if (!teacher) {
    return notFoundResponse(res, "Teacher not found");
  }

  // Check access
  if (
    req.user.role === "teacher" &&
    teacher.userId._id.toString() !== req.user._id.toString()
  ) {
    return notFoundResponse(res, "Teacher not found");
  }

  return successResponse(res, "Teacher retrieved successfully", teacher);
});

/**
 * @desc    Create new teacher
 * @route   POST /api/v1/teachers
 * @access  Private/Admin
 */
const createTeacher = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    specialization,
    education,
    experience,
    salary,
    employmentType,
    contractStartDate,
    contractEndDate,
  } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return badRequestResponse(res, "User with this email already exists");
  }

  const phoneExists = await User.findOne({ phone });
  if (phoneExists) {
    return badRequestResponse(res, "User with this phone already exists");
  }

  // Generate temporary password
  const tempPassword = require("../utils/generators").generatePassword();

  // Create user account
  const user = await User.create({
    firstName,
    lastName,
    email,
    password: tempPassword,
    phone,
    role: "teacher",
    organizationId: req.user.organizationId,
  });

  // Create teacher profile
  const teacher = await Teacher.create({
    userId: user._id,
    teacherId: generateTeacherId(),
    organizationId: req.user.organizationId,
    specialization: specialization || [],
    education: education || [],
    experience: experience || { years: 0 },
    salary: {
      baseSalary: salary?.baseSalary || 0,
      currency: salary?.currency || "UZS",
      paymentFrequency: salary?.paymentFrequency || "monthly",
    },
    employmentType: employmentType || "full-time",
    contractStartDate: contractStartDate || new Date(),
    contractEndDate,
  });

  await teacher.populate("userId");

  // Send welcome messages
  try {
    const emailService = require("../services/email.service");
    const smsService = require("../services/sms.service");

    await emailService.sendWelcomeEmail(user, tempPassword);
    await smsService.sendWelcomeSMS(user, tempPassword);
  } catch (error) {
    logger.error("Error sending welcome messages:", error);
  }

  return createdResponse(res, "Teacher created successfully", {
    teacher,
    credentials: {
      email: user.email,
      phone: user.phone,
      tempPassword,
    },
  });
});

/**
 * @desc    Update teacher
 * @route   PUT /api/v1/teachers/:id
 * @access  Private/Admin
 */
const updateTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);

  if (!teacher) {
    return notFoundResponse(res, "Teacher not found");
  }

  if (
    teacher.organizationId.toString() !== req.user.organizationId.toString()
  ) {
    return notFoundResponse(res, "Teacher not found");
  }

  const {
    specialization,
    education,
    experience,
    salary,
    employmentType,
    availableDays,
    maxHoursPerWeek,
    bio,
    skills,
    languages,
    isActive,
  } = req.body;

  if (specialization) {teacher.specialization = specialization;}
  if (education) {teacher.education = education;}
  if (experience) {teacher.experience = { ...teacher.experience, ...experience };}
  if (salary) {teacher.salary = { ...teacher.salary, ...salary };}
  if (employmentType) {teacher.employmentType = employmentType;}
  if (availableDays) {teacher.availableDays = availableDays;}
  if (maxHoursPerWeek) {teacher.maxHoursPerWeek = maxHoursPerWeek;}
  if (bio) {teacher.bio = bio;}
  if (skills) {teacher.skills = skills;}
  if (languages) {teacher.languages = languages;}
  if (isActive !== undefined) {teacher.isActive = isActive;}

  await teacher.save();
  await teacher.populate("userId");

  return successResponse(res, "Teacher updated successfully", teacher);
});

/**
 * @desc    Delete teacher
 * @route   DELETE /api/v1/teachers/:id
 * @access  Private/Admin
 */
const deleteTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);

  if (!teacher) {
    return notFoundResponse(res, "Teacher not found");
  }

  if (
    teacher.organizationId.toString() !== req.user.organizationId.toString()
  ) {
    return notFoundResponse(res, "Teacher not found");
  }

  // Check if teacher has active groups
  if (teacher.currentGroups.length > 0) {
    return badRequestResponse(
      res,
      "Cannot delete teacher with active groups. Please reassign groups first.",
    );
  }

  // Delete user account
  await User.findByIdAndDelete(teacher.userId);

  // Delete teacher profile
  await teacher.deleteOne();

  return successResponse(res, "Teacher deleted successfully");
});

/**
 * @desc    Assign teacher to group
 * @route   POST /api/v1/teachers/:id/assign-group
 * @access  Private/Admin
 */
const assignToGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.body;

  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) {
    return notFoundResponse(res, "Teacher not found");
  }

  const group = await Group.findById(groupId);
  if (!group) {
    return notFoundResponse(res, "Group not found");
  }

  // Check if already assigned
  if (teacher.currentGroups.includes(groupId)) {
    return badRequestResponse(res, "Teacher already assigned to this group");
  }

  // Add to teacher's groups
  teacher.currentGroups.push(groupId);
  await teacher.save();

  return successResponse(
    res,
    "Teacher assigned to group successfully",
    teacher,
  );
});

/**
 * @desc    Remove teacher from group
 * @route   POST /api/v1/teachers/:id/remove-group
 * @access  Private/Admin
 */
const removeFromGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.body;

  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) {
    return notFoundResponse(res, "Teacher not found");
  }

  teacher.currentGroups = teacher.currentGroups.filter(
    (g) => g.toString() !== groupId,
  );
  await teacher.save();

  return successResponse(
    res,
    "Teacher removed from group successfully",
    teacher,
  );
});

/**
 * @desc    Add teacher review/rating
 * @route   POST /api/v1/teachers/:id/review
 * @access  Private/Student
 */
const addReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) {
    return notFoundResponse(res, "Teacher not found");
  }

  // Check if student already reviewed
  const existingReview = teacher.reviews.find(
    (r) => r.studentId.toString() === req.user._id.toString(),
  );

  if (existingReview) {
    return badRequestResponse(res, "You have already reviewed this teacher");
  }

  // Add review
  teacher.reviews.push({
    studentId: req.user._id,
    rating,
    comment,
    date: new Date(),
  });

  // Update average rating
  teacher.updateRating();
  await teacher.save();

  return successResponse(res, "Review added successfully", teacher);
});

/**
 * @desc    Get teacher schedule
 * @route   GET /api/v1/teachers/:id/schedule
 * @access  Private
 */
const getTeacherSchedule = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id).populate({
    path: "currentGroups",
    populate: {
      path: "courseId",
      select: "name",
    },
  });

  if (!teacher) {
    return notFoundResponse(res, "Teacher not found");
  }

  // Build schedule from groups
  const schedule = {};
  const daysOfWeek = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  daysOfWeek.forEach((day) => {
    schedule[day] = [];
  });

  teacher.currentGroups.forEach((group) => {
    group.schedule.forEach((slot) => {
      schedule[slot.day].push({
        groupId: group._id,
        groupName: group.name,
        courseName: group.courseId.name,
        startTime: slot.startTime,
        endTime: slot.endTime,
        roomNumber: group.roomNumber,
      });
    });
  });

  // Sort by time
  Object.keys(schedule).forEach((day) => {
    schedule[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  return successResponse(res, "Teacher schedule retrieved successfully", {
    teacher: {
      id: teacher._id,
      name: `${teacher.userId.firstName} ${teacher.userId.lastName}`,
      weeklyHours: teacher.weeklyHours,
      maxHoursPerWeek: teacher.maxHoursPerWeek,
    },
    schedule,
  });
});

/**
 * @desc    Get teacher performance
 * @route   GET /api/v1/teachers/:id/performance
 * @access  Private/Admin
 */
const getTeacherPerformance = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id)
    .populate("userId", "firstName lastName")
    .populate("currentGroups");

  if (!teacher) {
    return notFoundResponse(res, "Teacher not found");
  }

  const { Attendance } = require("../models");

  // Get attendance records
  const attendance = await Attendance.find({
    teacherId: teacher._id,
    date: {
      $gte: new Date(new Date().setMonth(new Date().getMonth() - 3)), // Last 3 months
    },
  });

  // Calculate stats
  const stats = {
    totalClasses: attendance.length,
    onTime: attendance.filter((a) => !a.arrivedLate).length,
    late: attendance.filter((a) => a.arrivedLate).length,
    punctualityRate:
      attendance.length > 0
        ? (
          (attendance.filter((a) => !a.arrivedLate).length /
              attendance.length) *
            100
        ).toFixed(2)
        : 0,
  };

  return successResponse(res, "Teacher performance retrieved successfully", {
    teacher: {
      id: teacher._id,
      name: `${teacher.userId.firstName} ${teacher.userId.lastName}`,
      rating: teacher.rating,
      currentGroups: teacher.currentGroups.length,
      currentStudents: teacher.currentStudents,
      weeklyHours: teacher.weeklyHours,
    },
    attendance: stats,
    reviews: teacher.reviews.slice(-5), // Last 5 reviews
  });
});

/**
 * @desc    Update teacher salary
 * @route   PUT /api/v1/teachers/:id/salary
 * @access  Private/Admin
 */
const updateSalary = asyncHandler(async (req, res) => {
  const { baseSalary, bonus, deduction } = req.body;

  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) {
    return notFoundResponse(res, "Teacher not found");
  }

  if (baseSalary) {
    teacher.salary.baseSalary = baseSalary;
  }

  if (bonus) {
    teacher.salary.bonuses.push({
      amount: bonus.amount,
      reason: bonus.reason,
      date: new Date(),
    });
  }

  if (deduction) {
    teacher.salary.deductions.push({
      amount: deduction.amount,
      reason: deduction.reason,
      date: new Date(),
    });
  }

  await teacher.save();

  return successResponse(res, "Salary updated successfully", teacher);
});

/**
 * @desc    Upload teacher document
 * @route   POST /api/v1/teachers/:id/documents
 * @access  Private/Admin
 */
const uploadDocument = asyncHandler(async (req, res) => {
  const { type, fileName, fileUrl } = req.body;

  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) {
    return notFoundResponse(res, "Teacher not found");
  }

  teacher.documents.push({
    type,
    fileName,
    fileUrl,
    uploadDate: new Date(),
  });

  await teacher.save();

  return successResponse(res, "Document uploaded successfully", teacher);
});

module.exports = {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  assignToGroup,
  removeFromGroup,
  addReview,
  getTeacherSchedule,
  getTeacherPerformance,
  updateSalary,
  uploadDocument,
};
