# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Cinematic Pointer is an automated system that replays preplanned user journeys on the web and produces polished, cinematic videos where the cursor is the protagonist. Designed for product demos, instructional videos, and storytelling at scale.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI (src/cli.ts)                          │
├─────────────────────────────────────────────────────────────────┤
│  run          │   cut           │   reframe      │   doctor     │
├───────────────┼─────────────────┼────────────────┼──────────────┤
│               │                 │                │              │
│  ┌─────────┐  │  ┌───────────┐  │  ┌──────────┐  │  ┌────────┐  │
│  │Executor │  │  │ Pipeline  │  │  │ Reframe  │  │  │ Health │  │
│  └────┬────┘  │  └─────┬─────┘  │  └────┬─────┘  │  └────────┘  │
│       │       │        │        │       │        │              │
│  ┌────┴────┐  │  ┌─────┴─────┐  │  ┌────┴─────┐  │              │
│  │ Driver  │  │  │  FFmpeg   │  │  │  FFmpeg  │  │              │
│  │Playwright│  │  │  Effects  │  │  │  Smart   │  │              │
│  └────┬────┘  │  │  Captions │  │  │  Crop    │  │              │
│       │       │  │  Export   │  │  └──────────┘  │              │
│  ┌────┴────┐  │  └───────────┘  │                │              │
│  │Recorder │  │                 │                │              │
│  │ Overlay │  │                 │                │              │
│  └─────────┘  │                 │                │              │
└───────────────┴─────────────────┴────────────────┴──────────────┘
```

### Module Overview

| Module          | Location         | Purpose                            |
| --------------- | ---------------- | ---------------------------------- |
| CLI             | `src/cli.ts`     | Command-line interface entry point |
| Executor        | `src/executor/`  | Journey parsing and step execution |
| Driver          | `src/drivers/`   | Browser automation (Playwright)    |
| Recorder        | `src/recorders/` | Video capture implementations      |
| Overlay         | `src/overlay/`   | Cursor effects injection           |
| Post-Production | `src/postprod/`  | FFmpeg video processing            |
| Themes          | `src/themes/`    | Brand theming system               |
| Utils           | `src/utils/`     | Shared utilities                   |
| Types           | `src/types/`     | TypeScript definitions             |

### Key Interfaces

```typescript
// Driver - Browser automation abstraction
interface Driver {
  init(meta: Meta): Promise<void>;
  goto(url: string): Promise<void>;
  click(sel: Selector): Promise<void>;
  fill(sel: Selector, text: string, mask?: boolean): Promise<void>;
  hover(sel: Selector): Promise<void>;
  scroll(to: ScrollTarget): Promise<void>;
  press(key: string): Promise<void>;
  waitFor(condition: Condition): Promise<void>;
  teardown(): Promise<void>;
}

// Recorder - Video capture abstraction
interface Recorder {
  start(meta: Meta): Promise<void>;
  mark(event: UesEvent): void;
  stop(): Promise<RecordingArtifacts>;
}

// UesEvent - Universal Event Schema
interface UesEvent {
  ts: number; // Timestamp in ms
  t: string; // Event type
  to?: number[]; // Target coordinates
  from?: number[]; // Source coordinates
  // ... additional properties per event type
}
```

## Development Setup

### Quick Setup

```bash
./scripts/setup.sh
```

### Manual Setup

```bash
npm install
npx playwright install
npm run prepare  # Setup Husky hooks
npm run build
```

### System Dependencies

- Node.js ≥ 20 (see `.nvmrc`)
- FFmpeg ≥ 6.0
- Optional: OBS with WebSocket plugin

## Development Scripts

```bash
npm run dev          # Development mode with hot reload
npm run build        # Build TypeScript to JavaScript
npm run test         # Run unit tests (Jest)
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npm run test:e2e     # Run E2E tests (Playwright)
npm run lint         # Check code with ESLint
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Format code with Prettier
npm run format:check # Check formatting
npm run typecheck    # Run TypeScript type checking
```

## CLI Commands

### `run` - Execute a Journey

```bash
cinematic-pointer run <journey.json> \
  --browser=chromium \
  --recorder=playwright \
  --out=artifacts \
  --brand=madfam_trailer \
  --headed
```

### `cut` - Post-Production

```bash
cinematic-pointer cut <video.webm> <events.ndjson> \
  --template=trailer \
  --music=assets/uplift_a.mp3 \
  --captions=auto \
  --aspect=16:9 \
  --quality=high \
  --out=exports/output.mp4
```

### `reframe` - Aspect Conversion

```bash
cinematic-pointer reframe <video.mp4> \
  --aspect=9:16 \
  --smart-crop \
  --events=events.ndjson \
  --quality=standard
```

### `doctor` - System Health Check

```bash
cinematic-pointer doctor --json
```

## Journey DSL Format

Journeys are defined in `.cinematicpointer.json` files:

```json
{
  "meta": {
    "name": "string",
    "description": "string",
    "viewport": { "w": 1440, "h": 900 }
  },
  "start": { "url": "https://example.com" },
  "steps": [
    {
      "action": "click|fill|scroll|hover|press|waitFor|cameraMark|pause",
      "locator": { "role": "button", "name": "Submit" },
      "cinema": { "beat": "impact", "ripple": true, "zoom": 1.2 }
    }
  ],
  "output": {
    "preset": "trailer|howto|teaser",
    "aspect": "16:9|1:1|9:16",
    "music": "track_name",
    "captions": true
  }
}
```

### Step Actions

| Action       | Required Props         | Optional Props                 |
| ------------ | ---------------------- | ------------------------------ |
| `click`      | `locator`              | `button`, `cinema`             |
| `fill`       | `locator`, `text`      | `mask`, `cinema`               |
| `hover`      | `locator`              | `cinema`                       |
| `scroll`     | `to`                   | `durationMs`                   |
| `press`      | `key`                  | -                              |
| `waitFor`    | `locator` or condition | `timeoutMs`                    |
| `cameraMark` | -                      | `zoom`, `target`, `durationMs` |
| `pause`      | `durationMs`           | -                              |
| `navigate`   | `to` (URL)             | `waitFor`                      |

## Locator Strategy Priority

1. **Accessibility**: `role`, `name`, `label`, `placeholder`
2. **Test IDs**: `data-testid`
3. **CSS/XPath fallback**: `by: "css"`, `by: "xpath"`

```typescript
// Resolution order in src/utils/selector.ts
const strategies = [
  resolveByRole,
  resolveByLabel,
  resolveByPlaceholder,
  resolveByText,
  resolveByTestId,
  resolveByCss,
  resolveByXPath,
];
```

## Post-Production Pipeline

### FFmpeg Module (`src/postprod/ffmpeg.ts`)

Fluent API for building FFmpeg commands:

```typescript
await ffmpeg()
  .overwrite()
  .input('input.webm')
  .filter('zoompan=z=1.2:d=100:s=1920x1080')
  .videoCodec('libx264')
  .crf(18)
  .preset('slow')
  .audioCodec('aac')
  .audioBitrate('192k')
  .output('output.mp4')
  .run({ onProgress: (seconds) => console.log(seconds) });
```

### Effects Module (`src/postprod/effects.ts`)

- `generateZoomPanFilter()` - Ken Burns effect
- `generateSpeedFilter()` - Speed ramps with setpts
- `generateFadeFilter()` - Fade in/out
- `generateMotionBlurFilter()` - Motion blur
- `generateAudioDuckingFilter()` - Audio ducking
- `generateColorGradeFilter()` - Color grading presets

### Caption Module (`src/postprod/captions.ts`)

- `generateASSSubtitles()` - ASS format with styling
- `generateSRTSubtitles()` - SRT format
- `generateVTTSubtitles()` - WebVTT format
- `exportCaptions()` - Export to any format

### Export Module (`src/postprod/export.ts`)

Multi-format export with platform presets:

```typescript
await exportVideo({
  inputPath: 'video.mp4',
  outputDir: 'exports/',
  formats: ['mp4', 'webm'],
  aspects: ['16:9', '9:16', '1:1'],
  quality: 'high',
});

await exportForPlatform('video.mp4', 'exports/', 'tiktok');
```

### Privacy Module (`src/postprod/privacy.ts`)

Blur maps for sensitive content:

```typescript
const config: BlurMapConfig = {
  regions: [
    {
      id: 'password-field',
      type: 'selector',
      selector: { placeholder: 'Password' },
      style: { type: 'blur', strength: 30 },
    },
  ],
  autoDetect: {
    passwords: true,
    creditCards: true,
  },
};
```

## Brand Theming (`src/themes/`)

### Theme Presets

- `default` - MADFAM brand colors
- `madfam_trailer` - High energy, cinematic
- `madfam_howto` - Clear, instructional
- `madfam_teaser` - Subtle, elegant
- `minimal` - Clean, no effects
- `dark` - Dark mode optimized
- `light` - Light mode optimized

### Theme Manager

```typescript
import { themeManager } from './themes';

// Use preset
themeManager.setTheme('madfam_trailer');

// Load custom theme
await themeManager.loadFromFile('./my-theme.json');

// Apply overrides
themeManager.applyOverrides({ cursor: { size: 32 } });

// Generate CSS
const css = themeManager.generateOverlayStyles();
```

## Testing Approach

### Unit Tests (`src/__tests__/`)

**644 tests across 22 test suites** covering:

- Captions: generation, formats (ASS/SRT/VTT), manipulation
- Effects: zoom, speed, fade, motion blur, audio ducking
- Export: multi-format output, platform presets
- Privacy: blur filter generation, selector matching
- FFmpeg: command builder, filter chains
- Templates: edit presets, quality settings
- Themes: preset validation, CSS generation
- Validation: input/file/URL/journey validation
- Selector: resolution strategies
- Errors: custom error classes, utilities
- Logger: structured logging
- Retry: exponential backoff with jitter
- Health: dependency checks
- UES: event emission, NDJSON I/O
- Time/Aspect/Colors: utility functions

### E2E Tests (`tests/e2e/`)

- Journey execution against real sites
- Overlay injection and effects
- CLI command execution
- Recording artifacts

### Running Tests

```bash
npm test                          # Unit tests
npm run test:coverage             # With coverage
npm run test:e2e                  # E2E tests
npm run test:e2e -- --project=chromium  # Single browser
```

### Coverage

| Metric     | Coverage |
| ---------- | -------- |
| Statements | ~54%     |
| Branches   | ~57%     |
| Functions  | ~67%     |
| Lines      | ~54%     |

**Note:** Remaining uncovered code requires integration tests (FFmpeg/Playwright) or uses dynamic imports.

## Error Handling

Custom error classes in `src/utils/errors.ts`:

```typescript
class CinematicPointerError extends Error
class ValidationError extends CinematicPointerError
class FileNotFoundError extends CinematicPointerError
class DependencyError extends CinematicPointerError
class ExecutionError extends CinematicPointerError
class TimeoutError extends CinematicPointerError
```

## Retry Logic

Exponential backoff with jitter in `src/utils/retry.ts`:

```typescript
import { withRetry, retryStrategies } from './utils/retry';

const result = await withRetry(
  async () => await riskyOperation(),
  retryStrategies.network,
  (attempt, error) => console.log(`Attempt ${attempt} failed`),
);
```

## Logging

Structured logging in `src/utils/logger.ts`:

```typescript
import { logger } from './utils/logger';

logger.info('Starting journey', { name: journey.meta.name });
logger.error('Step failed', error, { step: stepIndex });
```

Log levels: `debug`, `info`, `warn`, `error`

## Security & Privacy

- Secrets via environment variables only
- `mask: true` renders field values as bullets
- Blur maps redact sensitive regions
- Auto-detection for passwords, credit cards, emails

## Performance Targets

- 60-90s trailer renders in < 5 min (MacBook Pro class)
- 95% pass rate across supported journeys
- Automatic retry of flaky steps

## Code Style

- TypeScript strict mode
- ESLint with Prettier
- Import order: builtin → external → internal → relative
- Unused variables prefixed with `_`

## CI/CD

GitHub Actions workflows:

- `.github/workflows/ci.yml` - Lint, test, build, E2E
- `.github/workflows/release.yml` - Tagged releases, npm publish
