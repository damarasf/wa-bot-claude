# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies (for Chromium)
RUN apk add --no-cache \
    udev \
    ttf-freefont \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    nodejs \
    yarn \
    python3 \
    make \
    g++

# Install PostgreSQL client for backup/migration scripts
# RUN apk add --no-cache postgresql-client

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Set environment variables for Puppeteer/Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    CHROME_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

# Expose the port (default 3000, can be overridden)
EXPOSE 3000

# Start the bot using the production script
CMD ["node", "src/scripts/startBot.js"]
