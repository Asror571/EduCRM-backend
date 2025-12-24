const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/teacher.controller");
const { protect } = require("../middlewares/auth.middleware");
const {
  isAdminOrSuperAdmin,
} = require("../middlewares/role.middleware");

router.use(protect);

router.route("/").get(getAllTeachers).post(isAdminOrSuperAdmin, createTeacher);

router
  .route("/:id")
  .get(getTeacherById)
  .put(isAdminOrSuperAdmin, updateTeacher)
  .delete(isAdminOrSuperAdmin, deleteTeacher);

// Group assignment
router.post("/:id/assign-group", isAdminOrSuperAdmin, assignToGroup);
router.post("/:id/remove-group", isAdminOrSuperAdmin, removeFromGroup);

// Reviews (students can review)
router.post("/:id/review", addReview);

// Schedule and performance
router.get("/:id/schedule", getTeacherSchedule);
router.get("/:id/performance", isAdminOrSuperAdmin, getTeacherPerformance);

// Salary and documents
router.put("/:id/salary", isAdminOrSuperAdmin, updateSalary);
router.post("/:id/documents", isAdminOrSuperAdmin, uploadDocument);

module.exports = router;
