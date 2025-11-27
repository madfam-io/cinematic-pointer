# API Reference

Complete API documentation for Cinematic Pointer modules.

## Table of Contents

- [Post-Production](#post-production)
  - [FFmpeg](#ffmpeg)
  - [Effects](#effects)
  - [Captions](#captions)
  - [Export](#export)
  - [Privacy](#privacy)
  - [Reframe](#reframe)
- [Themes](#themes)
- [Utils](#utils)

---

## Post-Production

### FFmpeg

**Location:** `src/postprod/ffmpeg.ts`

Fluent API wrapper for FFmpeg commands.

#### `ffmpeg()`

Create a new FFmpeg command builder.

```typescript
import { ffmpeg } from './postprod';

const cmd = ffmpeg()
  .overwrite()
  .input('input.webm')
  .filter('scale=1920:1080')
  .videoCodec('libx264')
  .crf(18)
  .output('output.mp4');

await cmd.run({ onProgress: (seconds) => console.log(seconds) });
```

#### FFmpegCommand Methods

| Method                   | Parameters          | Description              |
| ------------------------ | ------------------- | ------------------------ |
| `input(path, options?)`  | `string, string[]?` | Add input file           |
| `output(path)`           | `string`            | Set output file          |
| `filter(filter)`         | `string`            | Add video filter         |
| `complexFilter(filters)` | `string[]`          | Add complex filter graph |
| `videoCodec(codec)`      | `string`            | Set video codec          |
| `audioCodec(codec)`      | `string`            | Set audio codec          |
| `videoBitrate(bitrate)`  | `string`            | Set video bitrate        |
| `audioBitrate(bitrate)`  | `string`            | Set audio bitrate        |
| `crf(value)`             | `number`            | Set CRF quality (0-51)   |
| `preset(preset)`         | `string`            | Set encoding preset      |
| `fps(rate)`              | `number`            | Set framerate            |
| `pixelFormat(format)`    | `string`            | Set pixel format         |
| `duration(seconds)`      | `number`            | Limit duration           |
| `seek(seconds)`          | `number`            | Seek to position         |
| `overwrite()`            | -                   | Overwrite output         |
| `arg(key, value?)`       | `string, string?`   | Add arbitrary argument   |
| `build()`                | -                   | Get command args         |
| `run(options?)`          | `object?`           | Execute command          |

#### `probe(filePath)`

Get media file metadata.

```typescript
import { probe } from './postprod';

const info = await probe('video.mp4');
// { duration: 60.5, width: 1920, height: 1080, fps: 30 }
```

---

### Effects

**Location:** `src/postprod/effects.ts`

FFmpeg filter generators for video effects.

#### Zoom & Pan

```typescript
import { generateZoomPanFilter, generateSimpleZoomFilter } from './postprod';

// Ken Burns effect with keyframes
const filter = generateZoomPanFilter(
  [
    { time: 0, zoom: 1.0, x: 0.5, y: 0.5 },
    { time: 5, zoom: 1.3, x: 0.3, y: 0.4, ease: 'easeOut' },
  ],
  { width: 1920, height: 1080, duration: 10, fps: 30 },
);

// Simple zoom
const simpleZoom = generateSimpleZoomFilter(
  1.0, // startZoom
  1.2, // endZoom
  0.5, // centerX
  0.5, // centerY
  videoInfo,
);
```

#### Speed Effects

```typescript
import { generateSpeedFilter, generateSpeedRampFilter, generateAudioSpeedFilter } from './postprod';

// Speed segments
const speedFilter = generateSpeedFilter(
  [
    { start: 0, end: 5, speed: 1.0 },
    { start: 5, end: 10, speed: 2.0 },
  ],
  videoInfo,
);

// Smooth speed ramp
const rampFilter = generateSpeedRampFilter(1.0, 2.0, videoInfo);

// Audio speed (atempo chain)
const audioSpeed = generateAudioSpeedFilter(1.5);
```

#### Visual Effects

```typescript
import {
  generateFadeFilter,
  generateVignetteFilter,
  generateColorGradeFilter,
  generateMotionBlurFilter,
} from './postprod';

// Fade in/out
const fade = generateFadeFilter(1.5, 2.0, 60); // fadeIn, fadeOut, duration

// Vignette
const vignette = generateVignetteFilter(0.3); // intensity

// Color grading
const colorGrade = generateColorGradeFilter('warm'); // warm, cool, dramatic

// Motion blur
const motionBlur = generateMotionBlurFilter(0.5); // strength 0-1
```

#### Audio Effects

```typescript
import {
  generateAudioDuckingFilter,
  generateSidechainDuckFilter,
  generateAudioFadeFilter,
  generateVolumeFilter,
  generateNormalizeFilter,
  generateAudioProcessingChain,
} from './postprod';

// Audio ducking
const duckingFilter = generateAudioDuckingFilter({
  duckPoints: [
    { time: 5, duration: 10, level: 0.3 },
    { time: 20, duration: 5, level: 0.5 },
  ],
  attack: 50,
  release: 200,
});

// Complete audio chain
const audioChain = generateAudioProcessingChain({
  normalize: true,
  volume: 0.8,
  fadeIn: 1.5,
  fadeOut: 2.0,
  duration: 60,
  ducking: duckingConfig,
});
```

---

### Captions

**Location:** `src/postprod/captions.ts`

Caption generation and subtitle format support.

#### Caption Types

```typescript
interface Caption {
  start: number; // seconds
  end: number; // seconds
  text: string;
  style?: CaptionStyle;
}

interface CaptionStyle {
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  position?: 'top' | 'center' | 'bottom';
  alignment?: 'left' | 'center' | 'right';
  outline?: number;
  outlineColor?: string;
  shadow?: number;
  bold?: boolean;
  italic?: boolean;
}
```

#### Generate Subtitles

```typescript
import { generateASSSubtitles, generateSRTSubtitles, generateVTTSubtitles } from './postprod';

const captions: Caption[] = [
  { start: 0, end: 3, text: 'Welcome to our demo' },
  { start: 3, end: 6, text: 'Click the button to get started' },
];

const ass = generateASSSubtitles(captions, 1920, 1080, customStyle);
const srt = generateSRTSubtitles(captions);
const vtt = generateVTTSubtitles(captions);
```

#### Export Captions

```typescript
import {
  writeSRTToFile,
  writeVTTToFile,
  writeCaptionsToFile,
  exportCaptions,
  exportAllCaptionFormats,
} from './postprod';

// Single format
await exportCaptions(captions, 'output', 'srt');

// All formats
const files = await exportAllCaptionFormats(captions, 'output', 1920, 1080, customStyle);
// { srt: 'output.srt', vtt: 'output.vtt', ass: 'output.ass' }
```

#### Caption Utilities

```typescript
import {
  mergeCaptions,
  splitLongCaptions,
  extractCaptionsFromEvents,
  generateCaptionsFromSteps,
} from './postprod';

// Merge overlapping captions
const merged = mergeCaptions(captions, 0.5); // gapThreshold

// Split long captions
const split = splitLongCaptions(captions, 80, 8); // maxChars, maxDuration
```

---

### Export

**Location:** `src/postprod/export.ts`

Multi-format video export with platform presets.

#### Export Video

```typescript
import { exportVideo, exportForPlatform } from './postprod';

// Multi-format export
const result = await exportVideo({
  inputPath: 'video.mp4',
  outputDir: 'exports/',
  baseName: 'demo',
  formats: ['mp4', 'webm', 'hevc'],
  aspects: ['16:9', '9:16', '1:1'],
  quality: 'high',
  eventsPath: 'events.ndjson',
  smartCrop: true,
  onProgress: (progress) => console.log(progress.message),
});

// Platform-specific export
const tiktokResult = await exportForPlatform('video.mp4', 'exports/', 'tiktok');
```

#### Available Formats

| Key      | Format       | Extension | Codec      |
| -------- | ------------ | --------- | ---------- |
| `mp4`    | MP4 (H.264)  | `.mp4`    | libx264    |
| `webm`   | WebM (VP9)   | `.webm`   | libvpx-vp9 |
| `hevc`   | HEVC (H.265) | `.mp4`    | libx265    |
| `gif`    | GIF          | `.gif`    | gif        |
| `prores` | ProRes       | `.mov`    | prores_ks  |

#### Platform Presets

| Platform          | Aspect    | Format | Max Duration |
| ----------------- | --------- | ------ | ------------ |
| `youtube`         | 16:9      | mp4    | -            |
| `tiktok`          | 9:16      | mp4    | 180s         |
| `instagram_reels` | 9:16      | mp4    | 90s          |
| `instagram_feed`  | 1:1       | mp4    | 60s          |
| `twitter`         | 16:9, 1:1 | mp4    | 140s         |
| `linkedin`        | 16:9      | mp4    | 600s         |
| `web`             | 16:9      | webm   | -            |
| `archive`         | 16:9      | prores | -            |

#### Utility Functions

```typescript
import { getAvailableFormats, getAvailablePlatforms, estimateFileSizes } from './postprod';

const formats = getAvailableFormats();
const platforms = getAvailablePlatforms();
const estimates = estimateFileSizes(60, ['mp4', 'webm'], ['16:9'], 'high');
```

---

### Privacy

**Location:** `src/postprod/privacy.ts`

Blur maps for sensitive content redaction.

#### Configuration

```typescript
interface BlurMapConfig {
  regions: RedactionRegion[];
  globalSelectors?: Selector[];
  autoDetect?: {
    passwords?: boolean;
    creditCards?: boolean;
    emails?: boolean;
    patterns?: string[];
  };
}

interface RedactionRegion {
  id: string;
  startTime: number;
  endTime?: number;
  type: 'fixed' | 'selector' | 'dynamic';
  coords?: { x: number; y: number; width: number; height: number };
  selector?: Selector;
  padding?: number;
  style: RedactionStyle;
}

interface RedactionStyle {
  type: 'blur' | 'mosaic' | 'solid' | 'pixelate';
  strength?: number;
  color?: string;
  feather?: number;
}
```

#### Generate Blur Filters

```typescript
import {
  generateBlurFilter,
  generateSimpleBlurFilter,
  extractBlurRegionsFromEvents,
  createBlurMapFromJourney,
} from './postprod';

// Simple blur
const simpleBlur = generateSimpleBlurFilter(100, 50, 200, 40, 30);

// From events
const regions = extractBlurRegionsFromEvents(events, blurConfig, 1920, 1080);

// From journey steps
const config = createBlurMapFromJourney(steps);
```

---

### Reframe

**Location:** `src/postprod/reframe.ts`

Smart cropping and aspect ratio conversion.

#### Reframe Video

```typescript
import { reframeVideo, batchReframe, getAvailableAspects } from './postprod';

// Single aspect
const result = await reframeVideo({
  inputPath: 'video.mp4',
  outputPath: 'vertical.mp4',
  targetAspect: '9:16',
  eventsPath: 'events.ndjson',
  smartCrop: true,
  quality: 'high',
  onProgress: (progress) => console.log(progress.message),
});

// Batch all aspects
const results = await batchReframe('video.mp4', 'exports/', ['16:9', '9:16', '1:1'], {
  smartCrop: true,
  quality: 'standard',
});

// Available aspects
const aspects = getAvailableAspects();
```

---

## Themes

**Location:** `src/themes/`

Brand theming system for cursor overlays.

#### Theme Types

```typescript
interface BrandTheme {
  name: string;
  primary: string;
  accent: string;
  background: string;
  text: string;
  font: FontConfig;
  cursor: CursorConfig;
  ripple: RippleConfig;
  trail: TrailConfig;
  focusRing: FocusRingConfig;
  captions: CaptionConfig;
  beats: BeatConfig;
  logo?: LogoConfig;
  customCss?: string;
}
```

#### Theme Manager

```typescript
import { themeManager, getPresetTheme, getPresetThemeNames } from './themes';

// Get preset names
const names = getPresetThemeNames();
// ['default', 'madfam_trailer', 'madfam_howto', ...]

// Set theme
themeManager.setTheme('madfam_trailer');

// Load from file
await themeManager.loadFromFile('./custom-theme.json');

// Apply overrides
themeManager.applyOverrides({
  cursor: { size: 32, color: '#FF5722' },
});

// Get current theme
const theme = themeManager.getTheme();

// Generate CSS
const css = themeManager.getCssVariables();
const overlayStyles = themeManager.generateOverlayStyles();

// Export theme
const json = themeManager.exportTheme();
```

#### Preset Themes

| Name             | Description                    |
| ---------------- | ------------------------------ |
| `default`        | MADFAM brand colors            |
| `madfam_trailer` | High energy, cinematic effects |
| `madfam_howto`   | Clear, instructional style     |
| `madfam_teaser`  | Subtle, elegant appearance     |
| `minimal`        | Clean, no effects              |
| `dark`           | Dark mode optimized            |
| `light`          | Light mode optimized           |

---

## Utils

**Location:** `src/utils/`

Shared utility modules.

### Logger

```typescript
import { logger, LogLevel } from './utils/logger';

logger.setLevel(LogLevel.DEBUG);

logger.debug('Debug message', { extra: 'data' });
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error);
```

### Retry

```typescript
import { withRetry, retryStrategies, RetryStrategy } from './utils/retry';

const result = await withRetry(
  async () => await fetchData(),
  retryStrategies.network,
  (attempt, error, delay) => console.log(`Retry ${attempt} in ${delay}ms`),
);

// Custom strategy
const custom: RetryStrategy = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
};
```

### Errors

```typescript
import {
  CinematicPointerError,
  ValidationError,
  FileNotFoundError,
  DependencyError,
  ExecutionError,
  TimeoutError,
} from './utils/errors';

throw new ValidationError('Invalid journey format', { field: 'steps' });
throw new FileNotFoundError('/path/to/file', { context: { type: 'journey' } });
```

### Validation

```typescript
import {
  validateFileExists,
  validateUrl,
  validateViewport,
  validateSelector,
  validateStep,
  validateJourney,
} from './utils/validation';

validateFileExists('/path/to/file'); // throws if not exists
validateUrl('https://example.com');
validateViewport({ w: 1920, h: 1080 });
```

### Health

```typescript
import { runHealthChecks, checkFFmpeg, checkPlaywright } from './utils/health';

const health = await runHealthChecks();
// { overall: 'healthy', checks: [...] }

const ffmpegOk = await checkFFmpeg();
const playwrightOk = await checkPlaywright();
```
