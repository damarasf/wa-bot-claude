/**
 * Input Validator Utility
 * Provides functions for validating user inputs
 */

/**
 * Validates a username
 * @param {string} username - The username to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidUsername = (username) => {
  // Username should be at least 3 characters long
  // and contain only alphanumeric characters and underscores
  const regex = /^[a-zA-Z0-9_]{3,20}$/;
  return regex.test(username);
};

/**
 * Validates a phone number
 * @param {string} phoneNumber - The phone number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidPhoneNumber = (phoneNumber) => {
  // Phone number should be a valid international format
  // This is a basic check, can be expanded for more specific validations
  const regex = /^\d{10,15}$/;
  return regex.test(phoneNumber);
};

/**
 * Validates a mathematical expression
 * @param {string} expression - The mathematical expression to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidMathExpression = (expression) => {
  // Remove all valid math characters to see if any invalid characters remain
  const cleaned = expression.replace(/[0-9+\-*/(). ]/g, '');
  return cleaned.length === 0;
};

/**
 * Validates a random number range
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidRandomRange = (min, max) => {
  return !isNaN(min) && !isNaN(max) && min < max;
};

module.exports = {
  isValidUsername,
  isValidPhoneNumber,
  isValidMathExpression,
  isValidRandomRange
};
