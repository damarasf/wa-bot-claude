/**
 * Chat Utility Module
 * Provides enhanced chat interaction functions for the bot
 */

const config = require('../config/config');
const logger = require('./logger');
const formatter = require('./formatter');

/**
 * Send a typing indicator before responding
 * @param {Object} client - The WhatsApp client instance
 * @param {string} to - The recipient chat ID
 * @param {number} duration - Duration in ms to show typing indicator
 * @returns {Promise<void>}
 */
const simulateTyping = async (client, to, duration = 1500) => {
  try {
    await client.simulateTyping(to, true);
    await new Promise(resolve => setTimeout(resolve, duration));
    await client.simulateTyping(to, false);
  } catch (error) {
    logger.logError('simulateTyping', error);
    // Continue without typing simulation if it fails
  }
};

/**
 * Get an interactive message with buttons
 * @param {string} title - Message title
 * @param {string} body - Message body
 * @param {Array<{id: string, text: string}>} buttons - Array of buttons
 * @returns {Object} - Interactive message object
 */
const getButtonsMessage = (title, body, buttons) => {
  return {
    title,
    body,
    buttons,
    footerText: 'Powered by WA Bot'
  };
};

/**
 * Send a message with buttons
 * @param {Object} client - The WhatsApp client instance
 * @param {string} to - The recipient chat ID
 * @param {string} title - Message title
 * @param {string} body - Message body
 * @param {Array<{id: string, text: string}>} buttons - Array of buttons
 * @returns {Promise<Object|boolean>} - Message send result or false if failed
 */
const sendButtons = async (client, to, title, body, buttons) => {
  try {
    // First try sending with the buttons API
    const message = getButtonsMessage(title, body, buttons);
    return await client.sendButtons(to, body, buttons, title);
  } catch (error) {
    // If buttons aren't supported, fall back to regular message
    logger.logError('sendButtons', error);
    
    // Create a fallback message with numbered options
    let fallbackMsg = `*${title}*\n\n${body}\n\n`;
    buttons.forEach((button, index) => {
      fallbackMsg += `${index + 1}. ${button.text}\n`;
    });
    fallbackMsg += '\nReply with the number of your choice.';
    
    return await client.sendText(to, fallbackMsg);
  }
};

/**
 * Reply with a quoted message
 * @param {Object} client - The WhatsApp client instance
 * @param {string} to - The recipient chat ID
 * @param {string} content - Message content
 * @param {string} quotedMsgId - ID of the message to quote
 * @param {boolean} useTyping - Whether to simulate typing
 * @returns {Promise<Object>} - Message send result
 */
const replyWithQuote = async (client, to, content, quotedMsgId, useTyping = true) => {
  if (useTyping) {
    await simulateTyping(client, to);
  }
  
  return await client.reply(to, content, quotedMsgId);
};

/**
 * Send an image with caption
 * @param {Object} client - The WhatsApp client instance
 * @param {string} to - The recipient chat ID
 * @param {string|Buffer} image - Image URL or buffer
 * @param {string} caption - Image caption
 * @returns {Promise<Object>} - Message send result
 */
const sendImage = async (client, to, image, caption = '') => {
  try {
    return await client.sendImage(to, image, 'image.jpg', caption);
  } catch (error) {
    logger.logError('sendImage', error);
    // Send text message as fallback
    await client.sendText(to, '❌ Failed to send image.\n\n' + caption);
    return false;
  }
};

module.exports = {
  simulateTyping,
  getButtonsMessage,
  sendButtons,
  replyWithQuote,
  sendImage
};
