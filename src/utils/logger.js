/**
 * Logger Utility
 * Provides logging functionality for the application
 */
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const commandLogFile = path.join(logsDir, 'commands.log');
const authLogFile = path.join(logsDir, 'auth.log');
const errorLogFile = path.join(logsDir, 'error.log');
const infoLogFile = path.join(logsDir, 'info.log'); // New info log file

/**
 * Write to log file with timestamp
 * @param {string} filePath - Path to log file
 * @param {string} message - Message to log
 */
const writeToLog = (filePath, message) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  fs.appendFile(filePath, logEntry, (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });
  
  // Also log to console in development mode
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${timestamp}] ${message}`);
  }
};

/**
 * Generic logging function
 * @param {string} level - Log level (info, debug, warn)
 * @param {string} message - Message to log
 */
const log = (level, message) => {
  // Default to info log file
  let logFile = infoLogFile;
  
  // Create a formatted log message with level
  const formattedMessage = `[${level.toUpperCase()}] ${message}`;
  
  writeToLog(logFile, formattedMessage);
};

/**
 * Log command usage
 * @param {string} phoneNumber - User's phone number
 * @param {string} command - Command executed
 * @param {boolean} success - Whether the command was executed successfully
 * @param {string} [error] - Error message if any
 */
const logCommand = (phoneNumber, command, success, error = null) => {
  const status = success ? 'SUCCESS' : 'FAILED';
  let message = `[COMMAND] [${status}] User ${phoneNumber} executed: ${command}`;
  
  if (error) {
    message += ` - Error: ${error}`;
  }
  
  writeToLog(commandLogFile, message);
};

/**
 * Log authentication attempts
 * @param {string} phoneNumber - User's phone number
 * @param {boolean} success - Whether authentication was successful
 */
const logAuth = (phoneNumber, success) => {
  const status = success ? 'SUCCESS' : 'FAILED';
  const message = `[AUTH] [${status}] User ${phoneNumber}`;
  
  writeToLog(authLogFile, message);
};

/**
 * Log application errors
 * @param {string} context - Error context
 * @param {Error} error - Error object
 */
const logError = (context, error) => {
  const message = `[ERROR] [${context}] ${error.message}\n${error.stack || ''}`;
  
  writeToLog(errorLogFile, message);
  
  // Always log errors to console
  console.error(`[ERROR] [${context}] ${error.message}`);
};

module.exports = {
  logCommand,
  logAuth,
  logError,
  log
};