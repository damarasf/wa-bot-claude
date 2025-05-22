/**
 * Production startup script for the WhatsApp bot
 * Includes proper error handling and automatic restarts
 */
require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Log files
const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const ERROR_LOG = path.join(LOG_DIR, 'error.log');
const COMBINED_LOG = path.join(LOG_DIR, 'combined.log');

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Open log files
const errorStream = fs.createWriteStream(ERROR_LOG, { flags: 'a' });
const combinedStream = fs.createWriteStream(COMBINED_LOG, { flags: 'a' });

// Log with timestamp
const logWithTime = (message) => {
  const now = new Date().toISOString();
  return `[${now}] ${message}`;
};

// Start the bot
const startBot = () => {
  console.log(logWithTime('Starting WhatsApp Bot...'));
  
  // Path to main bot file
  const botPath = path.join(__dirname, '..', 'index.js');
  
  // Create child process
  const botProcess = spawn('node', [botPath], {
    stdio: ['inherit', 'pipe', 'pipe']
  });
  
  // Log process ID
  console.log(logWithTime(`Bot started with PID: ${botProcess.pid}`));
  
  // Handle stdout (normal output)
  botProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log(output);
    combinedStream.write(logWithTime(output) + '\n');
  });
  
  // Handle stderr (error output)
  botProcess.stderr.on('data', (data) => {
    const error = data.toString().trim();
    console.error('\x1b[31m%s\x1b[0m', error); // Red color in console
    errorStream.write(logWithTime(error) + '\n');
    combinedStream.write(logWithTime(`ERROR: ${error}`) + '\n');
  });
  
  // Handle process exit
  botProcess.on('close', (code) => {
    const message = `Bot process exited with code ${code}`;
    
    console.log(logWithTime(message));
    combinedStream.write(logWithTime(message) + '\n');
    
    if (code !== 0) {
      errorStream.write(logWithTime(`Process crashed with code ${code}`) + '\n');
      
      // Wait 5 seconds before restarting
      console.log(logWithTime('Restarting bot in 5 seconds...'));
      setTimeout(() => {
        startBot();
      }, 5000);
    }
  });
  
  // Handle process errors
  botProcess.on('error', (err) => {
    const message = `Failed to start bot process: ${err.message}`;
    
    console.error(logWithTime(message));
    errorStream.write(logWithTime(message) + '\n');
    combinedStream.write(logWithTime(`ERROR: ${message}`) + '\n');
  });
  
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    console.log(logWithTime('Received SIGINT. Gracefully shutting down bot...'));
    combinedStream.write(logWithTime('Received SIGINT. Gracefully shutting down bot...') + '\n');
    
    // Kill the bot process
    botProcess.kill('SIGINT');
    
    // Exit after giving it some time to shut down gracefully
    setTimeout(() => {
      console.log(logWithTime('Exiting parent process'));
      process.exit(0);
    }, 2000);
  });
};

// Start the bot
startBot();
