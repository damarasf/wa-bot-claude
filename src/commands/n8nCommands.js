/**
 * N8N Integration Commands
 * Provides commands for activating, deactivating, and managing N8N integration
 */
const n8nHandler = require('../handlers/n8nHandler');
const adminCommands = require('./adminCommands');
const { isUserRegistered } = require('../handlers/userHandler');
const db = require('../models');
const logger = require('../utils/logger');
const formatter = require('../utils/formatter');

/**
 * Activate N8N integration
 * @param {Object} client - WhatsApp client
 * @param {Object} message - Message object
 */
const activate = async (client, message) => {
  try {
    const { from, id, sender, isGroupMsg } = message;
    const phoneNumber = sender.id.split('@')[0];

    let result;
    if (isGroupMsg) {
      // Group chat activation
      result = await n8nHandler.activateForGroup(from, phoneNumber);
      
      if (result.success) {
        // Format remaining time in human-readable format
        const expiryTime = new Date(result.groupIntegration.sessionExpiry);
        const expiryTimeString = expiryTime.toLocaleTimeString();
        
        await client.reply(
          from,
          formatter.success(
            '🔌 N8N Integration Activated for Group', 
            {
              'Status': 'Active',
              'Session expires': `at ${expiryTimeString}`,
              'Daily limit': `${result.groupIntegration.dailyLimit} requests`,
              'Used today': `${result.groupIntegration.usageCount} requests`,
              'How to use': 'Just type normally without commands',
              'Note': 'Will auto-deactivate after 1 hour'
            }
          ),
          id
        );
        
        logger.logCommand(phoneNumber, 'n8n.activate.group', true);
      } else {
        await client.reply(
          from,
          formatter.error('Failed to activate N8N for Group', result.message),
          id
        );
        
        logger.logCommand(phoneNumber, 'n8n.activate.group', false, result.message);
      }
    } else {
      // Personal chat activation
      result = await n8nHandler.activateForUser(phoneNumber);
      
      if (result.success) {
        // Format remaining time in human-readable format
        const expiryTime = new Date(result.integration.sessionExpiry);
        const expiryTimeString = expiryTime.toLocaleTimeString();
        
        await client.reply(
          from,
          formatter.success(
            '🔌 N8N Integration Activated', 
            {
              'Status': 'Active',
              'Session expires': `at ${expiryTimeString}`,
              'Daily limit': `${result.integration.dailyLimit} requests`,
              'Used today': `${result.integration.usageCount} requests`,
              'How to use': 'Just type normally without commands',
              'Note': 'Will auto-deactivate after 1 hour'
            }
          ),
          id
        );
        
        logger.logCommand(phoneNumber, 'n8n.activate', true);
      } else {
        await client.reply(
          from,
          formatter.error('Failed to activate N8N integration', result.message),
          id
        );
        
        logger.logCommand(phoneNumber, 'n8n.activate', false, result.message);
      }
    }
  } catch (error) {
    logger.logError('n8nCommands.activate', error);
    
    await client.reply(
      message.from,
      formatter.error('Error', 'Failed to activate N8N integration. Please try again.'),
      message.id
    );
  }
};

/**
 * Deactivate N8N integration
 * @param {Object} client - WhatsApp client
 * @param {Object} message - Message object
 */
const deactivate = async (client, message) => {
  try {
    const { from, id, sender, isGroupMsg } = message;
    const phoneNumber = sender.id.split('@')[0];

    let result;
    if (isGroupMsg) {
      // Group chat deactivation
      result = await n8nHandler.deactivateForGroup(from, phoneNumber);
      
      if (result.success) {
        await client.reply(
          from,
          formatter.success(
            '🔌 N8N Integration Deactivated for Group', 
            {
              'Status': 'Inactive',
              'Message': 'Group members now need to use regular commands with prefixes.'
            }
          ),
          id
        );
        
        logger.logCommand(phoneNumber, 'n8n.deactivate.group', true);
      } else {
        await client.reply(
          from,
          formatter.error('Failed to deactivate N8N for Group', result.message),
          id
        );
        
        logger.logCommand(phoneNumber, 'n8n.deactivate.group', false, result.message);
      }
    } else {
      // Personal chat deactivation
      result = await n8nHandler.deactivateForUser(phoneNumber);
      
      if (result.success) {
        await client.reply(
          from,
          formatter.success(
            '🔌 N8N Integration Deactivated', 
            {
              'Status': 'Inactive',
              'Message': 'You now need to use regular commands with prefixes.'
            }
          ),
          id
        );
        
        logger.logCommand(phoneNumber, 'n8n.deactivate', true);
      } else {
        await client.reply(
          from,
          formatter.error('Failed to deactivate N8N integration', result.message),
          id
        );
        
        logger.logCommand(phoneNumber, 'n8n.deactivate', false, result.message);
      }
    }
  } catch (error) {
    logger.logError('n8nCommands.deactivate', error);
    
    await client.reply(
      message.from,
      formatter.error('Error', 'Failed to deactivate N8N integration. Please try again.'),
      message.id
    );
  }
};

/**
 * Display N8N integration status
 * @param {Object} client - WhatsApp client
 * @param {Object} message - Message object
 */
const status = async (client, message) => {
  try {
    const { from, id, sender, isGroupMsg } = message;
    const phoneNumber = sender.id.split('@')[0];

    let result;
    if (isGroupMsg) {      // Group status
      result = await n8nHandler.getStatusForGroup(from);
      
      // Get group activator's premium status
      let isPremium = false;
      if (result.success && result.activatorUserId) {
        const activator = await db.User.findByPk(result.activatorUserId);
        if (activator) {
          isPremium = activator.isPremium;
        }
      }
      
      if (result.success) {
        const statusInfo = {
          'Status': result.status,
          'Premium': isPremium ? 'Yes' : 'No'
        };
          if (result.isActive) {
          statusInfo['Session'] = result.sessionStatus;
          // Show who activated the group integration
          statusInfo['Activated by'] = result.activatedBy;
          
          // Note about per-user limits
          statusInfo['Note'] = 'All members use their individual limits';
        }
        
        await client.reply(
          from,
          formatter.info('🔌 N8N Integration Status for Group', statusInfo),
          id
        );
        
        logger.logCommand(phoneNumber, 'n8n.status.group', true);
      } else {
        await client.reply(
          from,
          formatter.error('Failed to get N8N status', result.message),
          id
        );
        
        logger.logCommand(phoneNumber, 'n8n.status.group', false, result.message);
      }    } else {      // Personal status
      // Get user for premium status
      const user = await isUserRegistered(phoneNumber);
      result = await n8nHandler.getStatusForUser(phoneNumber);
      
      // Check if user is owner
      const isUserOwner = n8nHandler.isOwner(phoneNumber);
      
      if (result.success) {
        const statusInfo = {
          'Status': result.status,
          'Premium': isUserOwner ? 'Yes (Owner)' : (user && user.isPremium ? 'Yes' : 'No')
        };
          if (result.isActive) {
          statusInfo['Session'] = result.sessionStatus;
          
          // Show unlimited for owner
          if (isUserOwner) {
            statusInfo['Daily limit'] = 'Unlimited';
            statusInfo['Used today'] = `${result.usageCount} requests`;
            statusInfo['Remaining'] = 'Unlimited';
          } else {
            statusInfo['Daily limit'] = `${result.dailyLimit} requests`;
            statusInfo['Used today'] = `${result.usageCount} requests`;
            statusInfo['Remaining'] = `${result.remainingQuota} requests`;
          }
        }
        
        await client.reply(
          from,
          formatter.info('🔌 N8N Integration Status', statusInfo),
          id
        );
        
        logger.logCommand(phoneNumber, 'n8n.status', true);
      } else {
        await client.reply(
          from,
          formatter.error('Failed to get N8N status', result.message),
          id
        );
        
        logger.logCommand(phoneNumber, 'n8n.status', false, result.message);
      }
    }
  } catch (error) {
    logger.logError('n8nCommands.status', error);
    
    await client.reply(
      message.from,
      formatter.error('Error', 'Failed to get N8N integration status. Please try again.'),
      message.id
    );
  }
};

/**
 * Upgrade a user or group to premium (admin only)
 * @param {Object} client - WhatsApp client
 * @param {Object} message - Message object
 */
const upgradeToPremium = async (client, message) => {
  try {
    const { from, id, sender, body, isGroupMsg } = message;
    const phoneNumber = sender.id.split('@')[0];
    
    // Check if the user is an admin
    const isUserAdmin = await adminCommands.isAdmin(phoneNumber);
    
    if (!isUserAdmin) {
      await client.reply(
        from,
        formatter.error('Permission Denied', 'Only administrators can upgrade accounts to premium.'),
        id
      );
      logger.logCommand(phoneNumber, 'n8n.upgrade', false, 'Not an admin');
      return;
    }
    
    // Parse command arguments
    const args = body.trim().split(' ');
    if (args.length < 3) {
      await client.reply(
        from,
        formatter.error(
          'Invalid format',
          'Use: !n8n upgrade [phone/group] [limit]\n' +
          'Example: !n8n upgrade 6281234567890 200'
        ),
        id
      );
      return;
    }
    
    const targetIdentifier = args[2];
    const newLimit = args.length >= 4 ? parseInt(args[3], 10) : isGroupMsg ? 500 : 200;
    
    // Determine if this is a group ID or phone number
    const isGroupId = targetIdentifier.includes('-');
    
    let result;
    if (isGroupId) {
      // Upgrade group activator user
      result = await n8nHandler.upgradeGroupToPremium(targetIdentifier, newLimit);
      
      if (result.success) {
        await client.reply(
          from,
          formatter.success(
            '🔌 Group Activator Upgraded to Premium', 
            {
              'Group ID': targetIdentifier,
              'Activator User': result.activatorUser.phoneNumber,
              'Premium status': 'Active',
              'Note': 'Group members will use their individual limits'
            }
          ),
          id
        );
        
        logger.logCommand(phoneNumber, 'n8n.upgrade.group', true);
      } else {
        await client.reply(
          from,
          formatter.error('Failed to upgrade group', result.message),
          id
        );
        
        logger.logCommand(phoneNumber, 'n8n.upgrade.group', false, result.message);
      }
    } else {
      // Upgrade user
      result = await n8nHandler.upgradeToPremium(targetIdentifier, newLimit);
      
      if (result.success) {
        await client.reply(
          from,
          formatter.success(
            '🔌 User Upgraded to Premium', 
            {
              'Phone': targetIdentifier,
              'New daily limit': `${newLimit} requests`,
              'Premium status': 'Active'
            }
          ),
          id
        );
        
        logger.logCommand(phoneNumber, 'n8n.upgrade', true);
      } else {
        await client.reply(
          from,
          formatter.error('Failed to upgrade user', result.message),
          id
        );
        
        logger.logCommand(phoneNumber, 'n8n.upgrade', false, result.message);
      }
    }
  } catch (error) {
    logger.logError('n8nCommands.upgradeToPremium', error);
    
    await client.reply(
      message.from,
      formatter.error('Error', 'Failed to upgrade to premium. Please try again.'),
      message.id
    );
  }
};

/**
 * Handle N8N commands
 * @param {Object} client - WhatsApp client
 * @param {Object} message - Message object
 */
const handleN8nCommand = async (client, message) => {
  try {
    const { body, from, id } = message;
    const parts = body.trim().split(' ');
    
    // Format: !n8n action [params]
    if (parts.length < 2) {
      await client.reply(
        from,
        formatter.error(
          'Invalid format', 
          'Use one of the following commands:\n\n' +
          '!n8n activate - Activate N8N integration\n' +
          '!n8n deactivate - Deactivate N8N integration\n' +
          '!n8n status - Check N8N integration status\n' +
          '!n8n upgrade [phone/group] [limit] - Upgrade to premium (admin only)'
        ),
        id
      );
      return;
    }
    
    const subCommand = parts[1].toLowerCase();
    
    switch (subCommand) {
      case 'activate':
        await activate(client, message);
        break;
        
      case 'deactivate':
        await deactivate(client, message);
        break;
        
      case 'status':
        await status(client, message);
        break;
        
      case 'upgrade':
        await upgradeToPremium(client, message);
        break;
        
      default:
        await client.reply(
          from,
          formatter.error(
            'Unknown command', 
            'Use one of the following commands:\n\n' +
            '!n8n activate - Activate N8N integration\n' +
            '!n8n deactivate - Deactivate N8N integration\n' +
            '!n8n status - Check N8N integration status\n' +
            '!n8n upgrade [phone/group] [limit] - Upgrade to premium (admin only)'
          ),
          id
        );
    }
  } catch (error) {
    logger.logError('n8nCommands.handleN8nCommand', error);
    
    await client.reply(
      message.from,
      formatter.error('Error', 'An error occurred while processing your command.'),
      message.id
    );
  }
};

module.exports = {
  activate,
  deactivate,
  status,
  upgradeToPremium,
  handleN8nCommand
};
