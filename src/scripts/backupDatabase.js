/**
 * Script to backup PostgreSQL database
 * 
 * This script creates a backup of the PostgreSQL database specified in the .env file
 * Backups are stored in the /backups directory with timestamp in the filename
 */
require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Backup directory
const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups');

// Get database credentials from environment variables
const {
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD
} = process.env;

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Generate backup filename with timestamp
const timestamp = new Date()
  .toISOString()
  .replace(/:/g, '-')
  .replace(/\..+/, '');
  
const backupFileName = `${DB_NAME}_${timestamp}.backup`;
const backupPath = path.join(BACKUP_DIR, backupFileName);

// Log with timestamp
const logWithTime = (message) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${message}`);
};

// Execute pg_dump command
const backupDatabase = () => {
  // Set environment variable for password
  const env = { ...process.env, PGPASSWORD: DB_PASSWORD };
  
  // Build pg_dump command
  const pgDump = spawn('pg_dump', [
    '-h', DB_HOST,
    '-p', DB_PORT,
    '-U', DB_USER,
    '-F', 'c', // Custom format (compressed)
    '-b', // Include large objects
    '-v', // Verbose
    '-f', backupPath,
    DB_NAME
  ], { env });
  
  logWithTime(`Starting backup of database ${DB_NAME}...`);
  
  // Handle stdout
  pgDump.stdout.on('data', (data) => {
    console.log(data.toString().trim());
  });
  
  // Handle stderr
  pgDump.stderr.on('data', (data) => {
    console.log(data.toString().trim());
  });
  
  // Handle process completion
  pgDump.on('close', (code) => {
    if (code === 0) {
      logWithTime(`Backup completed successfully! File saved to: ${backupPath}`);
      
      // Get file size
      const stats = fs.statSync(backupPath);
      const fileSizeInBytes = stats.size;
      const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);
      
      logWithTime(`Backup file size: ${fileSizeInMegabytes.toFixed(2)} MB`);
      
      // List existing backups
      const files = fs.readdirSync(BACKUP_DIR);
      logWithTime(`Total backups: ${files.length}`);
      
      // Clean up old backups if needed (keep only the last 10)
      if (files.length > 10) {
        // Sort by creation time, oldest first
        const sortedFiles = files
          .map(file => ({
            name: file,
            time: fs.statSync(path.join(BACKUP_DIR, file)).birthtime.getTime()
          }))
          .sort((a, b) => a.time - b.time);
          
        // Remove the oldest backups
        const filesToRemove = sortedFiles.slice(0, files.length - 10);
        
        filesToRemove.forEach(file => {
          try {
            fs.unlinkSync(path.join(BACKUP_DIR, file.name));
            logWithTime(`Removed old backup: ${file.name}`);
          } catch (err) {
            logWithTime(`Error removing old backup ${file.name}: ${err.message}`);
          }
        });
      }
      
    } else {
      logWithTime(`Backup failed with code ${code}`);
    }
  });
  
  // Handle process error
  pgDump.on('error', (err) => {
    logWithTime(`Failed to start backup: ${err.message}`);
    
    if (err.code === 'ENOENT') {
      logWithTime('Error: pg_dump command not found. Make sure PostgreSQL is installed and in your PATH.');
    }
  });
};

// Run the backup
backupDatabase();
