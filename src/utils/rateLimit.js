/**
 * Enhanced rate limiter with configurable limits 
 * This implementation includes periodic cleanup to prevent memory leaks
 */

// Store user's command counts
const userCommandCounts = new Map();

// Time window in milliseconds (e.g., 60000ms = 1 minute)
const TIME_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10);

// Maximum commands per time window - read from env with fallbacks
const DEFAULT_MAX_COMMANDS = parseInt(process.env.RATE_LIMIT_DEFAULT || '20', 10);

// Command-specific limits (stricter for certain commands)
const COMMAND_LIMITS = {
  'broadcast': 5,  // Admin broadcast limited to 5 per minute
  'register': 3,   // Register limited to 3 attempts per minute
  'note': 10       // Note operations limited to 10 per minute
};

/**
 * Cleanup function to remove expired entries
 * Called periodically to prevent memory leaks
 */
const cleanupExpiredEntries = () => {
  const now = Date.now();
  for (const [key, data] of userCommandCounts.entries()) {
    if (now > data.resetAt) {
      userCommandCounts.delete(key);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Check if a user has exceeded their rate limit
 * @param {string} phoneNumber - User's phone number
 * @param {string} commandType - Type of command being executed
 * @returns {Object} - Result with status and remaining time if limited
 */
const checkRateLimit = (phoneNumber, commandType) => {
  const now = Date.now();
  const userKey = `${phoneNumber}:${commandType}`;
  
  // Get max commands for this command type or use default
  const maxCommands = COMMAND_LIMITS[commandType] || DEFAULT_MAX_COMMANDS;
  
  // Get current user's command history or initialize new
  let userHistory = userCommandCounts.get(userKey) || {
    count: 0,
    resetAt: now + TIME_WINDOW,
    history: []
  };
  
  // Reset counter if time window has passed
  if (now > userHistory.resetAt) {
    userHistory = {
      count: 0,
      resetAt: now + TIME_WINDOW,
      history: []
    };
  }
  
  // Clean old history entries
  userHistory.history = userHistory.history.filter(time => (now - time) < TIME_WINDOW);
  
  // Check if rate limited
  if (userHistory.history.length >= maxCommands) {
    // Calculate time left until reset
    const oldestCommand = userHistory.history[0];
    const timeLeft = Math.ceil((oldestCommand + TIME_WINDOW - now) / 1000);
    
    return {
      limited: true,
      timeLeft, // Time left in seconds
      maxCommands
    };
  }
  
  // Not limited, add this command to history
  userHistory.count += 1;
  userHistory.history.push(now);
  userCommandCounts.set(userKey, userHistory);
  
  return {
    limited: false,
    count: userHistory.count,
    maxCommands
  };
};

module.exports = {
  checkRateLimit
};
