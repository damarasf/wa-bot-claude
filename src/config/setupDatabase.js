require('dotenv').config();
const { Sequelize } = require('sequelize');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Create database if it doesn't exist
 */
const createDatabaseIfNotExists = async () => {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_DIALECT } = process.env;

  // Connect to PostgreSQL's default database to create our application database
  const sequelize = new Sequelize('postgres', DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: DB_DIALECT,
    logging: false
  });

  try {
    // Check connection
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL successfully.');

    // Create the database if it doesn't exist
    await sequelize.query(`SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'`)
      .then(async ([results]) => {
        if (results.length === 0) {
          console.log(`Database ${DB_NAME} does not exist. Creating...`);
          await sequelize.query(`CREATE DATABASE ${DB_NAME}`);
          console.log(`Database ${DB_NAME} created successfully.`);
        } else {
          console.log(`Database ${DB_NAME} already exists.`);
        }
      });

    await sequelize.close();
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
};

/**
 * Run database migrations
 */
const runMigrations = async () => {
  try {
    console.log('Running migrations...');
    const { stdout, stderr } = await execPromise('npx sequelize-cli db:migrate');
    
    if (stderr) {
      console.error('Migration error:', stderr);
      return false;
    }
    
    console.log('Migration output:', stdout);
    console.log('Migrations completed successfully.');
    return true;
  } catch (error) {
    console.error('Migration execution error:', error);
    return false;
  }
};

/**
 * Setup the database
 */
const setupDatabase = async () => {
  // Create database if not exists
  const dbCreated = await createDatabaseIfNotExists();
  if (!dbCreated) {
    console.error('Failed to create database. Exiting...');
    process.exit(1);
  }

  // Run migrations
  const migrationsRun = await runMigrations();
  if (!migrationsRun) {
    console.error('Failed to run migrations. Exiting...');
    process.exit(1);
  }

  console.log('Database setup completed successfully.');
};

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
