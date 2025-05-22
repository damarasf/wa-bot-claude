/**
 * Simple test script to verify the reminder functionality
 */
require('dotenv').config();
const reminderCommand = require('../commands/reminderCommand');

// Mock client and message objects
const mockClient = {
  reply: (to, message, id) => {
    console.log('REPLY:', message);
    return Promise.resolve();
  },
  sendText: (to, message) => {
    console.log('SEND TEXT:', message);
    return Promise.resolve();
  },
  simulateTyping: () => Promise.resolve()
};

const mockMessage = {
  body: '!remind 5s Test reminder',
  from: 'test-chat',
  id: 'test-message-id',
  sender: {
    id: '1234567890@s.whatsapp.net'
  }
};

// Test the reminder functionality
const testReminder = async () => {
  console.log('Testing reminder functionality...');
  console.log('Setting a reminder for 5 seconds from now');
  
  await reminderCommand.setReminder(mockClient, mockMessage);
  
  console.log('\nWaiting for reminder to trigger...');
  
  // Wait for the reminder to be triggered
  setTimeout(async () => {
    console.log('\nTesting list reminders functionality...');
    
    // Now create another reminder that won't trigger during this test
    const longReminderMessage = {...mockMessage, body: '!remind 1h Long reminder'};
    await reminderCommand.setReminder(mockClient, longReminderMessage);
    
    // Test list reminders
    await reminderCommand.listReminders(mockClient, mockMessage);
    
    // Test cancel reminder
    console.log('\nTesting cancel reminder functionality...');
    const cancelMessage = {...mockMessage, body: '!cancelreminder 1'};
    await reminderCommand.cancelReminder(mockClient, cancelMessage);
    
    // Verify the reminder was cancelled
    console.log('\nVerifying reminder was cancelled...');
    await reminderCommand.listReminders(mockClient, mockMessage);
    
    console.log('\nReminder test completed!');
    process.exit(0);
  }, 6000);
};

// Run the test
testReminder();
