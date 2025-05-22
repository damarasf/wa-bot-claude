/**
 * Test file for database connection
 * Run this with: node src/test.js
 */
require('dotenv').config();
const { sequelize } = require('./models');
const config = require('./config/config');
const { formatDate } = require('./utils/formatter');

// Test database connection
const testDatabaseConnection = async () => {
  try {
    console.log('🔍 Testing database connection...');
    console.log('-----------------------------------');
    console.log(`Host: ${config.database.host}`);
    console.log(`Port: ${config.database.port}`);
    console.log(`Database: ${config.database.name}`);
    console.log(`User: ${config.database.user}`);
    console.log('-----------------------------------');
    
    // Attempt to connect
    await sequelize.authenticate();
    
    console.log('✅ Connection has been established successfully.');
    console.log(`📅 Current server time: ${formatDate(new Date())}`);
    
    // Check for models
    const models = Object.keys(sequelize.models);
    console.log(`\n📋 Available models: ${models.join(', ')}`);
    
    // Check Users table if it exists
    if (models.includes('User')) {
      const userCount = await sequelize.models.User.count();
      console.log(`👥 Number of users in database: ${userCount}`);
    }
    
    console.log('\n⚡ Database connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

// Run the test
testDatabaseConnection();