#!/bin/bash

set -e

echo "🚀 Setting up Cinematic Pointer development environment..."

# Check Node.js version
REQUIRED_NODE_VERSION=20
CURRENT_NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$CURRENT_NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
    echo "❌ Node.js version $REQUIRED_NODE_VERSION or higher is required. Current version: $CURRENT_NODE_VERSION"
    echo "Please install Node.js $REQUIRED_NODE_VERSION or use nvm to switch versions."
    exit 1
fi

echo "✅ Node.js version check passed"

# Check ffmpeg installation
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  ffmpeg is not installed. Please install ffmpeg 6.0 or higher."
    echo "  macOS: brew install ffmpeg"
    echo "  Ubuntu: sudo apt-get install ffmpeg"
    echo "  Windows: Download from https://ffmpeg.org/download.html"
else
    echo "✅ ffmpeg is installed"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
npx playwright install

# Setup Husky
echo "🪝 Setting up Git hooks..."
npm run prepare

# Build the project
echo "🔨 Building the project..."
npm run build

# Run tests
echo "🧪 Running tests..."
npm test

echo ""
echo "✨ Setup complete! You're ready to start developing."
echo ""
echo "Available commands:"
echo "  npm run dev       - Start development mode"
echo "  npm run build     - Build the project"
echo "  npm test          - Run tests"
echo "  npm run lint      - Run linter"
echo "  npm run format    - Format code"
echo ""
echo "Example usage:"
echo "  cinematic-pointer run journeys/example.cinematicpointer.json"