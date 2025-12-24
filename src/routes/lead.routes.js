const express = require("express");
const router = express.Router();
const {
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  assignLead,
  addContactHistory,
  scheduleTest,
  recordTestResults,
  convertToStudent,
  rejectLead,
  getLeadStatistics,
  getNewLeads,
  bulkImportLeads,
} = require("../controllers/lead.controller");
const { protect, optionalAuth } = require("../middlewares/auth.middleware");
const { isAdminOrSuperAdmin } = require("../middlewares/role.middleware");

// Public route for lead creation (from website forms)
router.post("/", optionalAuth, createLead);

// Protected routes
router.use(protect);

// Statistics
router.get("/statistics", isAdminOrSuperAdmin, getLeadStatistics);
router.get("/new", isAdminOrSuperAdmin, getNewLeads);

// Bulk operations
router.post("/bulk-import", isAdminOrSuperAdmin, bulkImportLeads);

// CRUD operations
router.route("/").get(getAllLeads);

router
  .route("/:id")
  .get(getLeadById)
  .put(updateLead)
  .delete(isAdminOrSuperAdmin, deleteLead);

// Lead actions
router.post("/:id/assign", isAdminOrSuperAdmin, assignLead);
router.post("/:id/contact", addContactHistory);
router.post("/:id/schedule-test", scheduleTest);
router.post("/:id/test-results", recordTestResults);
router.post("/:id/convert", isAdminOrSuperAdmin, convertToStudent);
router.post("/:id/reject", rejectLead);

module.exports = router;
