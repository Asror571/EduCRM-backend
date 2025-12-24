const asyncHandler = require("express-async-handler");
const { User, Student, Teacher } = require("../models");
const {
  successResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse,
  paginatedResponse,
} = require("../utils/apiResponse");
const {
  generateStudentId,
  generateTeacherId,
  generatePassword,
} = require("../utils/generators");
const { sendWelcomeEmail } = require("../services/email.service");
const { sendWelcomeSMS } = require("../services/sms.service");
const logger = require("../utils/logger");

/**
 * @desc    Get all users
 * @route   GET /api/v1/admin/users
 * @access  Private/Admin
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, role, status, search } = req.query;

  const query = {};

  // Filter by organization (if not superadmin)
  if (req.user.role !== "superadmin") {
    query.organizationId = req.user.organizationId;
  }

  if (role) {query.role = role;}
  if (status) {query.status = status;}
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(query)
    .populate("organizationId", "name")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await User.countDocuments(query);

  return paginatedResponse(
    res,
    users,
    page,
    limit,
    total,
    "Users retrieved successfully",
  );
});

/**
 * @desc    Get user by ID
 * @route   GET /api/v1/admin/users/:id
 * @access  Private/Admin
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate("organizationId");

  if (!user) {
    return notFoundResponse(res, "User not found");
  }

  // Check organization access
  if (
    req.user.role !== "superadmin" &&
    user.organizationId.toString() !== req.user.organizationId.toString()
  ) {
    return notFoundResponse(res, "User not found");
  }

  return successResponse(res, "User retrieved successfully", user);
});

/**
 * @desc    Create new user
 * @route   POST /api/v1/admin/users
 * @access  Private/Admin
 */
const createUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, role, organizationId } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return badRequestResponse(res, "User with this email already exists");
  }

  // Generate temporary password
  const tempPassword = generatePassword();

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    password: tempPassword,
    phone,
    role,
    organizationId: organizationId || req.user.organizationId,
  });

  // Create additional profile based on role
  if (role === "student") {
    await Student.create({
      userId: user._id,
      studentId: generateStudentId(),
      organizationId: user.organizationId,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender,
    });
  } else if (role === "teacher") {
    await Teacher.create({
      userId: user._id,
      teacherId: generateTeacherId(),
      organizationId: user.organizationId,
      specialization: req.body.specialization || [],
      salary: {
        baseSalary: req.body.baseSalary || 0,
      },
    });
  }

  // Send welcome email and SMS
  try {
    await sendWelcomeEmail(user, tempPassword);
    await sendWelcomeSMS(user, tempPassword);
  } catch (error) {
    logger.error("Error sending welcome messages:", error);
  }

  // Remove password from response
  user.password = undefined;

  return createdResponse(res, "User created successfully", user);
});

/**
 * @desc    Update user
 * @route   PUT /api/v1/admin/users/:id
 * @access  Private/Admin
 */
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return notFoundResponse(res, "User not found");
  }

  // Check organization access
  if (
    req.user.role !== "superadmin" &&
    user.organizationId.toString() !== req.user.organizationId.toString()
  ) {
    return notFoundResponse(res, "User not found");
  }

  const { firstName, lastName, phone, status, avatar } = req.body;

  if (firstName) {user.firstName = firstName;}
  if (lastName) {user.lastName = lastName;}
  if (phone) {user.phone = phone;}
  if (status) {user.status = status;}
  if (avatar) {user.avatar = avatar;}

  await user.save();

  return successResponse(res, "User updated successfully", user);
});

/**
 * @desc    Delete user
 * @route   DELETE /api/v1/admin/users/:id
 * @access  Private/Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return notFoundResponse(res, "User not found");
  }

  // Check organization access
  if (
    req.user.role !== "superadmin" &&
    user.organizationId.toString() !== req.user.organizationId.toString()
  ) {
    return notFoundResponse(res, "User not found");
  }

  // Don't allow deleting yourself
  if (user._id.toString() === req.user._id.toString()) {
    return badRequestResponse(res, "You cannot delete yourself");
  }

  // Delete associated profiles
  if (user.role === "student") {
    await Student.findOneAndDelete({ userId: user._id });
  } else if (user.role === "teacher") {
    await Teacher.findOneAndDelete({ userId: user._id });
  }

  await user.deleteOne();

  return successResponse(res, "User deleted successfully");
});

/**
 * @desc    Reset user password
 * @route   POST /api/v1/admin/users/:id/reset-password
 * @access  Private/Admin
 */
const resetUserPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return notFoundResponse(res, "User not found");
  }

  // Check organization access
  if (
    req.user.role !== "superadmin" &&
    user.organizationId.toString() !== req.user.organizationId.toString()
  ) {
    return notFoundResponse(res, "User not found");
  }

  // Generate new password
  const newPassword = generatePassword();

  user.password = newPassword;
  await user.save();

  // Send email with new password
  try {
    await sendWelcomeEmail(user, newPassword);
  } catch (error) {
    logger.error("Error sending password reset email:", error);
  }

  return successResponse(res, "Password reset successfully", {
    email: user.email,
    tempPassword: newPassword,
  });
});

/**
 * @desc    Get organization statistics
 * @route   GET /api/v1/admin/statistics
 * @access  Private/Admin
 */
const getStatistics = asyncHandler(async (req, res) => {
  const organizationId =
    req.user.role === "superadmin"
      ? req.query.organizationId
      : req.user.organizationId;

  const stats = {
    users: await User.countDocuments({ organizationId }),
    students: await Student.countDocuments({
      organizationId,
      status: "active",
    }),
    teachers: await Teacher.countDocuments({ organizationId, isActive: true }),
    groups: await require("../models/Group").countDocuments({
      organizationId,
      status: "active",
    }),
  };

  return successResponse(res, "Statistics retrieved successfully", stats);
});

/**
 * @desc    Bulk create users
 * @route   POST /api/v1/admin/users/bulk
 * @access  Private/Admin
 */
const bulkCreateUsers = asyncHandler(async (req, res) => {
  const { users } = req.body;

  if (!Array.isArray(users) || users.length === 0) {
    return badRequestResponse(res, "Please provide an array of users");
  }

  const results = {
    success: [],
    failed: [],
  };

  for (const userData of users) {
    try {
      // Check if user exists
      const userExists = await User.findOne({ email: userData.email });
      if (userExists) {
        results.failed.push({
          email: userData.email,
          reason: "User already exists",
        });
        continue;
      }

      const tempPassword = generatePassword();

      const user = await User.create({
        ...userData,
        password: tempPassword,
        organizationId: userData.organizationId || req.user.organizationId,
      });

      // Create additional profile based on role
      if (userData.role === "student") {
        await Student.create({
          userId: user._id,
          studentId: generateStudentId(),
          organizationId: user.organizationId,
          dateOfBirth: userData.dateOfBirth,
          gender: userData.gender,
        });
      }

      results.success.push({
        email: user.email,
        tempPassword,
      });

      // Send welcome email
      try {
        await sendWelcomeEmail(user, tempPassword);
      } catch (error) {
        logger.error("Error sending welcome email:", error);
      }
    } catch (error) {
      results.failed.push({
        email: userData.email,
        reason: error.message,
      });
    }
  }

  return successResponse(res, "Bulk user creation completed", results);
});

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  getStatistics,
  bulkCreateUsers,
};
