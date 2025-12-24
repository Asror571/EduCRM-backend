/**
 * Format phone number
 */
const formatPhoneNumber = (phone) => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "");

  // Format: +998 XX XXX XX XX
  if (cleaned.length === 12 && cleaned.startsWith("998")) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10)}`;
  }

  return phone;
};

/**
 * Format currency (UZS)
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("uz-UZ", {
    style: "currency",
    currency: "UZS",
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format number with thousand separators
 */
const formatNumber = (number) => {
  return new Intl.NumberFormat("uz-UZ").format(number);
};

/**
 * Format name (Title Case)
 */
const formatName = (name) => {
  return name
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Format percentage
 */
const formatPercentage = (value, decimals = 2) => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Truncate text
 */
const truncateText = (text, length = 100) => {
  if (text.length <= length) {return text;}
  return text.substring(0, length) + "...";
};

/**
 * Format file size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) {return "0 Bytes";}

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

/**
 * Capitalize first letter
 */
const capitalizeFirst = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Convert to lowercase with underscores
 */
const toSnakeCase = (str) => {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
};

/**
 * Convert to camelCase
 */
const toCamelCase = (str) => {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
};

module.exports = {
  formatPhoneNumber,
  formatCurrency,
  formatNumber,
  formatName,
  formatPercentage,
  truncateText,
  formatFileSize,
  capitalizeFirst,
  toSnakeCase,
  toCamelCase,
};
