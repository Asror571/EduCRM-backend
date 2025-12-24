require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/database");
const logger = require("./src/utils/logger");

const PORT = process.env.PORT || 5000;

// Database connection
connectDB();

// Start server
const server = app.listen(PORT, () => {
  logger.info(
    `🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`,
  );
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║               🎓 EduCRM Backend API 🎓                    ║
║                                                           ║
║  Server:        http://localhost:${PORT}                     ║
║  Environment:   ${process.env.NODE_ENV}                            ║
║  API Version:   v1                                        ║
║                                                           ║
║  Endpoints:                                               ║
║  - Auth:        /api/v1/auth                              ║
║  - Students:    /api/v1/students                          ║
║  - Teachers:    /api/v1/teachers                          ║
║  - Groups:      /api/v1/groups                            ║
║  - Payments:    /api/v1/payments                          ║
║  - Leads:       /api/v1/leads                             ║
║  - Dashboard:   /api/v1/dashboard                         ║
║  - Reports:     /api/v1/reports                           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION! 💥 Shutting down...");
  logger.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM
process.on("SIGTERM", () => {
  logger.info("👋 SIGTERM RECEIVED. Shutting down gracefully");
  server.close(() => {
    logger.info("💥 Process terminated!");
  });
});
