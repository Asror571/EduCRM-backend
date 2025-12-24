const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const { User, Organization } = require("../models");
const {
  successResponse,
  createdResponse,
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
} = require("../utils/apiResponse");
const {
  sendWelcomeEmail,
  sendPasswordResetEmail,
} = require("../services/email.service");
const { sendWelcomeSMS } = require("../services/sms.service");
const env = require("../config/env");
const logger = require("../utils/logger");

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRE,
  });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRE,
  });
};

/**
 * @desc    Register new user
 * @route   POST /api/v1/auth/register
 * @access  Public (with organization)
 */
const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, phone, role, organizationId } =
    req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return badRequestResponse(res, "User with this email already exists");
  }

  // Check phone exists
  const phoneExists = await User.findOne({ phone });
  if (phoneExists) {
    return badRequestResponse(
      res,
      "User with this phone number already exists",
    );
  }

  // Verify organization exists
  if (organizationId) {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return notFoundResponse(res, "Organization not found");
    }
  }

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    phone,
    role: role || "student",
    organizationId,
  });

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // Send welcome email
  try {
    await sendWelcomeEmail(user, password);
  } catch (error) {
    logger.error("Error sending welcome email:", error);
  }

  // Send welcome SMS
  try {
    await sendWelcomeSMS(user, password);
  } catch (error) {
    logger.error("Error sending welcome SMS:", error);
  }

  // Remove password from response
  user.password = undefined;

  return createdResponse(res, "User registered successfully", {
    user,
    token,
    refreshToken,
  });
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check user exists
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return unauthorizedResponse(res, "Invalid email or password");
  }

  // Check password
  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    return unauthorizedResponse(res, "Invalid email or password");
  }

  // Check if user is active
  if (user.status !== "active") {
    return unauthorizedResponse(res, "Your account has been deactivated");
  }

  // Update last login
  await user.updateLastLogin();

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // Remove password from response
  user.password = undefined;

  return successResponse(res, "Login successful", {
    user,
    token,
    refreshToken,
  });
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // Clear refresh token
  req.user.refreshToken = null;
  await req.user.save({ validateBeforeSave: false });

  return successResponse(res, "Logout successful");
});

/**
 * @desc    Get current user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    "organizationId",
    "name email",
  );

  return successResponse(res, "User retrieved successfully", user);
});

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/auth/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, avatar } = req.body;

  const user = await User.findById(req.user._id);

  if (firstName) {user.firstName = firstName;}
  if (lastName) {user.lastName = lastName;}
  if (phone) {user.phone = phone;}
  if (avatar) {user.avatar = avatar;}

  await user.save();

  return successResponse(res, "Profile updated successfully", user);
});

/**
 * @desc    Change password
 * @route   PUT /api/v1/auth/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  // Verify current password
  const isPasswordMatch = await user.comparePassword(currentPassword);
  if (!isPasswordMatch) {
    return badRequestResponse(res, "Current password is incorrect");
  }

  // Update password
  user.password = newPassword;
  await user.save();

  return successResponse(res, "Password changed successfully");
});

/**
 * @desc    Forgot password
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return notFoundResponse(res, "User not found with this email");
  }

  // Generate reset token
  const resetToken = jwt.sign({ id: user._id }, env.JWT_SECRET, {
    expiresIn: "1h",
  });

  // Save reset token
  user.passwordResetToken = resetToken;
  user.passwordResetExpires = Date.now() + 3600000; // 1 hour
  await user.save({ validateBeforeSave: false });

  // Send reset email
  try {
    await sendPasswordResetEmail(user, resetToken);
    return successResponse(res, "Password reset email sent successfully");
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    logger.error("Error sending password reset email:", error);
    return badRequestResponse(res, "Error sending password reset email");
  }
});

/**
 * @desc    Reset password
 * @route   POST /api/v1/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await User.findOne({
      _id: decoded.id,
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return badRequestResponse(res, "Invalid or expired reset token");
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return successResponse(res, "Password reset successful");
  } catch (error) {
    return badRequestResponse(res, "Invalid or expired reset token");
  }
});

/**
 * @desc    Refresh token
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return badRequestResponse(res, "Refresh token is required");
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);

    const user = await User.findOne({
      _id: decoded.id,
      refreshToken,
    });

    if (!user) {
      return unauthorizedResponse(res, "Invalid refresh token");
    }

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Save new refresh token
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    return successResponse(res, "Token refreshed successfully", {
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return unauthorizedResponse(res, "Invalid refresh token");
  }
});

/**
 * @desc    Verify email
 * @route   GET /api/v1/auth/verify-email/:token
 * @access  Public
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await User.findOne({
      _id: decoded.id,
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return badRequestResponse(res, "Invalid or expired verification token");
    }

    // Update user
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return successResponse(res, "Email verified successfully");
  } catch (error) {
    return badRequestResponse(res, "Invalid or expired verification token");
  }
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  verifyEmail,
};
