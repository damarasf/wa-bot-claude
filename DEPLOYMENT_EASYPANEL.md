# WA Bot Claude - EasyPanel Deployment Guide

## 1. Build and Run with Docker Compose

1. **Edit your `.env` file** with your production credentials (DB, WhatsApp owner, API keys, etc).
2. **Build and start containers**:
   ```powershell
   docker compose up --build -d
   ```
   This will start both the bot and a PostgreSQL database.

## 2. EasyPanel Deployment

- On EasyPanel, create a new Node.js app and select **Dockerfile** as the deployment method.
- Set environment variables in the EasyPanel UI (copy from `.env.example`).
- Make sure to add a **PostgreSQL service** in EasyPanel and link it to your app.
- Set the `CHROME_PATH` env var to `/usr/bin/chromium-browser`.
- Expose port `3000` (or your custom port).
- For persistent data, mount volumes for `/app/logs`, `/app/backups`, `/app/_IGNORE_wa-bot`, and `/app/wa-bot.data.json` if needed.

## 3. Database Migrations

- The container will run with production settings. To run migrations manually:
   ```powershell
   docker compose exec wa-bot node src/scripts/runMigrations.js
   ```
- Or use EasyPanel's web terminal.

## 4. Backup

- To backup the database:
   ```powershell
   docker compose exec wa-bot node src/scripts/backupDatabase.js
   ```

---

**Note:** Never commit your real `.env` file to git. Use `.env.example` as a template.
