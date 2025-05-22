/**
 * N8N Integration Handler
 * Manages N8N integration for direct message processing without command prefixes
 */
const db = require('../models');
const logger = require('../utils/logger');
const formatter = require('../utils/formatter');
const { isUserRegistered } = require('./userHandler');
const axios = require('axios');
const config = require('../config/config');

// Configuration from environment variables
const SESSION_TIMEOUT_MINUTES = parseInt(process.env.N8N_SESSION_TIMEOUT || '60', 10);
const SESSION_TIMEOUT = SESSION_TIMEOUT_MINUTES * 60 * 1000; // Convert to milliseconds

// Daily limits from environment variables
const DEFAULT_DAILY_LIMIT = parseInt(process.env.N8N_DAILY_LIMIT_DEFAULT || '50', 10);
const PREMIUM_DAILY_LIMIT = parseInt(process.env.N8N_DAILY_LIMIT_PREMIUM || '200', 10);
const UNLIMITED_LIMIT = 999999; // Effectively unlimited for owner

/**
 * Check if a user is the owner
 * @param {string} phoneNumber - User's phone number
 * @returns {boolean} - True if owner, false otherwise
 */
const isOwner = (phoneNumber) => {
  return phoneNumber === config.owner.phoneNumber;
};

// Default API url for n8n
const N8N_API_URL = process.env.N8N_API_URL || 'http://localhost:5678/webhook/whatsapp';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

/**
 * Activate N8N integration for a user
 * @param {string} phoneNumber - User's phone number
 * @param {boolean} silent - Whether to activate silently without validation (for internal use)
 * @param {boolean} forceCreate - Whether to force creation of integration even if limits reached (for system use)
 * @returns {Promise<Object>} - Result object with success status and message
 */
const activateForUser = async (phoneNumber, silent = false, forceCreate = false) => {
  try {
    // Check if user is registered
    const user = await isUserRegistered(phoneNumber);
    if (!user && !silent) {
      return {
        success: false,
        message: 'You need to register first before activating N8N integration.'
      };
    } else if (!user && silent) {
      // In silent mode, if we got here without a user, something went wrong
      return {
        success: false,
        message: 'User not found.',
        error: 'silent_activation_failed'
      };
    }

    // Check if user already has an integration record
    let integration = await db.N8nIntegration.findOne({
      where: { userId: user.id }
    });

        // Calculate session expiry time (1 hour from now)
    const sessionExpiry = new Date(Date.now() + SESSION_TIMEOUT);
      // If no record exists, create one
    if (!integration) {
      // Check if user is owner to set unlimited limit
      const isUserOwner = isOwner(phoneNumber);
      const dailyLimit = isUserOwner 
        ? UNLIMITED_LIMIT 
        : (user.isPremium ? PREMIUM_DAILY_LIMIT : DEFAULT_DAILY_LIMIT);
        
      integration = await db.N8nIntegration.create({
        userId: user.id,
        isActive: true,
        sessionExpiry,
        dailyLimit: dailyLimit, // Use unlimited for owner, premium limit for premium users
        usageCount: 0,
        lastResetDate: new Date()
      });

      return {
        success: true,
        message: 'N8N Integration activated successfully!',
        integration
      };
    }

    // If record exists, check if usage limit has been reached
    if (integration.usageCount >= integration.dailyLimit) {
      // Check if limit should be reset (past midnight)
      const today = new Date();
      const lastReset = new Date(integration.lastResetDate);      if (today.getDate() !== lastReset.getDate() ||
          today.getMonth() !== lastReset.getMonth() ||
          today.getFullYear() !== lastReset.getFullYear()) {
        // Reset count if it's a new day
        integration.usageCount = 0;
        integration.lastResetDate = new Date();
      } else if (!forceCreate) {
        // Only return error if we're not forcing creation
        return {
          success: false,
          message: 'Daily usage limit reached. Please try again tomorrow or upgrade to premium.'
        };
      }
    }
      // Update the integration record
    // Check if user is owner to set unlimited limit
    const isUserOwner = isOwner(phoneNumber);
    const dailyLimit = isUserOwner 
      ? UNLIMITED_LIMIT 
      : (user.isPremium ? PREMIUM_DAILY_LIMIT : DEFAULT_DAILY_LIMIT);
      
    await integration.update({
      isActive: true,
      sessionExpiry,
      dailyLimit: dailyLimit // Update limit based on owner status or premium status
    });

    return {
      success: true,
      message: 'N8N Integration activated successfully!',
      integration
    };
  } catch (error) {
    logger.logError('n8nHandler.activateForUser', error);
    return {
      success: false,
      message: 'Failed to activate N8N integration.',
      error: error.message
    };
  }
};

/**
 * Activate N8N integration for a group
 * @param {string} groupId - Group ID
 * @param {string} phoneNumber - Activator's phone number
 * @returns {Promise<Object>} - Result object with success status and message
 */
const activateForGroup = async (groupId, phoneNumber) => {
  try {
    // Check if user is registered
    const user = await isUserRegistered(phoneNumber);
    if (!user) {
      return {
        success: false,
        message: 'You need to register first before activating N8N integration.'
      };
    }

    // Check if group already has an integration record
    let groupIntegration = await db.N8nGroup.findOne({
      where: { groupId }
    });

    // Calculate session expiry time (1 hour from now)
    const sessionExpiry = new Date(Date.now() + SESSION_TIMEOUT);

    // If no record exists, create one
    if (!groupIntegration) {
      groupIntegration = await db.N8nGroup.create({
        groupId,
        isActive: true,
        activatorUserId: user.id,
        sessionExpiry
      });

      return {
        success: true,
        message: 'N8N Integration activated for this group!',
        groupIntegration
      };
    }    // Update the integration record
    await groupIntegration.update({
      isActive: true,
      activatorUserId: user.id,
      sessionExpiry
    });

    return {
      success: true,
      message: 'N8N Integration activated for this group!',
      groupIntegration
    };
  } catch (error) {
    logger.logError('n8nHandler.activateForGroup', error);
    return {
      success: false,
      message: 'Failed to activate N8N integration for the group.',
      error: error.message
    };
  }
};

/**
 * Deactivate N8N integration for a user
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<Object>} - Result object with success status and message
 */
const deactivateForUser = async (phoneNumber) => {
  try {
    // Check if user is registered
    const user = await isUserRegistered(phoneNumber);
    if (!user) {
      return {
        success: false,
        message: 'User not found.'
      };
    }

    // Check if user has an active integration
    const integration = await db.N8nIntegration.findOne({
      where: { userId: user.id }
    });

    if (!integration || !integration.isActive) {
      return {
        success: false,
        message: 'N8N Integration is not currently active for you.'
      };
    }

    // Update the integration record
    await integration.update({
      isActive: false,
      sessionExpiry: null
    });

    return {
      success: true,
      message: 'N8N Integration deactivated successfully.'
    };
  } catch (error) {
    logger.logError('n8nHandler.deactivateForUser', error);
    return {
      success: false,
      message: 'Failed to deactivate N8N integration.',
      error: error.message
    };
  }
};

/**
 * Deactivate N8N integration for a group
 * @param {string} groupId - Group ID
 * @param {string} phoneNumber - Deactivator's phone number
 * @returns {Promise<Object>} - Result object with success status and message
 */
const deactivateForGroup = async (groupId, phoneNumber) => {
  try {
    // Check if user is registered
    const user = await isUserRegistered(phoneNumber);
    if (!user) {
      return {
        success: false,
        message: 'User not found.'
      };
    }

    // Check if group has an active integration
    const groupIntegration = await db.N8nGroup.findOne({
      where: { groupId }
    });

    if (!groupIntegration || !groupIntegration.isActive) {
      return {
        success: false,
        message: 'N8N Integration is not currently active for this group.'
      };
    }

    // Update the integration record
    await groupIntegration.update({
      isActive: false,
      sessionExpiry: null
    });

    return {
      success: true,
      message: 'N8N Integration deactivated for this group.'
    };
  } catch (error) {
    logger.logError('n8nHandler.deactivateForGroup', error);
    return {
      success: false,
      message: 'Failed to deactivate N8N integration for the group.',
      error: error.message
    };
  }
};

/**
 * Check if N8N integration is active for a user
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<Object>} - Result object with active status and integration data
 */
const isActiveForUser = async (phoneNumber) => {
  try {
    // Check if user is registered
    const user = await isUserRegistered(phoneNumber);
    if (!user) {
      return {
        active: false,
        message: 'User not registered.'
      };
    }

    // Check if user has an active integration
    const integration = await db.N8nIntegration.findOne({
      where: { userId: user.id }
    });

    if (!integration || !integration.isActive) {
      return {
        active: false,
        message: 'N8N Integration not activated.'
      };
    }

    // Check if session has expired
    const now = new Date();
    if (integration.sessionExpiry && new Date(integration.sessionExpiry) < now) {
      // Session expired, deactivate
      await integration.update({
        isActive: false,
        sessionExpiry: null
      });
      
      return {
        active: false,
        message: 'N8N Integration session has expired. Please activate again.',
        expired: true
      };
    }    // For owners, bypass the daily limit check
    const isUserOwner = isOwner(phoneNumber);
    
    // Check if daily limit reached (unless owner)
    if (!isUserOwner && integration.usageCount >= integration.dailyLimit) {
      // Check if limit should be reset (past midnight)
      const today = new Date();
      const lastReset = new Date(integration.lastResetDate);

      if (today.getDate() !== lastReset.getDate() ||
          today.getMonth() !== lastReset.getMonth() ||
          today.getFullYear() !== lastReset.getFullYear()) {
        // Reset count if it's a new day
        await integration.update({
          usageCount: 0,
          lastResetDate: new Date()
        });
        
        // Reload the integration object with updated values
        await integration.reload();
      } else {
        return {
          active: false,
          message: 'Daily usage limit reached.',
          limitReached: true
        };
      }
    }

    return {
      active: true,
      integration,
      remainingQuota: integration.dailyLimit - integration.usageCount
    };
  } catch (error) {
    logger.logError('n8nHandler.isActiveForUser', error);
    return {
      active: false,
      message: 'Error checking N8N integration status.',
      error: error.message
    };
  }
};

/**
 * Check if N8N integration is active for a group
 * @param {string} groupId - Group ID
 * @returns {Promise<Object>} - Result object with active status and integration data
 */
const isActiveForGroup = async (groupId) => {
  try {
    // Check if group has an active integration
    const groupIntegration = await db.N8nGroup.findOne({
      where: { groupId }
    });

    if (!groupIntegration || !groupIntegration.isActive) {
      return {
        active: false,
        message: 'N8N Integration not activated for this group.'
      };
    }

    // Check if session has expired
    const now = new Date();
    if (groupIntegration.sessionExpiry && new Date(groupIntegration.sessionExpiry) < now) {
      // Session expired, deactivate
      await groupIntegration.update({
        isActive: false,
        sessionExpiry: null
      });
      
      return {
        active: false,
        message: 'N8N Integration session for this group has expired. Please activate again.',
        expired: true
      };    }
    
    // Groups don't track usage limits anymore, they're tracked at the user level
    // Just make sure the group is active and session hasn't expired
    return {
      active: true,
      groupIntegration
    };
  } catch (error) {
    logger.logError('n8nHandler.isActiveForGroup', error);
    return {
      active: false,
      message: 'Error checking N8N integration status for group.',
      error: error.message
    };
  }
};

/**
 * Process a message through N8N integration
 * @param {Object} client - WhatsApp client instance
 * @param {Object} message - Message object
 * @param {boolean} isGroup - Whether the message is from a group
 * @returns {Promise<Object>} - Result object
 */
const processMessage = async (client, message, isGroup) => {
  try {
    const { body, from, sender, id } = message;
    const phoneNumber = sender.id.split('@')[0];
    
    let statusResult;
    let entityId;
    let groupEntity = null;
    let userEntity = null;

    // First check if the user is registered
    const user = await isUserRegistered(phoneNumber);
    if (!user) {
      return {
        success: false,
        message: 'User is not registered.'
      };
    }

    // Always check for user's individual integration for tracking usage
    const userIntegrationResult = await isActiveForUser(phoneNumber);
    userEntity = userIntegrationResult.active ? userIntegrationResult.integration : null;
    
    // Check active status based on message type
    if (isGroup) {
      const groupId = from;
      statusResult = await isActiveForGroup(groupId);
      entityId = groupId;
      groupEntity = statusResult.active ? statusResult.groupIntegration : null;
      
      // If group integration is not active, return the status
      if (!statusResult.active) {
        return statusResult;
      }
      
      // If user doesn't have an active integration, create one
      if (!userEntity) {
        // Create or get user integration for tracking usage
        const activateResult = await activateForUser(phoneNumber, false, true);
        if (activateResult.success) {
          userEntity = activateResult.integration;
        } else {
          // User has reached their limit
          return activateResult;
        }
      }
    } else {
      statusResult = userIntegrationResult;
      entityId = phoneNumber;
      
      // If user integration is not active, return the status
      if (!statusResult.active) {
        return statusResult;
      }
      
      userEntity = statusResult.integration;
    }
      // Check if the user is the owner - owners have unlimited usage
    if (isOwner(phoneNumber)) {
      // Owner has unlimited usage - no need to check limits
      // Just make sure usage is tracked for statistics
      logger.log('info', `Owner ${phoneNumber} usage - bypassing limits`);
    } 
    // For non-owners, double check usage limits
    else if (userEntity.usageCount >= userEntity.dailyLimit) {
      // Check if limit should be reset (past midnight)
      const today = new Date();
      const lastReset = new Date(userEntity.lastResetDate);

      if (today.getDate() !== lastReset.getDate() ||
          today.getMonth() !== lastReset.getMonth() ||
          today.getFullYear() !== lastReset.getFullYear()) {
        // Reset count if it's a new day
        userEntity.usageCount = 0;
        userEntity.lastResetDate = new Date();
        await userEntity.save();
      } else {
        return {
          success: false,
          message: 'Daily usage limit reached. Please try again tomorrow or upgrade to premium.'
        };
      }
    }
      // Send the message to n8n webhook
    const response = await axios.post(N8N_API_URL, {
      message: body,
      from: from,
      phoneNumber: phoneNumber,
      messageId: id,
      isGroup: isGroup,
      groupId: isGroup ? from : null,
      apiKey: N8N_API_KEY // For security
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });    // Increment user's usage count (always count against the user, not the group)
    await userEntity.increment('usageCount');
    
    // Reload the entity to get the updated count
    await userEntity.reload();
    
    // Check if n8n returned a response message
    if (response.data && response.data.response) {
      // Send the response back to the user
      await client.reply(from, response.data.response, id);
    }
    
    // Log the processed message
    logger.log('info', `N8N processed message from ${phoneNumber} in ${isGroup ? 'group ' + entityId : 'personal chat'}: "${body.substring(0, 50)}${body.length > 50 ? '...' : ''}"`);
    
    return {
      success: true,
      message: 'Message processed by N8N',
      response: response.data,
      remainingQuota: userEntity.dailyLimit - userEntity.usageCount,
      userUsageCount: userEntity.usageCount,
      userDailyLimit: userEntity.dailyLimit
    };
  } catch (error) {
    logger.logError('n8nHandler.processMessage', error);
    return {
      success: false,
      message: 'Failed to process message with N8N integration.',
      error: error.message
    };
  }
};

/**
 * Upgrade a user to premium
 * @param {string} phoneNumber - User's phone number
 * @param {number} newLimit - New daily limit
 * @returns {Promise<Object>} - Result object with success status and message
 */
const upgradeToPremium = async (phoneNumber, newLimit = PREMIUM_DAILY_LIMIT) => {
  try {
    // Check if user is the owner (special unlimited limit)
    const isUserOwner = isOwner(phoneNumber);
    if (isUserOwner) {
      newLimit = UNLIMITED_LIMIT;
    }
    
    // Check if user is registered
    const user = await isUserRegistered(phoneNumber);
    if (!user) {
      return {
        success: false,
        message: 'User not found.'
      };
    }

    // Update the user record to set premium status
    await user.update({
      isPremium: true
    });

    // Check if user has an integration record
    let integration = await db.N8nIntegration.findOne({
      where: { userId: user.id }
    });

    // If no record exists, create one
    if (!integration) {
      integration = await db.N8nIntegration.create({
        userId: user.id,
        isActive: false,
        dailyLimit: newLimit,
        usageCount: 0,
        lastResetDate: new Date()
      });
    } else {
      // Update the integration record with new limit
      await integration.update({
        dailyLimit: newLimit
      });
    }

    return {
      success: true,
      message: `User upgraded to premium with a daily limit of ${newLimit} requests.`,
      integration,
      user
    };
  } catch (error) {
    logger.logError('n8nHandler.upgradeToPremium', error);
    return {
      success: false,
      message: 'Failed to upgrade user to premium.',
      error: error.message
    };
  }
};

/**
 * Upgrade group activator user to premium and set group daily limit
 * @param {string} groupId - Group ID
 * @param {number} newLimit - New daily limit for the group
 * @returns {Promise<Object>} - Result object with success status and message
 */
const upgradeGroupToPremium = async (groupId, newLimit = PREMIUM_DAILY_LIMIT) => {
  try {
    // Check if group exists
    const groupIntegration = await db.N8nGroup.findOne({
      where: { groupId }
    });
    
    if (!groupIntegration) {
      return {
        success: false,
        message: 'Group not found in N8N integration database.'
      };
    }
    
    // Find the user who activated the integration
    const activatorUser = await db.User.findByPk(groupIntegration.activatorUserId);
    if (!activatorUser) {
      return {
        success: false,
        message: 'Group activator user not found.'
      };
    }
    
    // Upgrade the activator user to premium
    await activatorUser.update({
      isPremium: true
    });
    
    return {
      success: true,
      message: `Group activator upgraded to premium status. Group members will use their individual limits.`,
      groupIntegration,
      activatorUser
    };
  } catch (error) {
    logger.logError('n8nHandler.upgradeGroupToPremium', error);
    return {
      success: false,
      message: 'Failed to upgrade group premium status.',
      error: error.message
    };
  }
};

/**
 * Get N8N integration status for user
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<Object>} - Status information
 */
const getStatusForUser = async (phoneNumber) => {
  try {
    // Check if user is registered
    const user = await isUserRegistered(phoneNumber);
    if (!user) {
      return {
        success: false,
        message: 'User not registered.'
      };
    }

    // Get integration info
    const integration = await db.N8nIntegration.findOne({
      where: { userId: user.id }
    });

    if (!integration) {
      return {
        success: true,
        status: 'Not configured',
        isActive: false
      };
    }

    // Check if session expired but status is still active
    let isActive = integration.isActive;
    let sessionStatus = 'N/A';
    
    if (integration.isActive && integration.sessionExpiry) {
      const now = new Date();
      if (new Date(integration.sessionExpiry) < now) {
        isActive = false;
        sessionStatus = 'Expired';
      } else {
        // Calculate time left in session
        const timeLeft = Math.round((new Date(integration.sessionExpiry) - now) / (60 * 1000)); // minutes
        sessionStatus = `${timeLeft} minutes remaining`;
      }
    }    // Check if user is an owner for special display
    const isUserOwner = isOwner(phoneNumber);
    
    return {      
      success: true,
      status: isActive ? 'Active' : 'Inactive',
      isActive,
      isOwner: isUserOwner,
      isPremium: isUserOwner ? true : user.isPremium, // Owners are always premium
      dailyLimit: isUserOwner ? 'Unlimited' : integration.dailyLimit,
      usageCount: integration.usageCount,
      remainingQuota: isUserOwner ? 'Unlimited' : (integration.dailyLimit - integration.usageCount),
      sessionStatus: isActive ? sessionStatus : 'N/A',
      lastResetDate: integration.lastResetDate
    };
  } catch (error) {
    logger.logError('n8nHandler.getStatusForUser', error);
    return {
      success: false,
      message: 'Error retrieving N8N integration status.',
      error: error.message
    };
  }
};

/**
 * Get N8N integration status for group
 * @param {string} groupId - Group ID
 * @returns {Promise<Object>} - Status information
 */
const getStatusForGroup = async (groupId) => {
  try {
    // Get integration info
    const integration = await db.N8nGroup.findOne({
      where: { groupId }
    });

    if (!integration) {
      return {
        success: true,
        status: 'Not configured',
        isActive: false
      };
    }

    // Check if session expired but status is still active
    let isActive = integration.isActive;
    let sessionStatus = 'N/A';
    
    if (integration.isActive && integration.sessionExpiry) {
      const now = new Date();
      if (new Date(integration.sessionExpiry) < now) {
        isActive = false;
        sessionStatus = 'Expired';
      } else {
        // Calculate time left in session
        const timeLeft = Math.round((new Date(integration.sessionExpiry) - now) / (60 * 1000)); // minutes
        sessionStatus = `${timeLeft} minutes remaining`;
      }
    }

    // Get activator user if available
    let activatorInfo = 'N/A';
    if (integration.activatorUserId) {
      const activator = await db.User.findByPk(integration.activatorUserId);
      if (activator) {
        activatorInfo = activator.phoneNumber;
      }
    }    // Get activator's premium status if available
    let isPremium = false;
    let activatorUserId = null;
    
    if (integration.activatorUserId) {
      activatorUserId = integration.activatorUserId;
      const activator = await db.User.findByPk(integration.activatorUserId);
      if (activator) {
        isPremium = activator.isPremium;
      }
    }

    return {
      success: true,
      status: isActive ? 'Active' : 'Inactive',
      isActive,
      activatorUserId,
      sessionStatus: isActive ? sessionStatus : 'N/A',
      activatedBy: activatorInfo
    };
  } catch (error) {
    logger.logError('n8nHandler.getStatusForGroup', error);
    return {
      success: false,
      message: 'Error retrieving N8N integration status for group.',
      error: error.message
    };
  }
};

module.exports = {
  activateForUser,
  activateForGroup,
  deactivateForUser,
  deactivateForGroup,
  isActiveForUser,
  isActiveForGroup,
  processMessage,
  upgradeToPremium,
  upgradeGroupToPremium,
  getStatusForUser,
  getStatusForGroup,
  isOwner
};
