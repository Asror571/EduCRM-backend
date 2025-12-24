const moment = require("moment");

/**
 * Format date
 */
const formatDate = (date, format = "YYYY-MM-DD") => {
  return moment(date).format(format);
};

/**
 * Format datetime
 */
const formatDateTime = (date, format = "YYYY-MM-DD HH:mm:ss") => {
  return moment(date).format(format);
};

/**
 * Get current date
 */
const getCurrentDate = () => {
  return moment().format("YYYY-MM-DD");
};

/**
 * Get current datetime
 */
const getCurrentDateTime = () => {
  return moment().format("YYYY-MM-DD HH:mm:ss");
};

/**
 * Add days to date
 */
const addDays = (date, days) => {
  return moment(date).add(days, "days").toDate();
};

/**
 * Subtract days from date
 */
const subtractDays = (date, days) => {
  return moment(date).subtract(days, "days").toDate();
};

/**
 * Add months to date
 */
const addMonths = (date, months) => {
  return moment(date).add(months, "months").toDate();
};

/**
 * Get difference in days
 */
const getDaysDifference = (date1, date2) => {
  return moment(date1).diff(moment(date2), "days");
};

/**
 * Check if date is past
 */
const isPast = (date) => {
  return moment(date).isBefore(moment());
};

/**
 * Check if date is future
 */
const isFuture = (date) => {
  return moment(date).isAfter(moment());
};

/**
 * Check if date is today
 */
const isToday = (date) => {
  return moment(date).isSame(moment(), "day");
};

/**
 * Get start of month
 */
const getStartOfMonth = (date = new Date()) => {
  return moment(date).startOf("month").toDate();
};

/**
 * Get end of month
 */
const getEndOfMonth = (date = new Date()) => {
  return moment(date).endOf("month").toDate();
};

/**
 * Get age from birth date
 */
const getAge = (birthDate) => {
  return moment().diff(moment(birthDate), "years");
};

/**
 * Get time from now
 */
const getTimeFromNow = (date) => {
  return moment(date).fromNow();
};

/**
 * Check if date is between two dates
 */
const isBetween = (date, startDate, endDate) => {
  return moment(date).isBetween(startDate, endDate, null, "[]");
};

module.exports = {
  formatDate,
  formatDateTime,
  getCurrentDate,
  getCurrentDateTime,
  addDays,
  subtractDays,
  addMonths,
  getDaysDifference,
  isPast,
  isFuture,
  isToday,
  getStartOfMonth,
  getEndOfMonth,
  getAge,
  getTimeFromNow,
  isBetween,
};
