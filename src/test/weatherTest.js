/**
 * Simple test script to verify the weather functionality
 */
require('dotenv').config();
const weatherCommand = require('../commands/weatherCommand');

// Check if API key is configured
const apiKey = process.env.WEATHER_API_KEY;
if (!apiKey || apiKey === 'your_openweathermap_api_key') {
  console.error('Error: WEATHER_API_KEY is not configured in .env file');
  console.log('Please set up a valid OpenWeatherMap API key in your .env file');
  process.exit(1);
}

// Mock client object
const mockClient = {
  reply: (to, message, id) => {
    console.log('RESPONSE:', message);
    return Promise.resolve();
  },
  simulateTyping: () => Promise.resolve()
};

// Test cities
const testCities = [
  'London',
  'New York',
  'Tokyo',
  'InvalidCityName123456789'
];

// Test the weather functionality
const testWeather = async () => {
  console.log('Testing weather functionality...');
  
  for (const city of testCities) {
    console.log(`\nTesting weather for "${city}"`);
    
    const mockMessage = {
      body: `!weather ${city}`,
      from: 'test-chat',
      id: 'test-message-id',
      sender: {
        id: '1234567890@s.whatsapp.net'
      }
    };
    
    await weatherCommand.getWeather(mockClient, mockMessage);
  }
  
  console.log('\nWeather test completed!');
  process.exit(0);
};

// Run the test
testWeather();
