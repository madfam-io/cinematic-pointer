# Cinematic Pointer — README

## Overview

**Cinematic Pointer** is an automated system that replays preplanned user journeys (initially on the web) and produces polished, cinematic videos where the cursor is the protagonist. It is designed for product demos, instructional videos, and storytelling at scale.

- **MVP Scope:** Web automation using Playwright.
- **Future Scope:** Extendable to desktop OS (macOS, Windows, Linux).
- **Core Idea:** Write a script once → Replay → Auto-record → Auto-edit into cinematic exports (16:9, 1:1, 9:16).

---

## Features

- **Declarative Journey DSL** — author flows in JSON.
- **Universal Event Schema (UES)** — OS-agnostic event logs.
- **Web Runner (Playwright)** — robust selectors, assertions, retries.
- **Cursor Overlay** — trails, ripples, focus ring, camera beats.
- **Auto-Editing Pipeline** — ffmpeg-powered zooms, pans, speed ramps, captions, music.
- **Multi-Aspect Exports** — landscape, square, vertical (social ready).
- **Privacy by Design** — masking, blur maps, synthetic data.

---

## Installation

```bash
git clone https://github.com/madfam/cinematic-pointer.git
cd cinematic-pointer
npm install
```

Ensure dependencies are installed:

- Node.js ≥ 20
- Playwright stable
- ffmpeg ≥ 6.0

Optional:

- OBS with WebSocket plugin (advanced recording)

---

## Usage

### 1. Author a Journey

Create a `.cinematicpointer.json` file:

```json
{
  "meta": { "name": "Signup happy path", "viewport": { "w": 1440, "h": 900 } },
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
      "text": "demo+user@madfam.io",
      "mask": true
    },
    { "action": "press", "key": "Enter" },
    { "action": "waitFor", "locator": { "text": "Welcome" } },
    { "action": "cameraMark", "zoom": 1.3, "target": { "text": "Welcome" }, "durationMs": 900 }
  ],
  "output": { "preset": "trailer", "aspect": "16:9", "music": "uplift_a", "captions": true }
}
```

### 2. Run the Journey

```bash
cinematic-pointer run journeys/signup.json \
  --browser=chromium --recorder=playwright --out=artifacts
```

### 3. Cut & Edit Automatically

```bash
cinematic-pointer cut artifacts/raw/video.webm artifacts/events.ndjson \
  --template=trailer --music=assets/uplift_a.mp3 --captions=auto \
  --out=exports/signup_trailer_1080p.mp4
```

### 4. Export Variants

```bash
cinematic-pointer reframe exports/signup_trailer_1080p.mp4 --aspect=9:16 --smart-crop
```

---

## CLI Flags

- `--headless` / `--headed` — run in background or visible browser.
- `--timeout` — step timeout.
- `--retries` — retry failed steps.
- `--network-idle` — wait for network idle before continuing.
- `--speed` — slow down or speed up execution.

---

## Roadmap

- **Phase 1 (MVP):** Web automation, Playwright runner, ffmpeg auto-edit, branded exports.
- **Phase 2:** Desktop record-only mode (whole OS capture with overlays).
- **Phase 3:** Desktop automation drivers (macOS/Windows/Linux).
- **Phase 4:** Visual recorder to capture human walkthroughs into journeys.

---

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss your idea.

---

## License

Proprietary © 2025 Innovaciones MADFAM S.A.S. de C.V. All rights reserved.

---

## Credits

Created by **Aldo Ruiz Luna** and the MADFAM team as part of our mission to make digital journeys cinematic, repeatable, and scalable.
