const asyncHandler = require("express-async-handler");
const { Student, User, Group } = require("../models");
const {
  successResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse,
  paginatedResponse,
} = require("../utils/apiResponse");
const {
  generateStudentId,
  generateContractNumber,
} = require("../utils/generators");
const logger = require("../utils/logger");

/**
 * @desc    Get all students
 * @route   GET /api/v1/students
 * @access  Private/Admin
 */
const getAllStudents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search, groupId } = req.query;

  const query = { organizationId: req.user.organizationId };

  if (status) {query.status = status;}
  if (groupId) {query.currentGroups = groupId;}

  if (search) {
    // Search by name or phone
    const users = await User.find({
      organizationId: req.user.organizationId,
      role: "student",
      $or: [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    });

    const userIds = users.map((u) => u._id);
    query.userId = { $in: userIds };
  }

  const students = await Student.find(query)
    .populate("userId", "firstName lastName email phone avatar")
    .populate("currentGroups", "name code")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Student.countDocuments(query);

  return paginatedResponse(
    res,
    students,
    page,
    limit,
    total,
    "Students retrieved successfully",
  );
});

/**
 * @desc    Get student by ID
 * @route   GET /api/v1/students/:id
 * @access  Private
 */
const getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate("userId")
    .populate("currentGroups")
    .populate("organizationId", "name");

  if (!student) {
    return notFoundResponse(res, "Student not found");
  }

  // Check access
  if (
    req.user.role === "student" &&
    student.userId._id.toString() !== req.user._id.toString()
  ) {
    return notFoundResponse(res, "Student not found");
  }

  return successResponse(res, "Student retrieved successfully", student);
});

/**
 * @desc    Create new student
 * @route   POST /api/v1/students
 * @access  Private/Admin
 */
const createStudent = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    dateOfBirth,
    gender,
    address,
    parentInfo,
    emergencyContact,
  } = req.body;

  // Check if user with email exists
  if (email) {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return badRequestResponse(res, "User with this email already exists");
    }
  }

  // Check if phone exists
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
    email: email || `${phone}@educrm.temp`,
    password: tempPassword,
    phone,
    role: "student",
    organizationId: req.user.organizationId,
  });

  // Create student profile
  const student = await Student.create({
    userId: user._id,
    studentId: generateStudentId(),
    organizationId: req.user.organizationId,
    dateOfBirth,
    gender,
    address,
    parentInfo,
    emergencyContact,
    contractNumber: generateContractNumber(),
    contractDate: new Date(),
  });

  await student.populate("userId");

  // Send welcome messages
  try {
    const emailService = require("../services/email.service");
    const smsService = require("../services/sms.service");

    if (email) {
      await emailService.sendWelcomeEmail(user, tempPassword);
    }
    await smsService.sendWelcomeSMS(user, tempPassword);
  } catch (error) {
    logger.error("Error sending welcome messages:", error);
  }

  return createdResponse(res, "Student created successfully", {
    student,
    credentials: {
      email: user.email,
      phone: user.phone,
      tempPassword,
    },
  });
});

/**
 * @desc    Update student
 * @route   PUT /api/v1/students/:id
 * @access  Private/Admin
 */
const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);

  if (!student) {
    return notFoundResponse(res, "Student not found");
  }

  // Check organization access
  if (
    student.organizationId.toString() !== req.user.organizationId.toString()
  ) {
    return notFoundResponse(res, "Student not found");
  }

  const {
    dateOfBirth,
    gender,
    address,
    parentInfo,
    emergencyContact,
    status,
    notes,
  } = req.body;

  if (dateOfBirth) {student.dateOfBirth = dateOfBirth;}
  if (gender) {student.gender = gender;}
  if (address) {student.address = { ...student.address, ...address };}
  if (parentInfo) {student.parentInfo = { ...student.parentInfo, ...parentInfo };}
  if (emergencyContact)
  {student.emergencyContact = {
    ...student.emergencyContact,
    ...emergencyContact,
  };}
  if (status) {student.status = status;}
  if (notes) {student.notes = notes;}

  await student.save();
  await student.populate("userId");

  return successResponse(res, "Student updated successfully", student);
});

/**
 * @desc    Delete student
 * @route   DELETE /api/v1/students/:id
 * @access  Private/Admin
 */
const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);

  if (!student) {
    return notFoundResponse(res, "Student not found");
  }

  // Check organization access
  if (
    student.organizationId.toString() !== req.user.organizationId.toString()
  ) {
    return notFoundResponse(res, "Student not found");
  }

  // Delete user account
  await User.findByIdAndDelete(student.userId);

  // Delete student profile
  await student.deleteOne();

  return successResponse(res, "Student deleted successfully");
});

/**
 * @desc    Enroll student in group
 * @route   POST /api/v1/students/:id/enroll
 * @access  Private/Admin
 */
const enrollStudent = asyncHandler(async (req, res) => {
  const { groupId } = req.body;

  const student = await Student.findById(req.params.id);
  if (!student) {
    return notFoundResponse(res, "Student not found");
  }

  const group = await Group.findById(groupId);
  if (!group) {
    return notFoundResponse(res, "Group not found");
  }

  // Check if group is full
  if (group.isFull()) {
    return badRequestResponse(res, "Group is full");
  }

  // Check if student already enrolled
  if (student.currentGroups.includes(groupId)) {
    return badRequestResponse(res, "Student already enrolled in this group");
  }

  // Add to student's groups
  student.currentGroups.push(groupId);
  await student.save();

  // Add to group's students
  group.currentStudents.push({
    studentId: student._id,
    enrollmentDate: new Date(),
    status: "active",
  });
  await group.save();

  return successResponse(res, "Student enrolled successfully", student);
});

/**
 * @desc    Remove student from group
 * @route   POST /api/v1/students/:id/unenroll
 * @access  Private/Admin
 */
const unenrollStudent = asyncHandler(async (req, res) => {
  const { groupId } = req.body;

  const student = await Student.findById(req.params.id);
  if (!student) {
    return notFoundResponse(res, "Student not found");
  }

  // Remove from student's groups
  student.currentGroups = student.currentGroups.filter(
    (g) => g.toString() !== groupId,
  );
  await student.save();

  // Remove from group's students
  const group = await Group.findById(groupId);
  if (group) {
    group.currentStudents = group.currentStudents.filter(
      (s) => s.studentId.toString() !== student._id.toString(),
    );
    await group.save();
  }

  return successResponse(res, "Student unenrolled successfully", student);
});

/**
 * @desc    Get student attendance
 * @route   GET /api/v1/students/:id/attendance
 * @access  Private
 */
const getStudentAttendance = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupId } = req.query;

  const query = { studentId: req.params.id };

  if (startDate || endDate) {
    query.date = {};
    if (startDate) {query.date.$gte = new Date(startDate);}
    if (endDate) {query.date.$lte = new Date(endDate);}
  }

  if (groupId) {query.groupId = groupId;}

  const { Attendance } = require("../models");
  const attendance = await Attendance.find(query)
    .populate("groupId", "name")
    .populate("teacherId", "userId")
    .sort({ date: -1 });

  return successResponse(res, "Attendance retrieved successfully", attendance);
});

/**
 * @desc    Get student payments
 * @route   GET /api/v1/students/:id/payments
 * @access  Private
 */
const getStudentPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = { studentId: req.params.id };
  if (status) {query.status = status;}

  const { Payment } = require("../models");
  const payments = await Payment.find(query)
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
 * @desc    Freeze student
 * @route   POST /api/v1/students/:id/freeze
 * @access  Private/Admin
 */
const freezeStudent = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const student = await Student.findById(req.params.id);
  if (!student) {
    return notFoundResponse(res, "Student not found");
  }

  student.status = "frozen";
  student.frozenDate = new Date();
  student.frozenReason = reason;
  await student.save();

  return successResponse(res, "Student frozen successfully", student);
});

/**
 * @desc    Unfreeze student
 * @route   POST /api/v1/students/:id/unfreeze
 * @access  Private/Admin
 */
const unfreezeStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    return notFoundResponse(res, "Student not found");
  }

  student.status = "active";
  student.frozenDate = null;
  student.frozenReason = null;
  await student.save();

  return successResponse(res, "Student unfrozen successfully", student);
});

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  enrollStudent,
  unenrollStudent,
  getStudentAttendance,
  getStudentPayments,
  freezeStudent,
  unfreezeStudent,
};
