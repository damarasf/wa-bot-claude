/**
 * Admin Commands Module
 * Contains commands that can only be executed by admins or the owner
 */

const config = require('../config/config');
const logger = require('../utils/logger');
const formatter = require('../utils/formatter');
const chat = require('../utils/chat');
const { sequelize } = require('../models');

/**
 * Check if a user is the owner
 * @param {string} phoneNumber - User's phone number
 * @returns {boolean} - True if owner, false otherwise
 */
const isOwner = (phoneNumber) => {
  return phoneNumber === config.owner.phoneNumber;
};

/**
 * Check if a user is an admin
 * @param {Object|string} user - User object or phone number
 * @returns {Promise<boolean>} - True if admin or owner, false otherwise
 */
const isAdmin = async (user) => {
  // If passed a phone number string instead of a user object
  if (typeof user === 'string') {
    const { sequelize } = require('../models');
    const phoneNumber = user;
    
    // First check if user is the owner (from env)
    if (isOwner(phoneNumber)) {
      return true;
    }
    
    // Look up the user in the database
    const userRecord = await sequelize.models.User.findOne({ 
      where: { phoneNumber } 
    });
    
    // Return true if the user exists and is an admin
    return userRecord ? userRecord.isAdmin : false;
  }
  
  // If passed a user object directly
  if (!user) return false;
  
  // Check if user is owner
  if (isOwner(user.phoneNumber)) {
    return true;
  }
  
  return user.isAdmin;
};

/**
 * Get bot statistics
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The message object
 */
const stats = async (client, message) => {
  try {
    // Check if the user is an admin using the updated function
    const phoneNumber = message.sender.id.split('@')[0];
    const isUserAdmin = await isAdmin(phoneNumber);
    
    if (!isUserAdmin) {
      await client.reply(
        message.from,
        formatter.error('Access Denied', 'This command is only available to administrators.'),
        message.id
      );
      logger.logCommand(phoneNumber, 'admin.stats', false, 'Not an admin');
      return;
    }
    
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    // Get user count from database
    const userCount = await sequelize.models.User.count();
    
    const statsData = {
      'Uptime': formatter.formatUptime(uptime),
      'Memory Usage': formatter.formatBytes(memoryUsage.heapUsed),
      'Total Users': userCount.toString(),
      'Node.js Version': process.version,
      'Platform': process.platform
    };
    
    const statsMessage = formatter.info('📊 Bot Statistics', statsData);
    
    await chat.replyWithQuote(client, message.from, statsMessage, message.id);
    logger.logCommand(phoneNumber, 'admin.stats', true);
  } catch (error) {
    logger.logError('admin.stats', error);
    await client.reply(
      message.from, 
      formatter.error('Error fetching statistics', error.message),
      message.id
    );
    logger.logCommand(message.sender.id.split('@')[0], 'admin.stats', false, error.message);
  }
};

/**
 * Broadcast a message to all users
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The message object
 */
const broadcast = async (client, message) => {
  try {
    // Check if the user is an admin using the updated function
    const phoneNumber = message.sender.id.split('@')[0];
    const isUserAdmin = await isAdmin(phoneNumber);
    
    if (!isUserAdmin) {
      await client.reply(
        message.from,
        formatter.error('Access Denied', 'This command is only available to administrators.'),
        message.id
      );
      logger.logCommand(phoneNumber, 'admin.broadcast', false, 'Not an admin');
      return;
    }
    
    const args = message.body.split(' ');
    args.shift(); // Remove command
    
    const broadcastMessage = args.join(' ');
    
    if (!broadcastMessage) {
      await client.reply(
        message.from,
        formatter.error('Invalid format', 'Usage: !admin broadcast [message]'),
        message.id
      );
      logger.logCommand(phoneNumber, 'admin.broadcast', false, 'No message provided');
      return;
    }
    
    // Get all users from database
    const users = await sequelize.models.User.findAll();
    
    if (!users.length) {
      await client.reply(
        message.from,
        formatter.info('Broadcast Result', 'No users found to broadcast to.'),
        message.id
      );
      return;
    }
    
    // Send confirmation
    await client.reply(
      message.from,
      formatter.info('Broadcasting Message', `Sending message to ${users.length} users...`),
      message.id
    );
    
    // Format the broadcast message
    const formattedMessage = `📢 *BROADCAST MESSAGE*\n\n${broadcastMessage}\n\n_This is an automated broadcast message from the bot administrator._`;
    
    // Counter for successful sends
    let successCount = 0;
    
    // Send to all users
    for (const user of users) {
      try {
        // Format phone number as WhatsApp ID
        const to = `${user.phoneNumber}@s.whatsapp.net`;
        await client.sendText(to, formattedMessage);
        successCount++;
        
        // Small delay to prevent flooding
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        logger.logError('admin.broadcast.send', err);
      }
    }
    
    // Send completion notification
    await client.reply(
      message.from,
      formatter.success('Broadcast Complete', `Message sent to ${successCount}/${users.length} users.`),
      message.id
    );
    
    logger.logCommand(message.sender.id.split('@')[0], 'admin.broadcast', true);
  } catch (error) {
    logger.logError('admin.broadcast', error);
    await client.reply(
      message.from,
      formatter.error('Error sending broadcast', error.message),
      message.id
    );
    logger.logCommand(message.sender.id.split('@')[0], 'admin.broadcast', false, error.message);
  }
};

/**
 * Restart the WhatsApp client
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The message object
 */
const restart = async (client, message) => {
  // Check if the user is an admin using the updated function
  const phoneNumber = message.sender.id.split('@')[0];
  const isUserAdmin = await isAdmin(phoneNumber);
  
  if (!isUserAdmin) {
    await client.reply(
      message.from,
      formatter.error('Access Denied', 'This command is only available to administrators.'),
      message.id
    );
    logger.logCommand(phoneNumber, 'admin.restart', false, 'Not an admin');
    return;
  }

  await client.reply(
    message.from,
    formatter.info('System Restart', 'Bot is restarting... This may take a moment.'),
    message.id
  );
  
  logger.logCommand(phoneNumber, 'admin.restart', true);
  
  // Force restart (implementation depends on your deployment)
  try {
    // Attempt graceful restart
    await client.sendText(message.from, '🔄 Restarting services...');
    
    // In a real implementation, you might want to use process manager like PM2
    // For now, just exit and let the process manager restart it
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  } catch (error) {
    logger.logError('admin.restart', error);
  }
};

/**
 * Make a user an admin (owner only)
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The message object
 */
const makeAdmin = async (client, message) => {
  try {
    // Get phone number of message sender
    const senderPhoneNumber = message.sender.id.split('@')[0];
    
    // Check if the sender is the owner
    if (!isOwner(senderPhoneNumber)) {
      await client.reply(
        message.from,
        formatter.error('Access Denied', 'This command is only available to the owner.'),
        message.id
      );
      logger.logCommand(senderPhoneNumber, 'admin.makeAdmin', false, 'Not the owner');
      return;
    }
    
    // Get arguments from command
    const args = message.body.split(' ');
    if (args.length < 2) {
      await client.reply(
        message.from,
        formatter.error('Invalid Command', 'Please provide a phone number to make admin.\nUsage: !makeadmin <phone_number>'),
        message.id
      );
      logger.logCommand(senderPhoneNumber, 'admin.makeAdmin', false, 'Missing phone number argument');
      return;
    }
    
    // Get the target phone number, remove any non-digit characters
    let targetPhoneNumber = args[1].replace(/\D/g, '');
    
    // Ensure the phone number starts with the country code
    if (!targetPhoneNumber.startsWith('62') && targetPhoneNumber.startsWith('0')) {
      targetPhoneNumber = '62' + targetPhoneNumber.slice(1);
    }
    
    // First, check if user exists in database
    let user = await sequelize.models.User.findOne({
      where: { phoneNumber: targetPhoneNumber }
    });
    
    // If user doesn't exist, register them automatically
    if (!user) {      // Create user record with admin privileges and premium status
      user = await sequelize.models.User.create({
        phoneNumber: targetPhoneNumber,
        isAdmin: true,
        isPremium: true  // Admins are automatically premium
      });
      
      await client.reply(
        message.from,
        formatter.success('Admin Created', `User ${targetPhoneNumber} has been registered as an admin and premium user.`),
        message.id
      );
      logger.logCommand(senderPhoneNumber, 'admin.makeAdmin', true, 'Created new admin user with premium status');
    } else {
      // Update existing user to admin and premium
      await user.update({ isAdmin: true, isPremium: true });
      
      await client.reply(
        message.from,
        formatter.success('Admin Update', `User ${targetPhoneNumber} has been updated to admin and premium status.`),
        message.id
      );
      logger.logCommand(senderPhoneNumber, 'admin.makeAdmin', true, 'Updated user to admin');
    }
  } catch (error) {
    logger.logError('admin.makeAdmin', error);
    await client.reply(
      message.from,
      formatter.error('Error making user admin', error.message),
      message.id
    );
    logger.logCommand(message.sender.id.split('@')[0], 'admin.makeAdmin', false, error.message);
  }
};

module.exports = {
  isAdmin,
  stats,
  broadcast,
  restart,
  makeAdmin
};
