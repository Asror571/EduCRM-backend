const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");

/**
 * Generate unique student ID
 * Format: STD-YYYYMMDD-XXXX
 */
const generateStudentId = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `STD-${year}${month}${day}-${random}`;
};

/**
 * Generate unique teacher ID
 * Format: TCH-YYYYMMDD-XXXX
 */
const generateTeacherId = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `TCH-${year}${month}${day}-${random}`;
};

/**
 * Generate contract number
 * Format: CONTRACT-YYYY-XXXXX
 */
const generateContractNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);

  return `CONTRACT-${year}-${random}`;
};

/**
 * Generate receipt number
 * Format: RCP-YYYYMMDD-XXXX
 */
const generateReceiptNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `RCP-${year}${month}${day}-${random}`;
};

/**
 * Generate random password
 */
const generatePassword = (length = 8) => {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";

  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  return password;
};

/**
 * Generate username from name
 */
const generateUsername = (firstName, lastName) => {
  const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(100 + Math.random() * 900)}`;
  return username.replace(/\s/g, "");
};

/**
 * Hash password
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

/**
 * Compare password
 */
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Generate UUID
 */
const generateUUID = () => {
  return uuidv4();
};

/**
 * Generate OTP
 */
const generateOTP = (length = 6) => {
  const digits = "0123456789";
  let otp = "";

  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }

  return otp;
};

/**
 * Generate slug from text
 */
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/-+/g, "-");
};

module.exports = {
  generateStudentId,
  generateTeacherId,
  generateContractNumber,
  generateReceiptNumber,
  generatePassword,
  generateUsername,
  hashPassword,
  comparePassword,
  generateUUID,
  generateOTP,
  generateSlug,
};
