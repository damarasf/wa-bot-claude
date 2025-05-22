const db = require('../models');

/**
 * Handler for user registration
 * @param {string} phoneNumber - The phone number for registration (including country code)
 * @param {boolean} isAdmin - Whether the user is an admin
 * @returns {Promise<Object>} - Created user object or error message
 */
const registerUser = async (phoneNumber, isAdmin = false) => {
  try {
    // Check if user with this phone number already exists
    const existingUser = await db.User.findOne({ 
      where: { phoneNumber }
    });
    
    if (existingUser) {
      return {
        success: false,
        message: 'You are already registered',
        user: existingUser
      };
    }
    
    // Create user with just the phone number
    const user = await db.User.create({
      phoneNumber,
      isAdmin
    });    return {
      success: true,
      message: 'Registration successful',
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        isAdmin: user.isAdmin
      }
    };
  } catch (error) {
    console.error('Error registering user:', error);
    return {
      success: false,
      message: 'Registration failed',
      error: error.message
    };
  }
};

/**
 * Check if a user is registered
 * @param {string} phoneNumber - The phone number to check
 * @returns {Promise<Object>} - User object or null
 */
const isUserRegistered = async (phoneNumber) => {
  try {
    const user = await db.User.findOne({
      where: { phoneNumber }
    });
    
    return user;
  } catch (error) {
    console.error('Error checking user registration:', error);
    return null;
  }
};

/**
 * Auto-register user if they don't exist (for N8N_ONLY_MODE)
 * @param {string} phoneNumber - The phone number to check and register
 * @returns {Promise<Object>} - User object or null
 */
const autoRegisterUser = async (phoneNumber) => {
  try {
    // First check if user exists
    let user = await db.User.findOne({
      where: { phoneNumber }
    });
    
    // If user doesn't exist, register them automatically
    if (!user) {
      const result = await registerUser(phoneNumber, false);
      if (result.success) {
        user = result.user;
      } else {
        console.error('Failed to auto-register user:', result.message);
        return null;
      }
    }
    
    return user;
  } catch (error) {
    console.error('Error in auto-registering user:', error);
    return null;
  }
};

module.exports = {
  registerUser,
  isUserRegistered,
  autoRegisterUser
};
