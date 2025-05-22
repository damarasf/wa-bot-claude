# WA Bot Claude

An advanced WhatsApp bot built with Node.js and open-wa/wa-automate with PostgreSQL database integration for user registration, management, and AI chat capabilities using n8n integration.

> **Note:** Throughout this document, `{prefix}` refers to your configured command prefix, which defaults to `!` but can be changed in the `.env` file.

## Features

- User registration system with owner, admin, and premium roles
- PostgreSQL database integration
- Environment variable configuration
- UUID-based user identification
- Advanced command handling system
- Interactive chat utilities
- Owner and admin command privileges with broadcast functionality
- Formatted messages with custom styling
- Command authentication middleware
- Weather information command
- Reminder and scheduling system
- Note-taking functionality with search capability
- Rate limiting to prevent spam
- N8N Integration for natural language processing and chatbot functionality
- Role-based access control and usage limits

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- Internet connection for WhatsApp Web

## Installation

1. **Clone the repository**

```bash
git clone https://github.com/damarasf/wa-bot-claude.git
cd wa-bot-claude
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the project root with the following content:

```
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wabot
DB_USER=postgres
DB_PASSWORD=postgres
DB_DIALECT=postgres

# WhatsApp Bot Configuration
SESSION_DATA_PATH=./session
HEADLESS=true
# Set to false for debugging and seeing the browser
DEBUG_MODE=false

# Owner and Admin Configuration
# Owner phone number (has all privileges and can set others as admin)
OWNER_PHONE_NUMBER=628xxxxxxxxxx
# Admin password for admin registration
ADMIN_PASSWORD=your_secure_admin_password

# Weather API Configuration
WEATHER_API_KEY=your_openweathermap_api_key

# Command Configuration
COMMAND_PREFIX=!
ALTERNATE_PREFIX=/

# Rate Limiting Configuration
# Default number of commands per minute (per user)
RATE_LIMIT_DEFAULT=20
# Maximum number of admin commands per minute
RATE_LIMIT_ADMIN=5

# N8N Integration Configuration
N8N_API_URL=http://localhost:5678/webhook/whatsapp
N8N_API_KEY=your_secret_api_key
# Default daily message limit for regular users
N8N_DAILY_LIMIT_DEFAULT=50
# Daily message limit for premium users
N8N_DAILY_LIMIT_PREMIUM=200
# Session timeout in minutes (default: 60 = 1 hour)
N8N_SESSION_TIMEOUT=60
# N8N-only mode (disables regular commands, processes all messages through n8n)
N8N_ONLY_MODE=false
# Auto-register users when in N8N-only mode
N8N_AUTO_REGISTER=false
```

4. **Get a Weather API key**

To use the weather command, you'll need to create a free account at [OpenWeatherMap](https://openweathermap.org/) and get an API key. Once you have it, replace `your_openweathermap_api_key` in the `.env` file with your actual API key.

Update the values according to your setup.

4. **Set up the database**

```bash
npm run setup-db
```

This will create the database if it doesn't exist and run migrations.

5. **Start the bot**

```bash
# For basic startup
npm start

# For development with auto-restart
npm run dev

# For production with error handling, logging, and auto-restart
npm run prod
```

This will create log files in the `logs` directory, which can be useful for debugging and monitoring.

6. **Database Backup**

The bot includes a database backup script that creates compressed PostgreSQL backups:

```bash
# Create a backup of the database
npm run backup
```

The backup script will:
- Create a backup in the `backups` directory with timestamp in the filename
- Keep only the latest 10 backups to manage disk space
- Report backup size and status

## Usage

When the bot starts for the first time, it will display a QR code in the terminal. Scan this QR code with your WhatsApp app to authenticate.

### Available Commands

#### General Commands (No Registration Required)
- `{prefix}register` - Register a new user (use `{prefix}register admin [password]` for admin registration - admins automatically get premium status)
- `{prefix}status` - Check your registration status
- `{prefix}help` - Show help menu

#### Info Commands (Registration Required)
- `{prefix}botinfo` - Display bot information
- `{prefix}datetime` - Show current date and time
- `{prefix}ping` - Test bot response time
- `{prefix}weather [city]` - Get current weather information

#### Utility Commands (Registration Required)
- `{prefix}echo [text]` - Echo back your text
- `{prefix}random [min] [max]` - Generate a random number
- `{prefix}calc [expression]` - Calculate math expressions

#### Reminder Commands (Registration Required)
- `{prefix}remind [time] [message]` - Set a reminder (e.g., 5m, 2h, 1d)
- `{prefix}reminders` - List all your pending reminders
- `{prefix}cancelreminder [number]` - Cancel a specific reminder

#### Note Commands (Registration Required)
- `{prefix}note add [title] | [content] | [tags]` - Add a new note
- `{prefix}note list` - List all your notes
- `{prefix}note [id]` - View a specific note
- `{prefix}note delete [id]` - Delete a specific note
- `{prefix}note search [query]` - Search your notes

#### N8N Integration Commands (Registration Required)
- `{prefix}n8n activate` - Activate N8N Integration (1-hour session)
- `{prefix}n8n deactivate` - Deactivate N8N Integration
- `{prefix}n8n status` - Check your N8N Integration status

#### Premium Features
- **Individual Premium Status**: Premium status is assigned at the user level, not to groups
- **Higher N8N Usage Limits**: Premium users get higher daily usage limits (default: 200 vs. 50)
- **Automatic Premium for Admins**: Users with admin status automatically receive premium benefits
- **Unlimited Usage for Owner**: The owner has unlimited usage for N8N and other limited features
- **Customizable Limits**: Admins can set custom limits for premium users
- **Group Support**: In groups, each user uses their individual limit, not a group-wide limit
- **Usage Tracking**: All usage is tracked per-user, even in group chats
- **How to Get Premium**: Contact the bot owner to upgrade your account to premium

#### Admin Commands
- `{prefix}admin stats` - Show bot statistics (users count, memory usage, etc.)
- `{prefix}admin broadcast [message]` - Send a message to all registered users
- `{prefix}admin restart` - Restart the bot
- `{prefix}n8n upgrade [phone/group] [limit]` - Upgrade a user or group activator to premium N8N integration with optional custom limit

#### Owner Commands
- `{prefix}admin makeadmin [phone]` - Make a user an admin (owner only)
- **Access to All Commands**: The owner can use all commands, including admin commands
- **No Registration Required**: The owner can use commands without registering first
- **Unlimited Usage**: The owner has no daily usage limits

> Note: The command prefixes are configurable in the `.env` file using the `COMMAND_PREFIX` and `ALTERNATE_PREFIX` settings

## Database Migrations

### Running Migrations

We've added convenience scripts to make database setup easier:

```bash
# Set up the database, run migrations, and seed demo data (recommended for first run)
npm run setup-and-migrate

# Just run migrations on an existing database
npm run run-migrations

# Run migrations manually
npm run migrate

# Undo the most recent migration
npm run migrate:undo

# Undo all migrations
npm run migrate:undo:all

# Create a backup of your database
npm run backup
```

### Database Schema

The database includes the following tables:

1. **Users** - Stores registered user information with UUID primary keys
   - Fields: id, phoneNumber, isAdmin, isPremium, createdAt, updatedAt

2. **Notes** - Stores user notes with full text content and tags
   - Fields: id, userId, title, content, tags, createdAt, updatedAt

3. **N8nIntegration** - Stores user-specific N8N integration settings
   - Fields: id, userId, isActive, sessionExpiry, dailyLimit, usageCount, lastResetDate

4. **N8nGroup** - Stores group-specific N8N integration settings
   - Fields: id, groupId, isActive, activatorUserId, sessionExpiry

## Testing

The project includes several test scripts to verify functionality:

```bash
# Test database connection
npm run test:db

# Test reminder functionality
npm run test:reminder

# Test note functionality (requires database)
npm run test:note

# Test weather functionality (requires API key)
npm run test:weather

# Run all tests
npm run test:all
```

## N8N Integration

The bot includes integration with n8n for natural language processing and AI capabilities. This allows users to chat with the bot without using command prefixes.

### Features

- Toggle on/off for both personal and group chats
- 1-hour session timeout for security (configurable via N8N_SESSION_TIMEOUT)
- Daily usage limits with reset at midnight
- Premium user support with higher limits and custom configurations
- Command interface for managing the integration
- Per-user limit tracking (even in group chats)

### Setting Up N8N

1. Install n8n on your server or use n8n.cloud
```bash
npm install n8n -g
```

2. Create a webhook node in n8n:
   - Create a new workflow in n8n
   - Add a webhook node as a trigger
   - Configure it with the path `/webhook/whatsapp`
   - Set authentication to 'Header Auth' with header name 'apiKey'
   - Set the value to match your N8N_API_KEY in .env

3. Add your processing nodes:
   - Connect to a ChatGPT/AI service node
   - Process the incoming message in the webhook payload
   - Return responses as JSON with the format:
   ```json
   {
     "response": "Your AI-generated response here"
   }
   ```

4. Update your .env with the webhook URL:
```
N8N_API_URL=http://your-n8n-instance:5678/webhook/whatsapp
N8N_API_KEY=your_secret_api_key
```

### Using N8N Integration

Users can activate n8n integration with the following commands:

- `{prefix}n8n activate` - Activates n8n integration for 1 hour
- `{prefix}n8n deactivate` - Deactivates n8n integration
- `{prefix}n8n status` - Checks current n8n integration status

Once activated, users can send messages without command prefixes and receive responses processed through n8n.

In group chats, only registered users can activate the integration, but anyone in the group can use it once activated. Each message sent in a group will count against the individual user's daily limit, just like in personal chats.

#### N8N Only Mode

You can configure the bot to operate in "N8N only mode" where it functions purely as an AI assistant:

1. Set `N8N_ONLY_MODE=true` in your `.env` file
2. Set `N8N_AUTO_REGISTER=true` to enable auto-registration of new users
3. With these settings, all other bot commands are disabled
4. New users are automatically registered when they first message the bot
5. All messages are processed through n8n without needing to use the activate command
6. Individual user limits are still enforced based on their premium status

### Usage Limits

- Regular users: 50 messages per day (configurable via N8N_DAILY_LIMIT_DEFAULT)
- Premium users: 200 messages per day (configurable via N8N_DAILY_LIMIT_PREMIUM)
- Premium status is stored at the user level and applies to all features
- Limits are tracked per individual user, even in group chats
- Every message a user sends (whether in personal or group chat) counts against their daily limit
- Limits reset at midnight every day
- Sessions automatically expire after 1 hour of activation

## Project Structure

```
.
├── .env                   # Environment variables
├── .sequelizerc           # Sequelize CLI configuration
├── package.json           # Project dependencies
└── src/
    ├── index.js           # Application entry point 
    ├── commands/          # Bot commands
    │   ├── index.js       # Main command handlers
    │   ├── infoCommands.js # Information-related commands
    │   ├── utilityCommands.js # Utility commands
    │   ├── adminCommands.js # Admin commands
    │   ├── noteCommand.js  # Note-taking commands
    │   ├── reminderCommand.js # Reminder commands
    │   ├── n8nCommands.js  # N8N integration commands
    │   └── weatherCommand.js # Weather commands
    ├── config/            # Configuration files
    │   ├── config.js      # Application configuration
    │   ├── database.js    # Database configuration
    │   ├── initDatabase.js # Database initialization
    │   └── setupDatabase.js # Database setup and migration      
    ├── handlers/          # Business logic handlers
    │   ├── middlewareHandler.js # Command middleware
    │   ├── userHandler.js # User management
    │   ├── noteHandler.js # Note management
    │   └── n8nHandler.js  # N8N integration handler
    ├── migrations/        # Database migrations
    ├── models/            # Database models
    ├── seeders/           # Database seeders    
    ├── test/              # Test scripts
    │   ├── reminderTest.js # Test reminder functionality
    │   ├── noteTest.js    # Test note functionality
    │   └── weatherTest.js # Test weather functionality    
    ├── scripts/           # Utility scripts
    │   ├── runMigrations.js # Database migration script
    │   ├── startBot.js    # Production bot startup script with monitoring
    │   ├── backupDatabase.js # Database backup script
    │   └── testDbConnection.js # Database connection test script
    └── utils/             # Utility functions
        ├── chat.js        # Chat interaction utilities
        ├── formatter.js   # Message formatting utilities
        ├── logger.js      # Logging utilities
        ├── validator.js   # Input validation utilities
        └── rateLimit.js   # Rate limiting utility
```

## Development & Deployment

### Contributing

To contribute to this project:

1. Fork the repository from [https://github.com/damarasf/wa-bot-claude](https://github.com/damarasf/wa-bot-claude)
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### GitHub Workflow

When pushing this project to GitHub, we recommend:

1. **Clone the repository**:
   ```bash
   # Clone the repository
   git clone https://github.com/damarasf/wa-bot-claude.git
   
   # Or if you've already initialized a local repo
   git remote add origin https://github.com/damarasf/wa-bot-claude.git
   ```

2. **Configure sensitive data protection**:
   - The .gitignore file is already set up to exclude sensitive files
   - Never commit your .env file with real credentials
   - Use environment variables in production environments

3. **Deployment suggestions**:
   - Deploy on a VPS or cloud provider with Node.js support
   - Use PM2 for process management in production
   - Set up a PostgreSQL database instance
   - Configure a proper backup strategy

## Disclaimer

This bot is created for educational and personal use only. Before deploying this bot, please ensure:

1. You comply with WhatsApp's Terms of Service
2. You respect user privacy and data protection laws
3. You use the AI integration responsibly and ethically
4. You do not use this bot for spam or any malicious purposes

The developers of this project are not responsible for any misuse or violation of WhatsApp's policies.

## License

ISC

## Acknowledgments

- [open-wa/wa-automate](https://github.com/open-wa/wa-automate-nodejs) - Library for WhatsApp automation
- Sequelize - ORM for database management
- n8n - Workflow automation for integrating AI capabilities
