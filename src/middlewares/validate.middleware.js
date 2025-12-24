const { validationResult } = require("express-validator");
const { validationErrorResponse } = require("../utils/apiResponse");

/**
 * Validate request using express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    return validationErrorResponse(res, formattedErrors);
  }

  next();
};

module.exports = validate;
