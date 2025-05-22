/**
 * Database reset script - drops all tables and re-runs migrations
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');
const { exec } = require('child_process');
const config = require('./database');

// Get configuration for the current environment
const dbConfig = config[process.env.NODE_ENV || 'development'];

// Connect to the database
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    logging: console.log
  }
);

const reset = async () => {
  try {
    // Connect to PostgreSQL
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL successfully.');

    // Drop all tables
    console.log('Dropping all tables...');
    await sequelize.query('DROP SCHEMA public CASCADE;');
    await sequelize.query('CREATE SCHEMA public;');
    
    // Grant privileges back to postgres user
    await sequelize.query('GRANT ALL ON SCHEMA public TO postgres;');
    await sequelize.query('GRANT ALL ON SCHEMA public TO public;');
    
    console.log('All tables dropped successfully.');
    
    // Run migrations
    console.log('Running migrations...');
    exec('npx sequelize-cli db:migrate', (error, stdout, stderr) => {
      if (error) {
        console.error('Migration execution error:', error);
        console.log('Stdout:', stdout);
        console.error('Stderr:', stderr);
        process.exit(1);
      }
      
      console.log(stdout);
      console.log('Migrations completed successfully.');
      
      // Run seeders if needed
      console.log('Running seeders...');
      exec('npx sequelize-cli db:seed:all', (error, stdout, stderr) => {
        if (error) {
          console.error('Seeder execution warning:', error.message);
          console.log('Stdout:', stdout);
          console.error('Stderr:', stderr);
          // Not exiting on seeder failure
        } else {
          console.log(stdout);
          console.log('Seeders completed successfully.');
        }
        
        console.log('Database reset and setup complete!');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
};

// Run the reset process
reset();
