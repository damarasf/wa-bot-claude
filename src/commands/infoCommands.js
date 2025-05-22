/**
 * Information Commands Module
 * Contains commands that provide information to users
 */
const formatter = require('../utils/formatter');
const logger = require('../utils/logger');

// Get system information about the bot
const botInfo = async (client, message) => {
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  const memoryUsage = process.memoryUsage();
  
  const botData = {
    'Uptime': uptimeString,
    'Memory Usage': `${Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
    'Platform': process.platform,
    'Node.js Version': process.version,
    'Library': 'open-wa/wa-automate',
    'Status': 'Online'
  };
  
  await client.reply(
    message.from, 
    formatter.info('Bot Information', botData),
    message.id
  );
  logger.logCommand(message.sender.id.split('@')[0], 'botInfo', true);
};

// Get current time and date
const dateTime = async (client, message) => {
  const now = new Date();
  
  const dateOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  };
  
  const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  };
  
  const dateData = {
    'Date': now.toLocaleDateString('en-US', dateOptions),
    'Time': now.toLocaleTimeString('en-US', timeOptions),
    'Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
    'Unix Timestamp': Math.floor(now.getTime() / 1000)
  };
  
  await client.reply(
    message.from,
    formatter.info('Current Date and Time', dateData),
    message.id
  );
  logger.logCommand(message.sender.id.split('@')[0], 'dateTime', true);
};

// Ping command to test bot responsiveness
const ping = async (client, message) => {
  const start = Date.now();
  
  await client.reply(message.from, 'Calculating ping...', message.id)
    .then(() => {
      const end = Date.now();
      const responseTime = end - start;
      
      client.reply(
        message.from,
        `🏓 *Pong!*\nResponse time: ${responseTime}ms`,
        message.id
      );
    });
};

module.exports = {
  botInfo,
  dateTime,
  ping
};