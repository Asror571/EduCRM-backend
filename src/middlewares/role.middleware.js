const { ROLES } = require("../config/constants");
const { forbiddenResponse } = require("../utils/apiResponse");

/**
 * Check if user is superadmin
 */
const isSuperAdmin = (req, res, next) => {
  if (req.user.role !== ROLES.SUPERADMIN) {
    return forbiddenResponse(res, "Only superadmin can perform this action");
  }
  next();
};

/**
 * Check if user is admin or superadmin
 */
const isAdminOrSuperAdmin = (req, res, next) => {
  if (![ROLES.SUPERADMIN, ROLES.ADMIN].includes(req.user.role)) {
    return forbiddenResponse(
      res,
      "Only admin or superadmin can perform this action",
    );
  }
  next();
};

/**
 * Check if user is teacher
 */
const isTeacher = (req, res, next) => {
  if (req.user.role !== ROLES.TEACHER) {
    return forbiddenResponse(res, "Only teachers can perform this action");
  }
  next();
};

/**
 * Check if user is student
 */
const isStudent = (req, res, next) => {
  if (req.user.role !== ROLES.STUDENT) {
    return forbiddenResponse(res, "Only students can perform this action");
  }
  next();
};

/**
 * Check if user owns the resource
 */
const isOwner = (req, res, next) => {
  const resourceUserId = req.params.userId || req.body.userId;

  // Superadmin and Admin can access all
  if ([ROLES.SUPERADMIN, ROLES.ADMIN].includes(req.user.role)) {
    return next();
  }

  // Check if user owns the resource
  if (req.user._id.toString() !== resourceUserId) {
    return forbiddenResponse(res, "You can only access your own resources");
  }

  next();
};

/**
 * Check organization ownership
 */
const checkOrganizationOwnership = (req, res, next) => {
  const organizationId = req.params.organizationId || req.body.organizationId;

  // Superadmin can access all organizations
  if (req.user.role === ROLES.SUPERADMIN) {
    return next();
  }

  // Check if user belongs to the organization
  if (req.user.organizationId.toString() !== organizationId) {
    return forbiddenResponse(res, "You can only access your organization");
  }

  next();
};

module.exports = {
  isSuperAdmin,
  isAdminOrSuperAdmin,
  isTeacher,
  isStudent,
  isOwner,
  checkOrganizationOwnership,
};
