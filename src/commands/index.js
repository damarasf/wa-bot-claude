const userHandler = require('../handlers/userHandler');
const middlewareHandler = require('../handlers/middlewareHandler');
const infoCommands = require('./infoCommands');
const utilityCommands = require('./utilityCommands');
const logger = require('../utils/logger');
const formatter = require('../utils/formatter');

const validator = require('../utils/validator');

// Command to register a new user
const register = async (client, message) => {
  const sender = message.sender;
  const senderId = sender.id;
  const phoneNumber = senderId.split('@')[0];
  
  // Get contact info from WhatsApp (just for display purposes, not saved)
  let displayName = 'User';
  
  try {
    // Get contact info from WhatsApp if available
    const contact = await client.getContact(senderId);
    
    // Get display name from contact or fallback to pushname or "User"
    displayName = contact.name || contact.formattedName || sender.pushname || 'User';
    
    // Log retrieved contact info
    logger.log('info', `Contact info retrieved: ${displayName} (${phoneNumber})`);
  } catch (error) {
    logger.logError('Failed to get contact info', error);
    displayName = sender.pushname || 'User';
  }
  
  // Check if this user is the owner from environment
  const ownerNumber = process.env.OWNER_PHONE_NUMBER || '';
  const isOwner = phoneNumber === ownerNumber;
  let isAdmin = false;
  let isPremium = false;
    // If owner is registering, automatically make them admin and premium
  if (isOwner) {
    isAdmin = true;
    isPremium = true;
    logger.log('info', `Owner registration detected: ${phoneNumber}`);
  } else {
    // If not owner, check for regular admin registration
    const arg = message.body.trim().split(' ');
    
    if (arg.length > 1 && arg[1].toLowerCase() === 'admin') {
      // Get admin password from environment
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      
      // Check if admin password is provided and correct
      if (arg.length > 2 && arg[2] === adminPassword) {
        isAdmin = true;
        isPremium = true; // Make admin automatically premium
        logger.log('info', `Admin registration with premium status: ${phoneNumber}`);
      } else {
        await client.reply(
          message.from,
          formatter.error(
            'Admin Registration Failed', 
            'Invalid admin password. Please try again with correct password.'
          ),
          message.id
        );
        logger.logCommand(phoneNumber, 'register', false, 'Invalid admin password');
        return;
      }
    }
  }
    // Check if user is already registered
  const isRegistered = await userHandler.isUserRegistered(phoneNumber);
  
  if (isRegistered) {
    await client.reply(
      message.from,
      formatter.info(
        'Already Registered', 
        `Hi ${displayName}, you're already registered!`
      ),
      message.id
    );
    logger.logCommand(phoneNumber, 'register', false, 'User already registered');
    return;
  }
    // Register the user
  const result = await userHandler.registerUser(phoneNumber, isAdmin, isPremium);
    if (result.success) {
    const responseInfo = {
      'Phone': phoneNumber,
      'Welcome': 'You can now use all bot features!'
    };
    
    // Add roles to response
    if (isOwner) {
      responseInfo['Role'] = 'Owner';
      responseInfo['Status'] = 'Premium';
    } else if (isAdmin) {
      responseInfo['Role'] = 'Administrator';
    }
    
    if (isPremium && !isOwner) {
      responseInfo['Status'] = 'Premium';
    }
    
    await client.reply(
      message.from,
      formatter.success(
        'Registration successful!',
        responseInfo
      ),
      message.id
    );
    logger.logCommand(phoneNumber, 'register', true);
  } else {
    await client.reply(
      message.from,
      formatter.error('Registration failed', result.message),
      message.id
    );
    logger.logCommand(phoneNumber, 'register', false, result.message);
  }
};

// Command to check user status
const status = async (client, message) => {
  const sender = message.sender;
  const senderId = sender.id;
  const phoneNumber = senderId.split('@')[0];
  
  // Get display name from WhatsApp
  let displayName = 'User';
  
  try {
    const contact = await client.getContact(senderId);
    displayName = contact.name || contact.formattedName || sender.pushname || 'User';
  } catch (error) {
    logger.logError('Failed to get contact info', error);
    displayName = sender.pushname || 'User';
  }
  
  // Check if user is registered
  const user = await userHandler.isUserRegistered(phoneNumber);
  
  if (user) {
    const userInfo = {
      'Name': displayName,
      'Phone': phoneNumber,
      'Registered': 'Yes',
      'Registration Date': new Date(user.createdAt).toLocaleString()
    };
    
    // Add admin status if applicable
    if (user.isAdmin) {
      userInfo['Role'] = 'Administrator';
    }
    
    await client.reply(
      message.from,
      formatter.info('👤 User Information', userInfo),
      message.id
    );
  } else {
    await client.reply(
      message.from,
      formatter.error(
        'Not Registered',
        `Hi ${displayName}, you are not registered yet!\nUse !register to register.`
      ),
      message.id
    );  }
};

// Command to display help menu
const help = async (client, message) => {  const generalCommands = [
    'register - Register as a new user',
    'status - Check your registration status',
    'help - Show this help menu'
  ];
  
  const infoCommands = [
    'botinfo - Display bot information',
    'datetime - Show current date and time',
    'ping - Test bot response time',
    'weather [city] - Get current weather information'
  ];
  
  const utilityCommands = [
    'echo [text] - Echo back your text',
    'random [min] [max] - Generate a random number',
    'calc [expression] - Calculate math expressions'
  ];
  
  const reminderCommands = [
    'remind [time] [message] - Set a reminder (e.g., 5m, 2h, 1d)',
    'reminders - List all your pending reminders',
    'cancelreminder [number] - Cancel a specific reminder'
  ];
  
  const noteCommands = [
    'note add [title] | [content] | [tags] - Add a new note',
    'note list - List all your notes',
    'note [id] - View a specific note',
    'note delete [id] - Delete a specific note',
    'note search [query] - Search your notes'
  ];
  
  const n8nCommands = [
    'n8n activate - Activate N8N Integration for 1 hour',
    'n8n deactivate - Deactivate N8N Integration',
    'n8n status - Check N8N Integration status'
  ];
    const adminCommands = [
    'admin stats - Show bot statistics',
    'admin broadcast [message] - Send message to all users',
    'admin restart - Restart the bot',
    'n8n premium [phone] - Upgrade user to premium N8N Integration'
  ];
  
  const ownerCommands = [
    'admin makeadmin [phone] - Make a user an admin (owner only)'
  ];
  
  let helpText = formatter.info('WhatsApp Bot Commands', '');
  
  helpText += formatter.list('General Commands', generalCommands, false);
  helpText += '\n\n';
  
  helpText += '💡 *The following commands require registration:*\n\n';
  
  helpText += formatter.list('Info Commands', infoCommands, false);
  helpText += '\n\n';
    helpText += formatter.list('Utility Commands', utilityCommands, false);
  helpText += '\n\n';
  
  helpText += formatter.list('Reminder Commands', reminderCommands, false);
  helpText += '\n\n';
    helpText += formatter.list('Note Commands', noteCommands, false);
  helpText += '\n\n';
  
  helpText += formatter.list('🔌 N8N Integration', n8nCommands, false);
    // Check if the user is an admin
  const adminHandler = require('./adminCommands');
  const phoneNumber = message.sender.id.split('@')[0];
  const isOwnerUser = phoneNumber === require('../config/config').owner.phoneNumber;
  
  if (isOwnerUser) {
    helpText += '\n\n';
    helpText += formatter.list('👑 Admin Commands', adminCommands, false);
    helpText += '\n\n';
    helpText += formatter.list('🔐 Owner Commands', ownerCommands, false);
  } else if (await adminHandler.isAdmin(phoneNumber)) {
    helpText += '\n\n';
    helpText += formatter.list('👑 Admin Commands', adminCommands, false);
  }
  
  await client.reply(message.from, helpText, message.id);
  logger.logCommand(message.sender.id, 'help', true);
};

module.exports = {
  // Basic commands
  register,
  status,
  help,
  
  // Info commands
  botInfo: infoCommands.botInfo,
  dateTime: infoCommands.dateTime,
  ping: infoCommands.ping,
  
  // Utility commands
  echo: utilityCommands.echo,
  random: utilityCommands.random,
  calculate: utilityCommands.calculate,
  
  // Middleware
  authenticate: middlewareHandler.authenticate
};
