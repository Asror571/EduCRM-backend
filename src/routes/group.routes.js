const express = require("express");
const router = express.Router();
const {
  getAllGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  startGroup,
  completeGroup,
  cancelGroup,
  getGroupAttendance,
  markAttendance,
  getGroupSchedule,
} = require("../controllers/group.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");
const { isAdminOrSuperAdmin } = require("../middlewares/role.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  createGroupValidator,
  updateGroupValidator,
} = require("../validators/group.validator");

router.use(protect);

router
  .route("/")
  .get(getAllGroups)
  .post(isAdminOrSuperAdmin, createGroupValidator, validate, createGroup);

router
  .route("/:id")
  .get(getGroupById)
  .put(isAdminOrSuperAdmin, updateGroupValidator, validate, updateGroup)
  .delete(isAdminOrSuperAdmin, deleteGroup);

// Group status management
router.post("/:id/start", isAdminOrSuperAdmin, startGroup);
router.post("/:id/complete", isAdminOrSuperAdmin, completeGroup);
router.post("/:id/cancel", isAdminOrSuperAdmin, cancelGroup);

// Attendance
router.get("/:id/attendance", getGroupAttendance);
router.post("/:id/attendance", authorize("admin", "teacher"), markAttendance);

// Schedule
router.get("/:id/schedule", getGroupSchedule);

module.exports = router;
