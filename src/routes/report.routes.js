const express = require("express");
const router = express.Router();
const {
  getFinancialReport,
  getStudentReport,
  getTeacherReport,
  getAttendanceReport,
  getLeadReport,
  generateCustomReport,
  exportReport,
  getMonthlySummary,
  getYearComparison,
} = require("../controllers/report.controller");
const { protect } = require("../middlewares/auth.middleware");
const { isAdminOrSuperAdmin } = require("../middlewares/role.middleware");

router.use(protect);
router.use(isAdminOrSuperAdmin);

// Standard reports
router.get("/financial", getFinancialReport);
router.get("/students", getStudentReport);
router.get("/teachers", getTeacherReport);
router.get("/attendance", getAttendanceReport);
router.get("/leads", getLeadReport);

// Custom and export
router.post("/custom", generateCustomReport);
router.get("/export/:type", exportReport);

// Summaries
router.get("/monthly-summary", getMonthlySummary);
router.get("/year-comparison", getYearComparison);

module.exports = router;
