const express = require("express");
const router = express.Router();
const {
  getOverview,
  getFinancialDashboard,
  getAcademicDashboard,
  getCRMDashboard,
  getTeacherDashboard,
  getActivityFeed,
  getQuickStats,
} = require("../controllers/dashboard.controller");
const { protect } = require("../middlewares/auth.middleware");
const { isAdminOrSuperAdmin } = require("../middlewares/role.middleware");

router.use(protect);

// Quick stats (available for all roles)
router.get("/quick-stats", getQuickStats);

// Admin dashboards
router.get("/overview", isAdminOrSuperAdmin, getOverview);
router.get("/financial", isAdminOrSuperAdmin, getFinancialDashboard);
router.get("/academic", isAdminOrSuperAdmin, getAcademicDashboard);
router.get("/crm", isAdminOrSuperAdmin, getCRMDashboard);
router.get("/teachers", isAdminOrSuperAdmin, getTeacherDashboard);
router.get("/activity", isAdminOrSuperAdmin, getActivityFeed);

module.exports = router;
