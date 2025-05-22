const axios = require('axios');
const logger = require('../utils/logger');
const formatter = require('../utils/formatter');
const config = require('../config/config');

/**
 * Get weather information for a location
 * @param {object} client - The WhatsApp client instance
 * @param {object} message - The message object
 * @returns {Promise<void>}
 */
const getWeather = async (client, message) => {
  try {
    const { body, from, id } = message;
    const args = body.trim().split(' ');
    
    // Remove command part
    args.shift();
    
    if (args.length === 0) {
      await client.reply(
        from,
        formatter.error('Invalid format', 'Use: !weather [city name]'),
        id
      );
      return;
    }
    
    const location = args.join(' ');
    const phoneNumber = message.sender.id.split('@')[0];
    
    // Log the command attempt
    logger.logCommand(phoneNumber, 'weather', true, `Requested weather for ${location}`);
    
    // Get API key from environment variable
    const apiKey = process.env.WEATHER_API_KEY;
    
    if (!apiKey) {
      await client.reply(
        from,
        formatter.error('Configuration Error', 'Weather API key is not configured.'),
        id
      );
      logger.logError('weatherCommand', 'Missing WEATHER_API_KEY in environment variables');
      return;
    }
    
    // Send typing indicator
    await client.simulateTyping(from, true);
    
    // Make API call to OpenWeatherMap
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&units=metric&appid=${apiKey}`
    );
    
    // Stop typing indicator
    await client.simulateTyping(from, false);
    
    const weatherData = response.data;
    
    // Format weather data
    const weatherInfo = {
      'Location': `${weatherData.name}, ${weatherData.sys.country}`,
      'Temperature': `${weatherData.main.temp}°C (Feels like ${weatherData.main.feels_like}°C)`,
      'Condition': weatherData.weather[0].description,
      'Humidity': `${weatherData.main.humidity}%`,
      'Wind': `${weatherData.wind.speed} m/s`,
      'Updated': new Date().toLocaleString()
    };
    
    await client.reply(
      from,
      formatter.success('Weather Information', weatherInfo),
      id
    );
    
  } catch (error) {
    // Handle city not found error
    if (error.response && error.response.status === 404) {
      await client.reply(
        from,
        formatter.error('Location Error', 'City not found. Please check the spelling and try again.'),
        message.id
      );
      return;
    }
    
    // Handle other errors
    logger.logError('weatherCommand', error);
    
    await client.reply(
      from,
      formatter.error('Error', 'Failed to fetch weather data. Please try again later.'),
      message.id
    );
  }
};

module.exports = {
  getWeather
};
