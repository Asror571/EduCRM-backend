const logger = require("../utils/logger");
const { errorResponse } = require("../utils/apiResponse");

/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, _next) => {
  const error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(err);

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error.statusCode = 404;
    error.message = message;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error.statusCode = 409;
    error.message = message;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message);
    error.statusCode = 400;
    error.message = message;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error.statusCode = 401;
    error.message = message;
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error.statusCode = 401;
    error.message = message;
  }

  // Multer errors
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      error.statusCode = 400;
      error.message = "File size is too large";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      error.statusCode = 400;
      error.message = "Too many files uploaded";
    }
  }

  return errorResponse(
    res,
    error.message || "Server Error",
    error.statusCode || 500,
  );
};

/**
 * Not found middleware
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = { errorHandler, notFound };
