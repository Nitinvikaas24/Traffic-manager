/**
 * Data Validation Utility Functions
 */

// Validate if a string is not empty
const isValidString = (str) => {
  return typeof str === 'string' && str.trim().length > 0;
};

// Validate if a number is within range
const isValidNumber = (num, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) => {
  return typeof num === 'number' && !isNaN(num) && num >= min && num <= max;
};

// Validate if a date string is valid
const isValidDate = (dateStr) => {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

// Validate array length
const isValidArray = (arr, minLength = 0, maxLength = Infinity) => {
  return Array.isArray(arr) && arr.length >= minLength && arr.length <= maxLength;
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate if an object has required fields
const hasRequiredFields = (obj, requiredFields) => {
  if (!obj || typeof obj !== 'object') return false;
  return requiredFields.every(field => Object.prototype.hasOwnProperty.call(obj, field) && obj[field] !== undefined);
};

module.exports = {
  isValidString,
  isValidNumber,
  isValidDate,
  isValidArray,
  isValidEmail,
  hasRequiredFields
}; 