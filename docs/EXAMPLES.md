# Journey Examples

This document provides detailed examples of Cinematic Pointer journey configurations for different use cases and platforms.

## Table of Contents

- [Signup Flow Demo](#signup-flow-demo)
- [Product Tour](#product-tour)
- [Social Media Teaser (Vertical)](#social-media-teaser-vertical)
- [Instagram Feed (Square)](#instagram-feed-square)
- [Writing Custom Journeys](#writing-custom-journeys)

---

## Signup Flow Demo

**File:** `journeys/signup-flow.cinematicpointer.json`

A typical signup flow demonstration with form interactions and validation.

### Configuration

```json
{
  "meta": {
    "name": "Signup Flow Demo",
    "description": "Demonstrates a typical signup flow with form filling and validation",
    "viewport": { "w": 1440, "h": 900 }
  },
  "start": { "url": "https://example.com" },
  "output": {
    "preset": "trailer",
    "aspect": "16:9",
    "music": "uplift_a",
    "captions": true
  }
}
```

### Key Steps

| Step | Action       | Description                       |
| ---- | ------------ | --------------------------------- |
| 1    | `waitFor`    | Wait for page load (landing hero) |
| 2    | `cameraMark` | Zoom attention to heading (1.2x)  |
| 3    | `scroll`     | Smooth scroll to center content   |
| 4    | `hover`      | Highlight interactive element     |
| 5    | `click`      | Click with impact beat and ripple |
| 6    | `pause`      | Final reveal hold                 |

### Run Command

```bash
cinematic-pointer run journeys/signup-flow.cinematicpointer.json \
  --browser=chromium --recorder=playwright --out=artifacts
```

---

## Product Tour

**File:** `journeys/product-tour.cinematicpointer.json`

A guided tour showcasing key product features with instructional styling.

### Configuration

```json
{
  "meta": {
    "name": "Product Tour",
    "description": "A guided tour showcasing key product features",
    "viewport": { "w": 1920, "h": 1080 }
  },
  "start": { "url": "https://example.com" },
  "output": {
    "preset": "howto",
    "aspect": "16:9",
    "captions": true
  }
}
```

### Key Steps

| Step | Action       | Description                   |
| ---- | ------------ | ----------------------------- |
| 1    | `waitFor`    | Wait for welcome screen       |
| 2    | `cameraMark` | Wide establishing shot (1.0x) |
| 3    | `scroll`     | Navigate to top               |
| 4    | `cameraMark` | Zoom to navigation (1.3x)     |
| 5    | `hover`      | Highlight feature             |
| 6    | `click`      | Click with visual feedback    |
| 7    | `pause`      | Thank you hold                |

### Best Practices for How-To Videos

- Use `1920x1080` viewport for maximum clarity
- Keep zoom levels moderate (1.0-1.3x)
- Include descriptive comments for auto-captions
- Use `howto` preset for clearer, instructional style

---

## Social Media Teaser (Vertical)

**File:** `journeys/teaser-vertical.cinematicpointer.json`

Quick teaser optimized for TikTok and Instagram Reels with vertical (9:16) format.

### Configuration

```json
{
  "meta": {
    "name": "Social Media Teaser",
    "description": "Quick teaser optimized for TikTok/Reels (9:16)",
    "viewport": { "w": 1080, "h": 1920 }
  },
  "start": { "url": "https://example.com" },
  "output": {
    "preset": "teaser",
    "aspect": "9:16",
    "captions": true
  }
}
```

### Key Steps

| Step | Action       | Description                        |
| ---- | ------------ | ---------------------------------- |
| 1    | `waitFor`    | Quick hook (3s timeout)            |
| 2    | `cameraMark` | Aggressive zoom (1.4x) with impact |
| 3    | `hover`      | Fast highlight                     |
| 4    | `click`      | CTA with ripple effect             |
| 5    | `pause`      | Short end card (1s)                |

### Best Practices for Social Teasers

- Keep total duration under 15 seconds for best engagement
- Use aggressive zoom (1.3-1.5x) for drama
- Include `beat: "impact"` on key moments
- Use `teaser` preset for subtle, elegant styling
- Set shorter timeouts (3s) for faster pacing

---

## Instagram Feed (Square)

**File:** `journeys/instagram-square.cinematicpointer.json`

Square format demo optimized for Instagram feed posts.

### Configuration

```json
{
  "meta": {
    "name": "Instagram Feed Demo",
    "description": "Square format demo optimized for Instagram feed (1:1)",
    "viewport": { "w": 1080, "h": 1080 }
  },
  "start": { "url": "https://example.com" },
  "output": {
    "preset": "trailer",
    "aspect": "1:1",
    "captions": true
  }
}
```

### Key Steps

| Step | Action       | Description           |
| ---- | ------------ | --------------------- |
| 1    | `waitFor`    | Opening scene setup   |
| 2    | `cameraMark` | Moderate zoom (1.15x) |
| 3    | `scroll`     | Reveal animation      |
| 4    | `hover`      | Interactive highlight |
| 5    | `click`      | Action with ripple    |
| 6    | `pause`      | Closing shot          |

### Best Practices for Square Format

- Use `1080x1080` viewport for 1:1 aspect
- Keep important content centered
- Moderate zoom levels work better in square format
- Instagram feed max duration is 60 seconds

---

## Writing Custom Journeys

### Journey Structure

```json
{
  "meta": {
    "name": "Journey Name",
    "description": "Description for documentation",
    "viewport": { "w": 1440, "h": 900 }
  },
  "start": {
    "url": "https://your-site.com",
    "waitFor": { "text": "Page Loaded" }
  },
  "steps": [],
  "output": {
    "preset": "trailer|howto|teaser",
    "aspect": "16:9|1:1|9:16|4:3|21:9",
    "music": "uplift_a",
    "captions": true
  }
}
```

### Available Actions

#### Navigation & Waiting

```json
{ "action": "waitFor", "locator": { "text": "Welcome" }, "timeoutMs": 5000 }
{ "action": "pause", "durationMs": 2000 }
```

#### Interactions

```json
{ "action": "click", "locator": { "role": "button", "name": "Submit" } }
{ "action": "hover", "locator": { "text": "Menu Item" } }
{ "action": "fill", "locator": { "placeholder": "Email" }, "text": "user@example.com" }
{ "action": "press", "key": "Enter" }
{ "action": "scroll", "to": "center", "durationMs": 1000 }
```

#### Camera & Cinema

```json
{
  "action": "cameraMark",
  "target": { "text": "Focus Here" },
  "cinema": { "zoom": 1.3, "beat": "impact" },
  "durationMs": 1500
}
```

### Locator Strategies

Priority order for reliable element selection:

```json
// 1. Accessibility (most reliable)
{ "role": "button", "name": "Submit" }
{ "placeholder": "Email address" }
{ "label": "Username" }

// 2. Text content
{ "text": "Get Started" }

// 3. Test IDs
{ "by": "testid", "value": "login-button" }

// 4. CSS/XPath (fallback)
{ "by": "css", "value": ".hero-section button" }
{ "by": "xpath", "value": "//button[@type='submit']" }
```

### Cinema Effects

```json
{
  "cinema": {
    "beat": "intro|impact|transition|outro",
    "ripple": true,
    "zoom": 1.2
  }
}
```

| Beat Type    | Effect                       |
| ------------ | ---------------------------- |
| `intro`      | Gentle opening emphasis      |
| `impact`     | Strong click/action emphasis |
| `transition` | Smooth section change        |
| `outro`      | Closing emphasis             |

### Privacy & Masking

```json
{
  "action": "fill",
  "locator": { "placeholder": "Password" },
  "text": "secret123",
  "mask": true
}
```

### Viewport Guidelines

| Platform       | Viewport  | Aspect |
| -------------- | --------- | ------ |
| YouTube        | 1920x1080 | 16:9   |
| TikTok/Reels   | 1080x1920 | 9:16   |
| Instagram Feed | 1080x1080 | 1:1    |
| Twitter        | 1280x720  | 16:9   |
| LinkedIn       | 1920x1080 | 16:9   |

---

## Running Journeys

### Basic Execution

```bash
cinematic-pointer run journey.json --out=artifacts
```

### With Options

```bash
cinematic-pointer run journey.json \
  --browser=chromium \
  --recorder=playwright \
  --brand=madfam_trailer \
  --out=artifacts
```

### Post-Production

```bash
cinematic-pointer cut artifacts/raw/video.webm artifacts/events.ndjson \
  --template=trailer \
  --music=assets/uplift_a.mp3 \
  --captions=auto \
  --out=exports/final.mp4
```

### Multi-Format Export

```bash
# Reframe for vertical
cinematic-pointer reframe exports/final.mp4 --aspect=9:16 --smart-crop

# Batch all aspects
cinematic-pointer reframe exports/final.mp4 --batch --smart-crop
```

---

## Troubleshooting

### Common Issues

1. **Element not found**: Use more specific locators (accessibility > text > CSS)
2. **Timing issues**: Add `waitFor` steps before interactions
3. **Flaky clicks**: Increase timeouts, add hover before click
4. **Scroll not working**: Ensure page is loaded, use specific scroll targets

### Debug Mode

```bash
cinematic-pointer run journey.json --headed --no-recording
```

### Validate Journey

```bash
cinematic-pointer doctor --json
```
