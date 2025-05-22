/**
 * Utility Commands Module
 * Contains utility commands for the bot
 */
const { isUserRegistered } = require('../handlers/userHandler');
const logger = require('../utils/logger');
const validator = require('../utils/validator');
const formatter = require('../utils/formatter');

// Echo a message back to the user
const echo = async (client, message) => {
  const arg = message.body.trim().split(' ');
  
  // Remove the command part
  arg.shift();
  
  const textToEcho = arg.join(' ');
  
  if (textToEcho) {
    await client.reply(message.from, textToEcho, message.id);
    logger.logCommand(message.sender.id, 'echo', true);
  } else {
    await client.reply(
      message.from,
      formatter.error('Please provide text to echo.', 'Usage: !echo [text]'),
      message.id
    );
    logger.logCommand(message.sender.id, 'echo', false, 'No text provided');
  }
};

// Generate a random number
const random = async (client, message) => {
  const args = message.body.trim().split(' ');
  
  let min = 1;
  let max = 100;
  
  if (args.length === 3) {
    min = parseInt(args[1]);
    max = parseInt(args[2]);
    
    if (isNaN(min) || isNaN(max)) {
      await client.reply(
        message.from,
        formatter.error('Invalid numbers.', 'Usage: !random [min] [max]'),
        message.id
      );
      logger.logCommand(message.sender.id, 'random', false, 'Invalid numbers');
      return;
    }
    
    if (!validator.isValidRandomRange(min, max)) {
      await client.reply(
        message.from,
        formatter.error('Min must be less than max.', 'Usage: !random [min] [max]'),
        message.id
      );
      logger.logCommand(message.sender.id, 'random', false, 'Min greater than or equal to max');
      return;
    }
  }
  
  const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
  
  await client.reply(
    message.from,
    formatter.info('Random Number', `Generated number between ${min} and ${max}: *${randomNumber}*`),
    message.id
  );
  logger.logCommand(message.sender.id, 'random', true);
};

// Calculate math expressions
const calculate = async (client, message) => {
  const args = message.body.trim().split(' ');
  
  // Remove the command part
  args.shift();
  
  const expression = args.join(' ');
  
  if (!expression) {
    await client.reply(
      message.from,
      '❌ Please provide a mathematical expression. Usage: !calc [expression]',
      message.id
    );
    logger.logCommand(message.sender.id, 'calc', false, 'No expression provided');
    return;
  }
  
  try {
    // Using Function constructor to safely evaluate math expressions
    // This is safer than eval() but still only for simple math
    // eslint-disable-next-line no-new-func
    const calculate = new Function(
      'return ' + expression
        .replace(/[^-()\d/*+.]/g, '') // Only allow digits and basic math operators
    );
    
    const result = calculate();
    
    await client.reply(
      message.from,
      `🧮 ${expression} = *${result}*`,
      message.id
    );
    logger.logCommand(message.sender.id, 'calc', true);
  } catch (error) {
    await client.reply(
      message.from,
      '❌ Invalid expression. Please provide a valid mathematical expression.',
      message.id
    );
    logger.logCommand(message.sender.id, 'calc', false, error.message);
  }
};

module.exports = {
  echo,
  random,
  calculate
};