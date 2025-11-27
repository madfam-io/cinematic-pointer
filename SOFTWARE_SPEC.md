# SOFTWARE_SPEC.md — MADFAM “Cinematic Pointer” Generator

> **Codename:** `Cinematic Pointer`
> **Owner:** Innovaciones MADFAM S.A.S. de C.V. — Aldo Ruiz Luna (CEO)
> **Status:** Draft v0.1
> **Purpose:** Specify an automated system that replays preplanned journeys (initially on the web) and produces polished, “cinematic” videos where the cursor is the protagonist. Future-proof for desktop OS support.

---

## 0) Executive Summary

**Goal:** Reduce demo/tutorial production time from 30–90 minutes per take to 2–5 minutes per render by scripting journeys, auto-recording, and auto-editing into on-brand videos (16:9, 1:1, 9:16).
**Phase 1 Scope:** Web only (Playwright). OS support (macOS/Windows/Linux) comes later via adapters; architecture is prepared from day one.

**Key Outcomes**

- Deterministic replays with resilient selectors and assertions.
- Cursor-centric visuals (trails, ripples, focus ring) and camera beats (zoom/pan, speed ramps).
- Auto-edited exports with captions, music, and aspect variants.

---

## 1) Objectives & Success Criteria

**Objectives**

1. Author journeys in a declarative, human-readable format.
2. Execute journeys reliably across sites using robust locators.
3. Capture output and compose a cinematic trailer automatically.
4. Support enterprise-friendly privacy & repeatability.

**Success Criteria (MVP)**

- ✅ 95%+ pass rate on 10 defined MADFAM flows without manual retries.
- ✅ Export MP4/WebM at 1080p with cursor effects, captions, and music.
- ✅ Reframe to 9:16 and 1:1 automatically with smart crop.
- ✅ End-to-end runtime < 5 minutes for a 60–90s trailer on a standard laptop.

**Non-Goals (MVP)**

- No full desktop automation; no multi-monitor orchestration; no live VO recording.

---

## 2) Scope

**In-Scope (Phase 1 — Web MVP)**

- Journey DSL (JSON) with selectors, assertions, and camera marks.
- Playwright-based runner with event logging.
- Injected overlay for cursor/callouts.
- Recording via Playwright video or FFmpeg desktop capture.
- Post-processing with ffmpeg (zoom, pans, speed ramps, LUT, captions).
- CLI with presets (Trailer/How-to/Teaser) and brand theme (colors, logo bug, font).

**Out-of-Scope (Phase 1)**

- Desktop OS automation; multi-window app switching; human-in-the-loop timeline editor.

**Future Scope (Phase 2+)**

- Desktop automation drivers (macOS/Windows/Linux).
- Visual recorder (Chrome extension + desktop overlay) to record a human walkthrough and emit the DSL/UES.

---

## 3) Architecture Overview

**Layers**

1. **Authoring:** Journey DSL → Universal Event Schema (UES) at runtime.
2. **Execution Drivers:** `WebDriver` (Playwright) now; Desktop drivers later.
3. **Recording:** `Recorder` (PlaywrightVideo | FFmpegScreen | OBSRemote).
4. **Overlay:** Cursor/callouts rendered live (web injection) or in post from events.
5. **Post Production:** Timeline builder + ffmpeg filter graph → exports.

**Data Flow**
DSL → Runner parses → Driver executes → Event Log (NDJSON) + Raw Video → Post pipeline → Final renders + artifacts (SRT, JSON, thumbnails).

---

## 4) Universal Event Schema (UES)

**Purpose:** OS-agnostic event log used for overlays, camera moves, captions, and diagnostics.

```jsonc
{
  "meta": {
    "canvas": "web|desktop",
    "viewport": { "w": 1440, "h": 900, "deviceScaleFactor": 2 },
    "dpi": 2.0,
    "screens": 1,
    "journeyId": "string",
    "runId": "uuid",
    "brandTheme": "trailer|howto|teaser",
  },
  "events": [
    { "ts": 0, "t": "run.start", "data": {} },
    { "ts": 120, "t": "cursor.move", "to": [640, 480], "ease": "inOutCubic" },
    {
      "ts": 480,
      "t": "cursor.click",
      "button": "left",
      "target": { "selector": { "by": "role", "value": "button", "name": "Get Started" } },
    },
    { "ts": 820, "t": "key.press", "key": "Enter" },
    { "ts": 1500, "t": "assert.ok", "desc": "Welcome visible" },
    { "ts": 1600, "t": "camera.mark", "zoom": 1.25, "focus": { "region": [500, 200, 380, 120] } },
    { "ts": 1650, "t": "caption.set", "text": "Create your account" },
    { "ts": 3000, "t": "run.end", "data": { "durationMs": 3000 } },
  ],
}
```

**Notes**

- `ts` is milliseconds from `run.start`.
- Targets are semantic; coordinates are derived per driver.
- UES is the single source of truth for post-production.

---

## 5) Journey DSL (Authoring Spec)

**File:** `.cinematicpointer.json`

```jsonc
{
  "meta": { "name": "Signup happy path", "viewport": { "w": 1440, "h": 900 } },
  "start": { "url": "https://example.com" },
  "steps": [
    { "comment": "Hero scroll", "action": "scroll", "to": "center", "durationMs": 1200 },
    {
      "action": "hover",
      "locator": { "role": "button", "name": "Get Started" },
      "cursor": { "trail": true },
    },
    {
      "action": "click",
      "locator": { "role": "button", "name": "Get Started" },
      "cinema": { "beat": "impact", "ripple": true },
    },
    {
      "action": "fill",
      "locator": { "placeholder": "Email" },
      "text": "demo+user@madfam.io",
      "mask": true,
    },
    {
      "action": "fill",
      "locator": { "placeholder": "Password" },
      "text": "correct-horse-battery-staple",
      "mask": true,
    },
    { "action": "press", "key": "Enter" },
    { "action": "waitFor", "locator": { "text": "Welcome" }, "timeoutMs": 8000 },
    { "action": "cameraMark", "zoom": 1.3, "target": { "text": "Welcome" }, "durationMs": 900 },
    { "action": "pause", "ms": 600 },
  ],
  "output": { "preset": "trailer", "aspect": "16:9", "music": "uplift_a", "captions": true },
}
```

**Locator Strategy (priority order)**

1. Accessibility: role/name, label/placeholder, text.
2. Test IDs: `data-testid`.
3. CSS/XPath fallback.

**Assertions**

- `waitForVisible`, `waitForNavigation`, `expectText`, `expectUrl`.

---

## 6) Drivers & Recorders (Interfaces)

**TypeScript Interfaces**

```ts
// Driver abstraction
export interface Driver {
  init(meta: Meta): Promise<void>;
  goto(url: string): Promise<void>;
  resolveTarget(sel: Selector): Promise<Point | Region>;
  hover(sel: Selector): Promise<void>;
  click(sel: Selector, button?: 'left' | 'right' | 'middle'): Promise<void>;
  fill(sel: Selector, text: string, mask?: boolean): Promise<void>;
  press(key: string): Promise<void>;
  scroll(
    to: 'top' | 'bottom' | 'center' | { x: number; y: number },
    durationMs?: number,
  ): Promise<void>;
  waitFor(cond: Condition, timeoutMs?: number): Promise<void>;
  teardown(): Promise<void>;
}

export interface Recorder {
  start(meta: Meta): Promise<void>;
  mark(event: UesEvent): void; // pass-through for overlay sync
  stop(): Promise<RecordingArtifacts>; // returns raw video path(s)
}
```

**WebDriver (Playwright) — MVP**

- Uses `getByRole`, `getByLabel`, `getByPlaceholder`, `getByTestId`, `locator`.
- Emits UES events for every user action and significant DOM state.

**Recorder Implementations**

- `PlaywrightVideo`: per-context WebM; sized to 1920×1080.
- `FFmpegScreen`: desktop capture via OS tools (for future desktop framing tests).
- `OBSRemote`: optional for stream-quality capture.

---

## 7) Cursor & Overlay (Cinematic Layer)

**Web Overlay** (injected JS/CSS)

- Custom cursor with easing/inertia; trailing ghosts; click ripples; focus ring.
- Beat markers (`cursor:beat`, `camera:mark`) dispatched for post sync.
- Redaction: blur overlays for sensitive selectors.

**Desktop Overlay (Phase 2)**

- Always-on-top transparent window (Electron/Rust) rendering the same effects using UES timestamps.

**Customization**

- Theme tokens: primary color, accent color, ripple size, font stack, logo bug.

---

## 8) Recording & Post-Production

**Inputs**: Raw video + UES log + brand theme + captions (derived from step comments).

**ffmpeg Filter Graph (high level)**

- Zoom/pan near `camera.mark` (Ken Burns via `zoompan`).
- Speed ramps through idle/waits.
- Subtle motion blur (`tblend`) on fast cursor moves.
- Burn-in captions (optional) + output SRT.
- Audio bed + ducking on caption/VO stingers.

**Outputs**

- `exports/<journey>_1080p.mp4` (H.264)
- `exports/<journey>_web.webm`
- `exports/<journey>_vertical_9x16.mp4`
- `exports/<journey>.srt` + poster thumbnail.

---

## 9) CLI Spec

```bash
cinematic-pointer run journeys/signup.json \
  --browser=chromium --recorder=playwright --out=artifacts \
  --brand=madfam_trailer

cinematic-pointer cut artifacts/raw/video.webm artifacts/events.ndjson \
  --template=trailer --music=assets/uplift_a.mp3 --captions=auto \
  --out=exports/signup_trailer_1080p.mp4

cinematic-pointer reframe exports/signup_trailer_1080p.mp4 --aspect=9:16 --smart-crop
```

**Flags**

- `--headless/--headed` (for visual debug), `--timeout`, `--retries`, `--network-idle`, `--speed` (time dilation).

---

## 10) Security, Privacy, Compliance

- Secrets via environment (never stored); masked fields render bullets; logs redact values.
- Blur maps by selector; optional whole-region mosaic.
- Option to run against staging with synthetic data.
- Respect ToS/robots; require permission for third-party captures.

---

## 11) Non-Functional Requirements

- **Performance:** 60–90s trailer renders in < 5 min on MacBook Pro class hardware.
- **Reliability:** 95% pass rate across supported journeys; automatic retry of flaky steps.
- **Portability:** Node 20+, Playwright stable; ffmpeg ≥ 6.0.
- **Observability:** Structured logs (NDJSON); artifacts folder with screenshots on failure.

---

## 12) Testing Strategy

- Unit tests for DSL parsing and selector resolution.
- Integration tests for 3 anchor journeys.
- Golden-master visual tests on overlays (pixel diff with tolerance).
- Chaos tests: network throttle, delayed loads, dynamic content.

---

## 13) Telemetry & Analytics (Optional)

- Anonymous run stats: duration, retries, failure points, common selectors.
- Opt-in only; no PII; export to CSV/JSON.

---

## 14) Roadmap & Milestones

**M0 (Week 0–1):** Repo scaffold; DSL v0.1; WebDriver + Playwright video; basic overlay.
**M1 (Week 2):** Event log → ffmpeg auto-cut; captions; 16:9 export.
**M2 (Week 3):** Reframe to 9:16/1:1; brand theme; presets.
**M3 (Week 4–5):** Stability hardening; 10 MADFAM flows at 95% pass; docs.
**Phase 2:** Desktop record-only; overlay-on-top; OBS/FFmpeg.
**Phase 3:** Desktop automation (choose macOS or Windows first); visual recorder.

---

## 15) Risks & Mitigations

- **Selector flakiness:** Prefer accessibility locators; add assertions and retries; snapshot test IDs.
- **Timing variability:** Wait on conditions (visible, network idle) instead of sleeps; global time dilation.
- **Layout drift:** Focus on semantic selectors; camera marks target elements, not raw coords.
- **FFmpeg complexity:** Provide curated filter presets; golden samples.
- **Wayland input limits (future Linux):** Use AT-SPI + compositor-friendly patterns; allow manual assist mode.

---

## 16) Dependencies

- Node.js 20+, Playwright stable, ffmpeg ≥ 6.0.
- Fonts & music assets (licensed); brand theme tokens.
- Optional: OBS with WebSocket plugin.

---

## 17) Acceptance Criteria (Phase 1)

- CLI produces three exports (16:9, 1:1, 9:16) with synchronized captions and cursor effects from one run.
- At least 3 distinct MADFAM site journeys run green in CI nightly.
- Docs include authoring guide + troubleshooting.

---

## 18) Open Questions

1. Preferred first-party brand fonts/music? Licensing constraints?
2. Which MADFAM flows are the first 10 journeys?
3. Choose first desktop OS for Phase 2 (macOS vs Windows) based on demo environment.
4. Need TTS voice branding (es/en) now or later?

---

## 19) Appendix: Example Schema Fragments

**Selector**

```jsonc
{ "by": "role|label|placeholder|testid|css|xpath|text", "value": "string", "name": "optional" }
```

**Condition**

```jsonc
{
  "type": "visible|text|url|networkIdle",
  "selector": { "by": "role", "value": "button", "name": "Continue" },
  "text": "optional",
}
```

**Brand Theme**

```jsonc
{
  "name": "madfam_trailer",
  "primary": "#00E0A4",
  "accent": "#003434",
  "font": "Inter",
  "logo": "./assets/logo.svg",
}
```
