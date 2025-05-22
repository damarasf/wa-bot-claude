require('dotenv').config();
const { create, ev } = require('@open-wa/wa-automate');
const commands = require('./commands');
const adminCommands = require('./commands/adminCommands');
const weatherCommand = require('./commands/weatherCommand');
const reminderCommand = require('./commands/reminderCommand');
const noteCommand = require('./commands/noteCommand');
const n8nCommands = require('./commands/n8nCommands');
const n8nHandler = require('./handlers/n8nHandler');
const userHandler = require('./handlers/userHandler');
const initDatabase = require('./config/initDatabase');
const config = require('./config/config');
const logger = require('./utils/logger');
const chat = require('./utils/chat');
const rateLimit = require('./utils/rateLimit');

// Global variable to store the WhatsApp client instance
let whatsappClient = null;

// Check if we're in N8N-only mode (disable all other commands)
const N8N_ONLY_MODE = config.n8n.onlyMode;

// Graceful shutdown function
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} signal received. Shutting down gracefully...`);
  
  // Log shutdown event
  logger.log('info', `Application shutdown initiated: ${signal}`);
  
  try {
    // Close WhatsApp client if available
    if (whatsappClient) {
      console.log('Closing WhatsApp client connection...');
      await whatsappClient.kill();
    }
    
    // Close database connection
    console.log('Closing database connections...');
    const { sequelize } = require('./models');
    await sequelize.close();
    
    console.log('Shutdown complete. Exiting process.');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Set up graceful shutdown handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  logger.logError('uncaughtException', error);
  gracefulShutdown('uncaughtException');
});

// Message handler function
const messageHandler = async (client, message) => {  try {
    // Handle group messages separately
    if (message.isGroupMsg) {
      return await groupMessageHandler(client, message);
    }
    if (message.broadcast) return;
  
    const { body, sender, from, id } = message;
    
    // Ignore empty messages or non-text messages
    if (!body || !body.trim()) return;
    
    const phoneNumber = sender.id.split('@')[0];
    
    // N8N_ONLY_MODE - all messages are processed through n8n without command prefixes
    if (N8N_ONLY_MODE) {
      try {
        // In N8N_ONLY_MODE, auto-register the user if needed
        if (config.n8n.autoRegister) {
          const user = await userHandler.autoRegisterUser(phoneNumber);
          if (!user) {
            await client.reply(
              from,
              '❌ Failed to register you automatically. Please try again later.',
              id
            );
            return;
          }
          
          // Auto-activate n8n integration for this user
          const activateResult = await n8nHandler.activateForUser(phoneNumber, false, true);
          if (!activateResult.success) {
            await client.reply(
              from,
              '❌ Failed to activate n8n integration. Please try again later.',
              id
            );
            return;
          }
        }
        
        // Process all messages with n8n
        const processResult = await n8nHandler.processMessage(client, message, false);
        return;
      } catch (n8nError) {
        // Log the error but don't crash the bot
        logger.logError('n8nOnlyMode', n8nError);
        await client.reply(
          from,
          '❌ There was an error processing your message. Please try again later.',
          id
        );
        return;
      }
    }
      // Regular mode - Check if this is a non-prefixed message and n8n integration is active
    if (!body.startsWith(config.app.commandPrefix) && !body.startsWith(config.app.alternatePrefix)) {
      // Check if n8n integration is active for this user
      const n8nStatus = await n8nHandler.isActiveForUser(phoneNumber);
      
      if (n8nStatus.active) {
        try {
          // Process message with n8n integration
          const processResult = await n8nHandler.processMessage(client, message, false);
          return;
        } catch (n8nError) {
          // Log the error but don't crash the bot
          logger.logError('n8nProcessing', n8nError);
          await client.reply(
            from,
            '❌ There was an error processing your message with n8n integration. Please try again later.',
            id
          );
          return;
        }
      }    }
      // Get the raw command (with prefix)
    const rawCommand = body.trim().split(' ')[0].toLowerCase();
      // Extract the command without prefix for switch statement
    let commandWithoutPrefix;
    if (rawCommand.startsWith(config.app.commandPrefix)) {
      commandWithoutPrefix = rawCommand.substring(config.app.commandPrefix.length);
    } else if (rawCommand.startsWith(config.app.alternatePrefix)) {
      commandWithoutPrefix = rawCommand.substring(config.app.alternatePrefix.length);
    } else {
      // Not a command prefix - we should have already handled this above in the n8n integration check
      return;
    }
    
    // Determine the command type for rate limiting
    let commandType = commandWithoutPrefix;
    if (commandType && commandType.includes(' ')) {
      commandType = commandType.split(' ')[0];
    }    // Check rate limit (except for status and help commands)
    if (commandWithoutPrefix && !['status', 'help'].includes(commandWithoutPrefix)) {
      const rateStatus = rateLimit.checkRateLimit(phoneNumber, commandType);
      
      if (rateStatus.limited) {
        await client.reply(
          from,
          `⚠️ *Rate Limit Reached*\n\nYou're sending commands too quickly. Please wait ${rateStatus.timeLeft} seconds before trying again.`,
          id
        );
        logger.logCommand(phoneNumber, commandType, false, 'Rate limited');
        return;
      }
    }
      // Handle commands
    switch (commandWithoutPrefix) {
      // No registration required commands
      case 'register':
        await commands.register(client, message);
        break;
      
      case 'status':
        await commands.status(client, message);
        break;
      
      case 'help':
        await commands.help(client, message);
        break;
        // Info commands - registration required
      case 'botinfo':
        {
          const user = await commands.authenticate(client, message);
          if (user) await commands.botInfo(client, message);
        }
        break;
        
      case 'datetime':
        {
          const user = await commands.authenticate(client, message);
          if (user) await commands.dateTime(client, message);
        }
        break;
        
      case 'ping':
        {
          const user = await commands.authenticate(client, message);
          if (user) await commands.ping(client, message);
        }
        break;
          // Utility commands - registration required
      case 'echo':
        {
          const user = await commands.authenticate(client, message);
          if (user) await commands.echo(client, message);
        }
        break;
        
      case 'random':
        {
          const user = await commands.authenticate(client, message);
          if (user) await commands.random(client, message);
        }
        break;
    
      case 'calc':
        {
          const user = await commands.authenticate(client, message);
          if (user) await commands.calculate(client, message);
        }
        break;
        // Weather command - registration required  
      case 'weather':
        {
          const user = await commands.authenticate(client, message);
          if (user) await weatherCommand.getWeather(client, message);
        }
        break;
        
      // Reminder commands - registration required
      case 'remind':
        {
          const user = await commands.authenticate(client, message);
          if (user) await reminderCommand.setReminder(client, message);
        }
        break;
        
      case 'reminders':
        {
          const user = await commands.authenticate(client, message);
          if (user) await reminderCommand.listReminders(client, message);
        }
        break;
        
      case 'cancelreminder':
        {
          const user = await commands.authenticate(client, message);
          if (user) await reminderCommand.cancelReminder(client, message);
        }
        break;
      
      // Note commands - registration required
      case 'note':
        {
          const user = await commands.authenticate(client, message);
          if (user) await noteCommand.handleNoteCommand(client, message);
        }
        break;
          // Admin commands
      case 'admin':
        {
          const args = body.split(' ');
          if (args.length < 2) {
            await client.reply(
              from,
              `❌ Invalid admin command. Use: ${config.app.commandPrefix}admin [stats|broadcast|restart]`,
              id
            );
            break;
          }
          
          // Check if the user is an admin
          if (!adminCommands.isAdmin(phoneNumber)) {
            await client.reply(
              from,
              '❌ You are not authorized to use admin commands.',
              id
            );
            logger.logCommand(phoneNumber, 'admin', false, 'Unauthorized access');
            break;
          }
          
          const subCommand = args[1].toLowerCase();
          
          switch (subCommand) {
            case 'stats':
              await adminCommands.stats(client, message);
              break;
              
            case 'broadcast':
              await adminCommands.broadcast(client, message);
              break;
                case 'restart':
              await adminCommands.restart(client, message);
              break;
            
            case 'makeadmin':
              await adminCommands.makeAdmin(client, message);
              break;
              
            default:
              await client.reply(
                from,
                '❌ Unknown admin command. Available commands: stats, broadcast, restart, makeadmin',
                id
              );
              break;
          }
        }
        break;          // N8N integration commands
      case 'n8n':
        {
          const user = await commands.authenticate(client, message);
          if (user) {
            const args = body.split(' ');
            if (args.length < 2) {
              await client.reply(
                from,
                `❌ Invalid n8n command. Use: ${config.app.commandPrefix}n8n [activate|deactivate|status]`,
                id
              );
              break;
            }
            
            const subCommand = args[1].toLowerCase();
            
            switch (subCommand) {
              case 'activate':
                await n8nCommands.activate(client, message);
                break;
                
              case 'deactivate':
                await n8nCommands.deactivate(client, message);
                break;
                
              case 'status':
                await n8nCommands.status(client, message);
                break;
                
              case 'premium':                // Check if the user is an admin for premium commands
                if (adminCommands.isAdmin(phoneNumber)) {
                  await n8nCommands.upgradeToPremium(client, message);
                } else {
                  await client.reply(
                    from,
                    '❌ You are not authorized to use n8n premium commands.',
                    id
                  );
                  logger.logCommand(phoneNumber, 'n8n.premium', false, 'Unauthorized access');
                }
                break;
                
              default:
                await client.reply(
                  from,
                  '❌ Unknown n8n command. Available commands: activate, deactivate, status',
                  id
                );
                break;
            }
          }
        }
        break;      default:
        // Handle unknown commands
        if (rawCommand.startsWith(config.app.commandPrefix) || rawCommand.startsWith(config.app.alternatePrefix)) {
          // Use chat utility for reply
          await chat.replyWithQuote(client, from, 
            `⚠️ Unknown command. Type ${config.app.commandPrefix}help to see available commands.`, 
            id
          );
          logger.logCommand(phoneNumber, rawCommand, false, 'Unknown command');
        }
        break;
    }
  } catch (error) {
    logger.logError('messageHandler', error);
    console.error('Error handling message:', error);
    
    try {
      // Try to notify the user about the error
      await client.reply(
        message.from,
        '❌ An error occurred while processing your command. Please try again later.',
        message.id
      );
    } catch (replyError) {
      logger.logError('errorReply', replyError);
    }
  }
};

// Group message handler function
const groupMessageHandler = async (client, message) => {
  try {
    const { body, from, id, sender } = message;
    
    // Ignore empty messages or non-text messages
    if (!body || !body.trim()) return;
    
    const phoneNumber = sender.id.split('@')[0];
    
    // N8N_ONLY_MODE - all messages are processed through n8n without command prefixes
    if (N8N_ONLY_MODE) {
      try {
        // In N8N_ONLY_MODE, auto-register the user if needed
        if (config.n8n.autoRegister) {
          const user = await userHandler.autoRegisterUser(phoneNumber);
          if (!user) {
            await client.reply(
              from,
              '❌ Failed to register you automatically. Please try again later.',
              id
            );
            return;
          }
          
          // Auto-activate n8n integration for this user and process the message
          const activateResult = await n8nHandler.activateForUser(phoneNumber, false, true);
          if (!activateResult.success) {
            await client.reply(
              from,
              '❌ Failed to activate n8n integration. Please try again later.',
              id
            );
            return;
          }
        }
        
        // Process all messages with n8n
        const processResult = await n8nHandler.processMessage(client, message, true);
        return;
      } catch (n8nError) {
        // Log the error but don't crash the bot
        logger.logError('n8nOnlyModeGroup', n8nError);
        await client.reply(
          from,
          '❌ There was an error processing your message. Please try again later.',
          id
        );
        return;
      }
    }
      // Regular mode - Check if this is a non-prefixed message
    if (!body.startsWith(config.app.commandPrefix) && !body.startsWith(config.app.alternatePrefix)) {
      // Check if n8n integration is active for this group
      const n8nStatus = await n8nHandler.isActiveForGroup(from);
      
      if (n8nStatus.active) {
        try {
          // Process message with n8n integration
          const processResult = await n8nHandler.processMessage(client, message, true);
          return;
        } catch (n8nError) {
          // Log the error but don't crash the bot
          logger.logError('n8nGroupProcessing', n8nError);
          await client.reply(
            from,
            '❌ There was an error processing your message with n8n integration. Please try again later.',
            id
          );
          return;
        }
      }
      
      // If n8n integration is not active for non-prefixed messages, just ignore
      return;
    }    // Handle prefixed commands in groups
    const rawCommand = body.trim().split(' ')[0].toLowerCase();
    
    // Extract the command without prefix for switch statement
    let commandWithoutPrefix;
    if (rawCommand.startsWith(config.app.commandPrefix)) {
      commandWithoutPrefix = rawCommand.substring(config.app.commandPrefix.length);
    } else if (rawCommand.startsWith(config.app.alternatePrefix)) {
      commandWithoutPrefix = rawCommand.substring(config.app.alternatePrefix.length);
    } else {
      // Not a command, and already checked n8n integration above
      return;
    }
    
    // Handle group commands
    switch (commandWithoutPrefix) {
      // Basic commands that work in groups
      case 'help':
        await commands.help(client, message);
        break;
        
      // N8N integration group commands
      case 'n8n':
        {
          const args = body.split(' ');
          if (args.length < 2) {
            await client.reply(
              from,
              `❌ Invalid n8n command. Use: ${config.app.commandPrefix}n8n [activate|deactivate|status]`,
              id
            );
            break;
          }
          
          const subCommand = args[1].toLowerCase();
          
          switch (subCommand) {            case 'activate':
              // Check if user is registered before allowing them to activate group integration
              const user = await commands.authenticate(client, message);
              if (user) {
                await n8nCommands.activate(client, message);
              }
              break;
              
            case 'deactivate':
              // Authentication required for deactivation too
              const userForDeactivate = await commands.authenticate(client, message);
              if (userForDeactivate) {
                await n8nCommands.deactivate(client, message);
              }
              break;
              
            case 'status':
              // Authentication required for checking status
              const userForStatus = await commands.authenticate(client, message);
              if (userForStatus) {
                await n8nCommands.status(client, message);
              }
              break;
              
            default:
              await client.reply(
                from,
                '❌ Unknown n8n command. Available commands: activate, deactivate, status',
                id
              );
              break;
          }
        }
        break;
          default:
        // Handle unknown commands in groups
        if (rawCommand.startsWith(config.app.commandPrefix) || rawCommand.startsWith(config.app.alternatePrefix)) {
          // Use chat utility for reply
          await client.reply(
            from,
            `⚠️ This command is not supported in groups or is unknown. Type ${config.app.commandPrefix}help for available group commands.`,
            id
          );
          logger.logCommand(phoneNumber, rawCommand, false, 'Unknown group command');
        }
        break;
    }
  } catch (error) {
    logger.logError('groupMessageHandler', error);
    console.error('Error handling group message:', error);
    
    try {
      // Try to notify about the error
      await client.reply(
        message.from,
        '❌ An error occurred while processing your command. Please try again later.',
        message.id
      );
    } catch (replyError) {
      logger.logError('errorReply', replyError);
    }
  }
};

// Initialize the WhatsApp client
const start = async () => {
  // First initialize the database
  const dbConnected = await initDatabase();
  if (!dbConnected) {
    console.error('Failed to initialize database. Exiting...');
    process.exit(1);
  }

  // Configuration options for the WhatsApp client
  const options = {
    sessionId: 'wa-bot',
    multiDevice: true,
    authTimeout: 60,
    headless: process.env.HEADLESS === 'true',
    qrTimeout: 0,
    restartOnCrash: true,
    cacheEnabled: false,
    useChrome: true,
    killProcessOnBrowserClose: true,
    throwErrorOnTosBlock: false,
    chromiumArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--aggressive-cache-discard',
      '--disable-cache',
      '--disable-application-cache',
      '--disable-offline-load-stale-cache',
      '--disk-cache-size=0'
    ],
    // Explicitly set the Chrome path from environment variables
    // This is crucial for Docker deployments to work correctly
    executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser'
  };

  // Create and start the WhatsApp client
  create(options)
    .then(client => {
      // Log when the client is ready
      console.log('WhatsApp client is ready!');
      
      // Listen for messages
      client.onMessage(message => messageHandler(client, message));
      
      // Store the client instance in the global variable
      whatsappClient = client;
      
      return client;
    })
    .catch(error => {
      console.error('Error creating WhatsApp client:', error);
      process.exit(1);
    });
};

// Handle connection events
ev.on('qr.**', async qrcode => {
  console.log('QR CODE RECEIVED');
});

ev.on('CONNECTION.LOGGED_OUT', async () => {
  console.log('Client has been logged out!');
  process.exit();
});

// Start the application
start();