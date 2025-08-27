# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cinematic Pointer is an automated system that replays preplanned user journeys on the web and produces polished, cinematic videos where the cursor is the protagonist. It's designed for product demos, instructional videos, and storytelling at scale.

## Architecture

### Core Components

1. **Journey DSL** - Declarative JSON format for authoring user flows
2. **Universal Event Schema (UES)** - OS-agnostic event log for overlays, camera moves, and captions
3. **Web Runner** - Playwright-based execution engine with robust selectors
4. **Recording System** - Multiple recorder implementations (PlaywrightVideo, FFmpegScreen, OBSRemote)
5. **Post-Production Pipeline** - FFmpeg-powered auto-editing with zoom/pan, speed ramps, captions, and music

### Key Interfaces

- `Driver` - Abstraction for web/desktop automation
- `Recorder` - Recording interface for capturing video
- Both emit UES events that drive the post-production pipeline

## Development Setup

Quick setup:
```bash
./scripts/setup.sh
```

Or manually:
```bash
npm install
npx playwright install
npm run prepare  # Setup Husky hooks
npm run build
```

Ensure system dependencies:
- Node.js ≥ 20 (use `.nvmrc`)
- ffmpeg ≥ 6.0
- Optional: OBS with WebSocket plugin

## Development Scripts

```bash
npm run dev          # Start development mode with hot reload
npm run build        # Build TypeScript to JavaScript
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npm run test:e2e     # Run Playwright E2E tests
npm run lint         # Check code with ESLint
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Format code with Prettier
npm run format:check # Check formatting
npm run typecheck    # Run TypeScript type checking
```

## CLI Commands

The main entry points:

```bash
# Run a journey
cinematic-pointer run journeys/signup.json \
  --browser=chromium --recorder=playwright --out=artifacts

# Auto-edit recorded footage
cinematic-pointer cut artifacts/raw/video.webm artifacts/events.ndjson \
  --template=trailer --music=assets/uplift_a.mp3 --captions=auto \
  --out=exports/signup_trailer_1080p.mp4

# Reframe for different aspect ratios
cinematic-pointer reframe exports/signup_trailer_1080p.mp4 --aspect=9:16 --smart-crop
```

## Journey DSL Format

Journeys are defined in `.cinematicpointer.json` files:

```json
{
  "meta": { "name": "string", "viewport": { "w": number, "h": number } },
  "start": { "url": "string" },
  "steps": [
    { "action": "click|fill|scroll|hover|press|waitFor|cameraMark|pause", ... }
  ],
  "output": { "preset": "trailer|howto|teaser", "aspect": "16:9|1:1|9:16" }
}
```

## Locator Strategy Priority

1. Accessibility: role/name, label/placeholder, text
2. Test IDs: `data-testid`
3. CSS/XPath fallback

## Testing Approach

- Unit tests for DSL parsing and selector resolution
- Integration tests for complete journeys
- Visual regression tests for overlays
- Chaos testing with network throttle and dynamic content

## Security & Privacy

- Secrets via environment variables only
- Masked fields render as bullets
- Blur maps by selector
- Support for synthetic data in staging

## Performance Targets

- 60-90s trailer renders in < 5 min on MacBook Pro class hardware
- 95% pass rate across supported journeys
- Automatic retry of flaky steps