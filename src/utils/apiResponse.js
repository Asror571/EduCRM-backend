/**
 * Success Response
 */
const successResponse = (
  res,
  message = "Success",
  data = null,
  statusCode = 200,
) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Error Response
 */
const errorResponse = (
  res,
  message = "Error occurred",
  statusCode = 500,
  errors = null,
) => {
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Paginated Response
 */
const paginatedResponse = (
  res,
  data,
  page,
  limit,
  total,
  message = "Success",
) => {
  const totalPages = Math.ceil(total / limit);

  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalItems: total,
      itemsPerPage: parseInt(limit),
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
};

/**
 * Created Response
 */
const createdResponse = (
  res,
  message = "Created successfully",
  data = null,
) => {
  return successResponse(res, message, data, 201);
};

/**
 * No Content Response
 */
const noContentResponse = (res) => {
  return res.status(204).send();
};

/**
 * Bad Request Response
 */
const badRequestResponse = (res, message = "Bad request", errors = null) => {
  return errorResponse(res, message, 400, errors);
};

/**
 * Unauthorized Response
 */
const unauthorizedResponse = (res, message = "Unauthorized") => {
  return errorResponse(res, message, 401);
};

/**
 * Forbidden Response
 */
const forbiddenResponse = (res, message = "Forbidden") => {
  return errorResponse(res, message, 403);
};

/**
 * Not Found Response
 */
const notFoundResponse = (res, message = "Resource not found") => {
  return errorResponse(res, message, 404);
};

/**
 * Conflict Response
 */
const conflictResponse = (res, message = "Conflict occurred") => {
  return errorResponse(res, message, 409);
};

/**
 * Validation Error Response
 */
const validationErrorResponse = (res, errors) => {
  return errorResponse(res, "Validation failed", 422, errors);
};

/**
 * Internal Server Error Response
 */
const internalServerErrorResponse = (
  res,
  message = "Internal server error",
) => {
  return errorResponse(res, message, 500);
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  createdResponse,
  noContentResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  validationErrorResponse,
  internalServerErrorResponse,
  // Aliases
  success: successResponse,
  error: errorResponse,
  paginated: paginatedResponse,
  created: createdResponse,
  badRequest: badRequestResponse,
  unauthorized: unauthorizedResponse,
  forbidden: forbiddenResponse,
  notFound: notFoundResponse,
  conflict: conflictResponse,
  validationError: validationErrorResponse,
  internalServerError: internalServerErrorResponse,
};
