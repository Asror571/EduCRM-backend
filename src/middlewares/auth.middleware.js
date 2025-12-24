const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const { User } = require("../models");
const { unauthorizedResponse } = require("../utils/apiResponse");
const env = require("../config/env");

/**
 * Protect routes - Check if user is authenticated
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Check if token exists
  if (!token) {
    return unauthorizedResponse(res, "Not authorized to access this route");
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Get user from token
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return unauthorizedResponse(res, "User not found");
    }

    // Check if user is active
    if (req.user.status !== "active") {
      return unauthorizedResponse(res, "Your account has been deactivated");
    }

    next();
  } catch (error) {
    return unauthorizedResponse(res, "Not authorized to access this route");
  }
});

/**
 * Grant access to specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return unauthorizedResponse(
        res,
        `User role '${req.user.role}' is not authorized to access this route`,
      );
    }
    next();
  };
};

/**
 * Check organization access
 */
const checkOrganizationAccess = asyncHandler(async (req, res, next) => {
  const { organizationId } = req.params;

  // Superadmin can access all organizations
  if (req.user.role === "superadmin") {
    return next();
  }

  // Check if user belongs to the organization
  if (req.user.organizationId.toString() !== organizationId) {
    return unauthorizedResponse(
      res,
      "Not authorized to access this organization",
    );
  }

  next();
});

/**
 * Optional auth - doesn't fail if no token
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
    } catch (error) {
      // Token invalid but continue anyway
      req.user = null;
    }
  }

  next();
});

module.exports = {
  protect,
  authorize,
  checkOrganizationAccess,
  optionalAuth,
};
