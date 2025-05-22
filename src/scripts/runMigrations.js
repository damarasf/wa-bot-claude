// Script to run database migrations

require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const runMigrations = async () => {
  try {
    console.log('Running database migrations...');
    
    // Run migrations
    const { stdout: migrateOut, stderr: migrateErr } = await execAsync('npx sequelize-cli db:migrate');
    
    if (migrateErr) {
      console.error('Migration error:', migrateErr);
      return;
    }
    
    console.log('Migration output:', migrateOut);
    console.log('Migrations completed successfully!');
    
    // Ask if we should run seeders
    const runSeeders = process.argv.includes('--seed');
    
    if (runSeeders) {
      console.log('Running seeders...');
      const { stdout: seedOut, stderr: seedErr } = await execAsync('npx sequelize-cli db:seed:all');
      
      if (seedErr) {
        console.error('Seeder error:', seedErr);
        return;
      }
      
      console.log('Seeder output:', seedOut);
      console.log('Seeders completed successfully!');
    }
    
  } catch (error) {
    console.error('Error running migrations:', error.message);
  }
};

// Run the function
runMigrations();
