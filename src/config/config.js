require('dotenv').config();

/**
 * Application Configuration
 * Centralizes all configuration parameters from environment variables
 */
const config = {
  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'wabot',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    dialect: process.env.DB_DIALECT || 'postgres',
  },
  
  // N8N integration configuration
  n8n: {
    apiUrl: process.env.N8N_API_URL || 'http://localhost:5678/webhook/whatsapp',
    apiKey: process.env.N8N_API_KEY || '',
    dailyLimitDefault: parseInt(process.env.N8N_DAILY_LIMIT_DEFAULT || '50', 10),
    dailyLimitPremium: parseInt(process.env.N8N_DAILY_LIMIT_PREMIUM || '200', 10),
    sessionTimeout: parseInt(process.env.N8N_SESSION_TIMEOUT || '60', 10),
    onlyMode: process.env.N8N_ONLY_MODE === 'true',
    autoRegister: process.env.N8N_AUTO_REGISTER === 'true',
  },
  
  // WhatsApp configuration
  whatsapp: {
    sessionId: 'wa-bot',
    multiDevice: true,
    headless: process.env.HEADLESS === 'true',
    sessionDataPath: process.env.SESSION_DATA_PATH || './session',
    qrTimeout: 0,
    authTimeout: 60,
    restartOnCrash: true,
    throwErrorOnTosBlock: false,
    bypassCsp: true,
    useChrome: true,
    debug: process.env.DEBUG_MODE === 'true',
  },
  
  // Application settings
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 3000,
    logsDirectory: process.env.LOGS_DIR || './logs',
    commandPrefix: process.env.COMMAND_PREFIX || '!',
    alternatePrefix: process.env.ALTERNATE_PREFIX || '/',
  }
};

module.exports = config;