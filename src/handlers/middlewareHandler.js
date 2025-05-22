/**
 * Middleware Handler
 * Contains middleware functions for authenticating users and other pre-processing
 */
const { isUserRegistered } = require('./userHandler');
const logger = require('../utils/logger');

/**
 * Authentication middleware to check if a user is registered
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The message object
 * @returns {Promise<boolean>} - True if user is authenticated, false otherwise
 */
const authenticate = async (client, message) => {
  const phoneNumber = message.sender.id.split('@')[0];
  
  // Check if user is registered
  const user = await isUserRegistered(phoneNumber);
  
  if (!user) {
    await client.reply(
      message.from,
      '❌ You need to register first!\nUse !register to register.',
      message.id
    );
    logger.logAuth(phoneNumber, false);
    return false;
  }
  
  logger.logAuth(phoneNumber, true);
  return user; // Return the user object for further use
};

/**
 * Command logger middleware
 * @param {Object} message - The message object
 * @param {string} command - The command executed
 * @param {boolean} success - Whether the command was executed successfully
 * @param {string} [error] - Error message if any
 */
const logCommand = (message, command, success, error = null) => {
  const phoneNumber = message.sender.id.split('@')[0];
  logger.logCommand(phoneNumber, command, success, error);
};

module.exports = {
  authenticate,
  logCommand
};