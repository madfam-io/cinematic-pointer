# Cinematic Pointer

An automated system that replays preplanned user journeys on the web and produces polished, cinematic videos where the cursor is the protagonist. Designed for product demos, instructional videos, and storytelling at scale.

## Features

- **Declarative Journey DSL** — Author flows in JSON with step-by-step actions
- **Playwright-Based Execution** — Robust selectors, assertions, and retries
- **Cinematic Cursor Overlay** — Trails, ripples, focus rings, and camera beats
- **FFmpeg Post-Production** — Zooms, pans, speed ramps, captions, and music
- **Multi-Format Export** — MP4, WebM, HEVC, GIF, ProRes
- **Multi-Aspect Exports** — 16:9, 1:1, 9:16, 4:3, 21:9
- **Platform Presets** — YouTube, TikTok, Instagram, Twitter, LinkedIn
- **Brand Theming** — Customizable colors, fonts, and cursor styles
- **Privacy by Design** — Blur maps, masking, and synthetic data support

## Quick Start

### Installation

```bash
git clone https://github.com/madfam/cinematic-pointer.git
cd cinematic-pointer
npm install
npx playwright install
npm run build
```

**System Requirements:**

- Node.js ≥ 20
- FFmpeg ≥ 6.0
- Optional: OBS with WebSocket plugin

### Create a Journey

Create a `.cinematicpointer.json` file:

```json
{
  "meta": {
    "name": "Product Demo",
    "viewport": { "w": 1440, "h": 900 }
  },
  "start": { "url": "https://example.com" },
  "steps": [
    { "comment": "Hero scroll", "action": "scroll", "to": "center", "durationMs": 1200 },
    {
      "action": "click",
      "locator": { "role": "button", "name": "Get Started" },
      "cinema": { "beat": "impact", "ripple": true }
    },
    {
      "action": "fill",
      "locator": { "placeholder": "Email" },
      "text": "demo@example.com",
      "mask": true
    },
    { "action": "press", "key": "Enter" },
    { "action": "waitFor", "locator": { "text": "Welcome" } },
    { "action": "cameraMark", "zoom": 1.3, "target": { "text": "Welcome" }, "durationMs": 900 }
  ],
  "output": {
    "preset": "trailer",
    "aspect": "16:9",
    "music": "uplift_a",
    "captions": true
  }
}
```

### Run the Journey

```bash
# Execute and record
cinematic-pointer run journeys/demo.json \
  --browser=chromium --recorder=playwright --out=artifacts

# Auto-edit the recording
cinematic-pointer cut artifacts/raw/video.webm artifacts/events.ndjson \
  --template=trailer --music=assets/uplift_a.mp3 --captions=auto \
  --out=exports/demo_trailer.mp4

# Create vertical version for social
cinematic-pointer reframe exports/demo_trailer.mp4 --aspect=9:16 --smart-crop
```

## CLI Commands

### `run` - Execute a Journey

```bash
cinematic-pointer run <journey> [options]

Options:
  --browser      Browser to use (chromium, firefox, webkit)
  --recorder     Recording method (playwright, ffmpeg, obs)
  --out          Output directory
  --headless     Run in headless mode
  --headed       Run with visible browser
  --timeout      Step timeout in ms
  --retries      Retry failed steps
  --brand        Brand theme to apply
  --no-overlay   Disable cursor overlay
  --no-recording Skip video recording
```

### `cut` - Post-Production

```bash
cinematic-pointer cut <video> <events> [options]

Options:
  --template     Edit template (trailer, howto, teaser)
  --music        Background music file
  --captions     Caption mode (auto, none, file)
  --aspect       Output aspect ratio
  --quality      Quality level (draft, standard, high)
  --out          Output file path
```

### `reframe` - Aspect Ratio Conversion

```bash
cinematic-pointer reframe <video> [options]

Options:
  --aspect       Target aspect ratio (16:9, 9:16, 1:1, 4:3, 21:9)
  --smart-crop   Use event data for intelligent cropping
  --events       Events file for smart crop focus detection
  --batch        Generate all aspect ratios
  --quality      Quality level (draft, standard, high)
  --out          Output file path
```

### `doctor` - System Health Check

```bash
cinematic-pointer doctor [options]

Options:
  --json         Output results as JSON
```

## Journey DSL Reference

### Step Actions

| Action       | Description          | Key Properties                 |
| ------------ | -------------------- | ------------------------------ |
| `click`      | Click an element     | `locator`, `button`            |
| `fill`       | Type into an input   | `locator`, `text`, `mask`      |
| `hover`      | Hover over element   | `locator`                      |
| `scroll`     | Scroll the page      | `to` (top/center/bottom/{x,y}) |
| `press`      | Press a keyboard key | `key`                          |
| `waitFor`    | Wait for condition   | `locator`, `timeoutMs`         |
| `cameraMark` | Mark camera position | `zoom`, `target`, `durationMs` |
| `pause`      | Wait without action  | `durationMs`                   |

### Locator Strategy

Selectors are resolved in priority order:

1. **Accessibility**: `role`, `name`, `label`, `placeholder`
2. **Test IDs**: `data-testid`
3. **CSS/XPath**: `by: "css"` or `by: "xpath"`

```json
{ "role": "button", "name": "Submit" }
{ "placeholder": "Email address" }
{ "text": "Welcome back" }
{ "by": "css", "value": ".hero-section button" }
{ "by": "testid", "value": "login-button" }
```

### Cinema Effects

```json
{
  "action": "click",
  "locator": { "text": "Submit" },
  "cinema": {
    "beat": "impact",
    "ripple": true,
    "zoom": 1.2
  }
}
```

## Brand Themes

Apply custom branding with theme presets or custom configurations:

```bash
# Use a preset
cinematic-pointer run journey.json --brand=madfam_trailer

# Available presets
- default
- madfam_trailer (high energy, cinematic)
- madfam_howto (instructional, clear)
- madfam_teaser (subtle, elegant)
- minimal
- dark
- light
```

Custom theme JSON:

```json
{
  "name": "my_brand",
  "primary": "#00E0A4",
  "accent": "#003434",
  "cursor": {
    "size": 28,
    "color": "#00E0A4",
    "shape": "circle"
  },
  "ripple": {
    "size": 120,
    "duration": 800
  }
}
```

## Export Formats

### Video Formats

| Format       | Extension | Use Case                     |
| ------------ | --------- | ---------------------------- |
| MP4 (H.264)  | `.mp4`    | Universal compatibility      |
| WebM (VP9)   | `.webm`   | Web embedding, smaller files |
| HEVC (H.265) | `.mp4`    | Better compression           |
| GIF          | `.gif`    | Simple animations            |
| ProRes       | `.mov`    | Professional editing         |

### Platform Presets

```bash
# Export for specific platform
cinematic-pointer export video.mp4 --platform=tiktok
```

| Platform        | Aspect    | Format | Max Duration |
| --------------- | --------- | ------ | ------------ |
| YouTube         | 16:9      | MP4    | -            |
| TikTok          | 9:16      | MP4    | 3 min        |
| Instagram Reels | 9:16      | MP4    | 90s          |
| Instagram Feed  | 1:1       | MP4    | 60s          |
| Twitter         | 16:9, 1:1 | MP4    | 2:20         |
| LinkedIn        | 16:9      | MP4    | 10 min       |

## Privacy & Security

### Blur Maps

Automatically redact sensitive content:

```json
{
  "privacy": {
    "autoDetect": {
      "passwords": true,
      "creditCards": true,
      "emails": true
    },
    "regions": [
      {
        "id": "sensitive-input",
        "type": "selector",
        "selector": { "placeholder": "SSN" },
        "style": { "type": "blur", "strength": 30 }
      }
    ]
  }
}
```

### Masking

Mark fields to render as bullets:

```json
{
  "action": "fill",
  "locator": { "placeholder": "Password" },
  "text": "secret123",
  "mask": true
}
```

## Development

### Scripts

```bash
npm run dev          # Development mode with hot reload
npm run build        # Build TypeScript
npm run test         # Run unit tests
npm run test:e2e     # Run E2E tests
npm run lint         # Check code style
npm run format       # Format code
npm run typecheck    # Type checking
```

### Project Structure

```
src/
├── cli.ts              # CLI entry point
├── commands/           # CLI command handlers
├── drivers/            # Browser automation drivers
├── executor/           # Journey execution engine
├── overlay/            # Cursor overlay injection
├── postprod/           # Post-production pipeline
│   ├── ffmpeg.ts       # FFmpeg wrapper
│   ├── effects.ts      # Video effects
│   ├── captions.ts     # Caption generation
│   ├── export.ts       # Multi-format export
│   ├── privacy.ts      # Blur maps
│   └── reframe.ts      # Aspect conversion
├── recorders/          # Recording implementations
├── themes/             # Brand theming system
├── types/              # TypeScript definitions
└── utils/              # Utility modules
```

## Roadmap

- **Phase 1 (Complete):** Web automation, Playwright runner, FFmpeg auto-edit
- **Phase 2:** Desktop record-only mode (whole OS capture)
- **Phase 3:** Desktop automation drivers (macOS/Windows/Linux)
- **Phase 4:** Visual recorder (capture human walkthroughs)

## Contributing

Pull requests welcome. For major changes, open an issue first.

## License

Proprietary © 2025 Innovaciones MADFAM S.A.S. de C.V. All rights reserved.

## Credits

Created by **Aldo Ruiz Luna** and the MADFAM team.
