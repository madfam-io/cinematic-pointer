FROM node:20-slim

# Install dependencies for Playwright and ffmpeg
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ffmpeg \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Install Playwright browsers
RUN npx playwright install chromium firefox webkit

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV DISPLAY=:99

EXPOSE 3000

CMD ["node", "dist/cli.js"]