const express = require("express");
const router = express.Router();

// Import all route modules
const authRoutes = require("./auth.routes");
const adminRoutes = require("./admin.routes");
const studentRoutes = require("./student.routes");
const teacherRoutes = require("./teacher.routes");
const courseRoutes = require("./course.routes");
const groupRoutes = require("./group.routes");
const paymentRoutes = require("./payment.routes");
const leadRoutes = require("./lead.routes");
const dashboardRoutes = require("./dashboard.routes");
const reportRoutes = require("./report.routes");

// API Info
router.get("/", (req, res) => {
  res.json({
    message: "EduCRM API",
    version: "1.0.0",
    documentation: "/api-docs",
    endpoints: {
      auth: "/api/v1/auth",
      admin: "/api/v1/admin",
      students: "/api/v1/students",
      teachers: "/api/v1/teachers",
      courses: "/api/v1/courses",
      groups: "/api/v1/groups",
      payments: "/api/v1/payments",
      leads: "/api/v1/leads",
      dashboard: "/api/v1/dashboard",
      reports: "/api/v1/reports",
    },
  });
});

// Mount routes
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/students", studentRoutes);
router.use("/teachers", teacherRoutes);
router.use("/courses", courseRoutes);
router.use("/groups", groupRoutes);
router.use("/payments", paymentRoutes);
router.use("/leads", leadRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/reports", reportRoutes);

module.exports = router;
