/**
 * Formatter Utility
 * Provides formatting functions for messages and data
 */

/**
 * Format a phone number to a standard format
 * @param {string} phoneNumber - The phone number to format
 * @returns {string} - Formatted phone number
 */
const formatPhoneNumber = (phoneNumber) => {
  // Remove any non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // If it's a WhatsApp ID format (number@s.whatsapp.net), extract just the number
  if (phoneNumber.includes('@')) {
    return phoneNumber.split('@')[0];
  }
  
  return cleaned;
};

/**
 * Format a date to a readable string
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string
 */
const formatDate = (date) => {
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  };
  
  return date.toLocaleString('en-US', options);
};

/**
 * Format uptime in seconds to a readable format
 * @param {number} uptime - Uptime in seconds
 * @returns {string} - Formatted uptime string (e.g., "2d 5h 30m 15s")
 */
const formatUptime = (uptime) => {
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

/**
 * Format bytes to a human-readable string
 * @param {number} bytes - The number of bytes
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} - Formatted size string (e.g., "15.5 MB")
 */
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

/**
 * Create a command help text with description
 * @param {string} command - Command name with prefix (e.g., "!help")
 * @param {string} description - Command description
 * @param {string} usage - Command usage example
 * @returns {string} - Formatted command help text
 */
const formatCommandHelp = (command, description, usage) => {
  return `*${command}*\n${description}\nUsage: ${usage}`;
};

/**
 * Format a success message with optional details
 * @param {string} title - Success message title
 * @param {string|object} details - Message details as string or key-value object
 * @returns {string} - Formatted success message
 */
const success = (title, details = null) => {
  let message = `✅ *${title}*\n\n`;
  
  if (details) {
    if (typeof details === 'string') {
      message += details;
    } else if (typeof details === 'object') {
      Object.entries(details).forEach(([key, value]) => {
        message += `*${key}:* ${value}\n`;
      });
    }
  }
  
  return message;
};

/**
 * Format an error message with optional details
 * @param {string} title - Error message title
 * @param {string|object} details - Error details as string or key-value object
 * @returns {string} - Formatted error message
 */
const error = (title, details = null) => {
  let message = `❌ *${title}*\n\n`;
  
  if (details) {
    if (typeof details === 'string') {
      message += details;
    } else if (typeof details === 'object') {
      Object.entries(details).forEach(([key, value]) => {
        message += `*${key}:* ${value}\n`;
      });
    }
  }
  
  return message;
};

/**
 * Format an info message with optional details
 * @param {string} title - Info message title
 * @param {string|object} details - Message details as string or key-value object
 * @returns {string} - Formatted info message
 */
const info = (title, details = null) => {
  let message = `ℹ️ *${title}*\n\n`;
  
  if (details) {
    if (typeof details === 'string') {
      message += details;
    } else if (typeof details === 'object') {
      Object.entries(details).forEach(([key, value]) => {
        message += `*${key}:* ${value}\n`;
      });
    }
  }
  
  return message;
};

/**
 * Format a reminder message
 * @param {string} title - Reminder title
 * @param {string} message - Reminder message
 * @returns {string} - Formatted reminder message
 */
const reminder = (title, message) => {
  return `⏰ *${title}*\n\n${message}`;
};

/**
 * Format a list of items with a title
 * @param {string} title - List title
 * @param {Array<string>} items - Array of list items
 * @param {boolean} numbered - Whether to number the list items
 * @returns {string} - Formatted list
 */
const list = (title, items, numbered = true) => {
  let result = `*${title}*\n`;
  
  items.forEach((item, index) => {
    if (numbered) {
      result += `${index + 1}. ${item}\n`;
    } else {
      result += `• ${item}\n`;
    }
  });
  
  return result;
};

module.exports = {
  formatPhoneNumber,
  formatDate,
  formatUptime,
  formatBytes,
  formatCommandHelp,
  success,
  error,
  info,
  reminder,
  list
};