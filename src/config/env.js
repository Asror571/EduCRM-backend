require("dotenv").config();

// Validate required environment variables
const requiredEnvVars = [
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "MONGODB_URI",
];

const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !process.env[envVar],
);

if (missingEnvVars.length > 0) {
  console.error(
    "❌ Missing required environment variables:",
    missingEnvVars.join(", "),
  );
  if (process.env.NODE_ENV === "production") {
    throw new Error("Required environment variables are missing");
  }
}

module.exports = {
  // Server
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 5000,
  API_VERSION: process.env.API_VERSION || "v1",

  // Database
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/educrm",

  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRE: process.env.JWT_EXPIRE || "7d",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || "30d",

  // Email
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  EMAIL_FROM: process.env.EMAIL_FROM,

  // SMS
  SMS_API_URL: process.env.SMS_API_URL,
  SMS_EMAIL: process.env.SMS_EMAIL,
  SMS_PASSWORD: process.env.SMS_PASSWORD,

  // Redis
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: process.env.REDIS_PORT || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || "",

  // File Upload
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5242880,
  ALLOWED_FILE_TYPES:
    process.env.ALLOWED_FILE_TYPES ||
    "image/jpeg,image/png,image/jpg,application/pdf",

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
};
