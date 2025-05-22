const moment = require('moment');
const logger = require('../utils/logger');
const formatter = require('../utils/formatter');

// Store reminders in memory (you can extend this to use the database)
const reminders = new Map();

/**
 * Set a reminder
 * @param {object} client - The WhatsApp client instance
 * @param {object} message - The message object
 * @returns {Promise<void>}
 */
const setReminder = async (client, message) => {
  try {
    const { body, from, id } = message;
    const phoneNumber = message.sender.id.split('@')[0];
    
    // Format: !remind 5m Buy groceries
    // or: !remind 2h Send the proposal
    // or: !remind 1d Call mom
    const args = body.trim().split(' ');
    args.shift(); // Remove the command part
    
    if (args.length < 2) {
      await client.reply(
        from,
        formatter.error(
          'Invalid format', 
          'Use: !remind [time] [message]\n\nExamples:\n!remind 5m Check email\n!remind 2h Meeting with team\n!remind 1d Call mom'
        ),
        id
      );
      return;
    }
    
    const timeArg = args[0].toLowerCase();
    const reminderText = args.slice(1).join(' ');
    
    // Parse the time (e.g., 5m, 2h, 1d)
    const timeMatch = timeArg.match(/^(\d+)([mhd])$/);
    
    if (!timeMatch) {
      await client.reply(
        from,
        formatter.error(
          'Invalid time format', 
          'Time must be in format: [number][unit]\nUnits: m (minutes), h (hours), d (days)\n\nExamples: 5m, 2h, 1d'
        ),
        id
      );
      return;
    }
    
    const [, amount, unit] = timeMatch;
    let delayMs = 0;
    
    // Convert to milliseconds
    switch (unit) {
      case 'm': // minutes
        delayMs = parseInt(amount) * 60 * 1000;
        break;
      case 'h': // hours
        delayMs = parseInt(amount) * 60 * 60 * 1000;
        break;
      case 'd': // days
        delayMs = parseInt(amount) * 24 * 60 * 60 * 1000;
        break;
    }
    
    if (delayMs === 0 || delayMs > 7 * 24 * 60 * 60 * 1000) { // Maximum 7 days
      await client.reply(
        from,
        formatter.error(
          'Invalid time', 
          'Reminder time must be between 1 minute and 7 days'
        ),
        id
      );
      return;
    }
    
    // Create reminder
    const now = new Date();
    const remindAt = new Date(now.getTime() + delayMs);
    const reminderId = `${phoneNumber}-${now.getTime()}`;
    
    const reminder = {
      id: reminderId,
      phoneNumber,
      text: reminderText,
      createdAt: now,
      remindAt: remindAt,
      chatId: from
    };
    
    // Store reminder
    reminders.set(reminderId, reminder);
    
    // Set timeout for the reminder
    setTimeout(() => {
      triggerReminder(client, reminder);
    }, delayMs);
    
    // Format readable time
    let timeFormat = '';
    if (unit === 'm') timeFormat = `${amount} minute${amount > 1 ? 's' : ''}`;
    if (unit === 'h') timeFormat = `${amount} hour${amount > 1 ? 's' : ''}`;
    if (unit === 'd') timeFormat = `${amount} day${amount > 1 ? 's' : ''}`;
    
    // Confirm reminder creation
    await client.reply(
      from,
      formatter.success(
        '⏰ Reminder Set', 
        {
          'Message': reminderText,
          'Time': `in ${timeFormat} (${moment(remindAt).format('MMMM Do YYYY, h:mm:ss a')})`,
          'ID': reminderId
        }
      ),
      id
    );
    
    logger.logCommand(phoneNumber, 'reminder', true, `Set reminder: ${reminderText}`);
    
  } catch (error) {
    logger.logError('reminderCommand', error);
    
    await client.reply(
      message.from,
      formatter.error('Error', 'Failed to set the reminder. Please try again.'),
      message.id
    );
  }
};

/**
 * Trigger a reminder
 * @param {object} client - The WhatsApp client instance
 * @param {object} reminder - The reminder object
 */
const triggerReminder = async (client, reminder) => {
  try {
    // Send the reminder
    await client.sendText(
      reminder.chatId, 
      formatter.reminder(
        `⏰ REMINDER`, 
        `${reminder.text}\n\n_Set on: ${moment(reminder.createdAt).format('MMMM Do YYYY, h:mm:ss a')}_`
      )
    );
    
    // Remove triggered reminder from the map
    reminders.delete(reminder.id);
    
    logger.log('info', `Reminder triggered for ${reminder.phoneNumber}: ${reminder.text}`);
  } catch (error) {
    logger.logError('triggerReminder', error);
  }
};

/**
 * List all pending reminders for a user
 * @param {object} client - The WhatsApp client instance
 * @param {object} message - The message object
 */
const listReminders = async (client, message) => {
  try {
    const { from, id } = message;
    const phoneNumber = message.sender.id.split('@')[0];
    
    // Find reminders for this user
    const userReminders = Array.from(reminders.values())
      .filter(reminder => reminder.phoneNumber === phoneNumber);
    
    if (userReminders.length === 0) {
      await client.reply(
        from,
        formatter.info('No Reminders', 'You have no pending reminders.'),
        id
      );
      return;
    }
    
    // Sort by reminder time
    userReminders.sort((a, b) => a.remindAt.getTime() - b.remindAt.getTime());
    
    // Format the reminder list
    let reminderList = '';
    userReminders.forEach((reminder, index) => {
      reminderList += `${index + 1}. *${reminder.text}*\n`;
      reminderList += `   _Reminder at: ${moment(reminder.remindAt).format('MMMM Do YYYY, h:mm:ss a')}_\n\n`;
    });
    
    await client.reply(
      from,
      formatter.info(
        `📋 Your Reminders (${userReminders.length})`,
        reminderList
      ),
      id
    );
    
    logger.logCommand(phoneNumber, 'listReminders', true);
  } catch (error) {
    logger.logError('listReminders', error);
    
    await client.reply(
      message.from,
      formatter.error('Error', 'Failed to list reminders. Please try again.'),
      message.id
    );
  }
};

/**
 * Cancel a reminder
 * @param {object} client - The WhatsApp client instance
 * @param {object} message - The message object
 */
const cancelReminder = async (client, message) => {
  try {
    const { body, from, id } = message;
    const phoneNumber = message.sender.id.split('@')[0];
    
    const args = body.trim().split(' ');
    
    if (args.length !== 2) {
      await client.reply(
        from,
        formatter.error('Invalid format', 'Use: !cancelreminder [number]'),
        id
      );
      return;
    }
    
    const reminderNumber = parseInt(args[1]);
    
    if (isNaN(reminderNumber) || reminderNumber < 1) {
      await client.reply(
        from,
        formatter.error('Invalid number', 'Please provide a valid reminder number.'),
        id
      );
      return;
    }
    
    // Find reminders for this user
    const userReminders = Array.from(reminders.values())
      .filter(reminder => reminder.phoneNumber === phoneNumber);
    
    if (userReminders.length === 0) {
      await client.reply(
        from,
        formatter.info('No Reminders', 'You have no pending reminders to cancel.'),
        id
      );
      return;
    }
    
    // Sort by reminder time
    userReminders.sort((a, b) => a.remindAt.getTime() - b.remindAt.getTime());
    
    // Check if the number is valid
    if (reminderNumber > userReminders.length) {
      await client.reply(
        from,
        formatter.error('Invalid reminder number', `You only have ${userReminders.length} reminders.`),
        id
      );
      return;
    }
    
    // Get the reminder to cancel
    const reminderToCancel = userReminders[reminderNumber - 1];
    
    // Remove the reminder
    reminders.delete(reminderToCancel.id);
    
    await client.reply(
      from,
      formatter.success(
        'Reminder Cancelled', 
        `The reminder "${reminderToCancel.text}" has been cancelled.`
      ),
      id
    );
    
    logger.logCommand(phoneNumber, 'cancelReminder', true);
  } catch (error) {
    logger.logError('cancelReminder', error);
    
    await client.reply(
      message.from,
      formatter.error('Error', 'Failed to cancel reminder. Please try again.'),
      message.id
    );
  }
};

module.exports = {
  setReminder,
  listReminders,
  cancelReminder
};
