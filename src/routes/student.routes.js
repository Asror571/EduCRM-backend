const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/student.controller");
const { protect } = require("../middlewares/auth.middleware");
const { isAdminOrSuperAdmin } = require("../middlewares/role.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  createStudentValidator,
  updateStudentValidator,
  enrollStudentValidator,
} = require("../validators/student.validator");

router.use(protect);

// Routes accessible by admin
router
  .route("/")
  .get(getAllStudents)
  .post(isAdminOrSuperAdmin, createStudentValidator, validate, createStudent);

router
  .route("/:id")
  .get(getStudentById)
  .put(isAdminOrSuperAdmin, updateStudentValidator, validate, updateStudent)
  .delete(isAdminOrSuperAdmin, deleteStudent);

// Enrollment
router.post(
  "/:id/enroll",
  isAdminOrSuperAdmin,
  enrollStudentValidator,
  validate,
  enrollStudent,
);
router.post("/:id/unenroll", isAdminOrSuperAdmin, unenrollStudent);

// Attendance and payments
router.get("/:id/attendance", getStudentAttendance);
router.get("/:id/payments", getStudentPayments);

// Status management
router.post("/:id/freeze", isAdminOrSuperAdmin, freezeStudent);
router.post("/:id/unfreeze", isAdminOrSuperAdmin, unfreezeStudent);

module.exports = router;
