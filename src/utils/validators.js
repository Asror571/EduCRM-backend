const validator = require("validator");

/**
 * Validate email
 */
const isValidEmail = (email) => {
  return validator.isEmail(email);
};

/**
 * Validate phone number (Uzbekistan format)
 */
const isValidPhone = (phone) => {
  // Format: +998XXXXXXXXX or 998XXXXXXXXX
  const phoneRegex = /^\+?998[0-9]{9}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate password strength
 */
const isStrongPassword = (password) => {
  return validator.isStrongPassword(password, {
    minLength: 6,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 0,
  });
};

/**
 * Validate URL
 */
const isValidURL = (url) => {
  return validator.isURL(url);
};

/**
 * Validate date
 */
const isValidDate = (date) => {
  return validator.isDate(date);
};

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  return validator.isMongoId(id);
};

/**
 * Sanitize input
 */
const sanitizeInput = (input) => {
  return validator.escape(input);
};

/**
 * Validate age (must be at least minAge)
 */
const isValidAge = (birthDate, minAge = 5) => {
  const today = new Date();
  const birth = new Date(birthDate);
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    return age - 1 >= minAge;
  }

  return age >= minAge;
};

/**
 * Validate number range
 */
const isInRange = (value, min, max) => {
  return value >= min && value <= max;
};

/**
 * Validate required fields
 */
const hasRequiredFields = (obj, fields) => {
  return fields.every(
    (field) =>
      Object.prototype.hasOwnProperty.call(obj, field) &&
      obj[field] !== null &&
      obj[field] !== undefined,
  );
};

module.exports = {
  isValidEmail,
  isValidPhone,
  isStrongPassword,
  isValidURL,
  isValidDate,
  isValidObjectId,
  sanitizeInput,
  isValidAge,
  isInRange,
  hasRequiredFields,
};
