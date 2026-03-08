# Attention Beeper — Web App Technical Requirements

## Technology Stack

| Concern | Choice |
|---|---|
| UI framework | React 18 — functional components and hooks only, no class components |
| Language | JSX, no TypeScript |
| Build tool | Vite 5 with `@vitejs/plugin-react` |
| Audio | Web Audio API — all sounds synthesized at runtime via oscillators and noise buffers, no audio files |
| Deployment | GitHub Pages (static site) |

---

## Dependencies (`package.json`)

```json
{
  "name": "attention-beeper",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@capacitor/android": "^8.2.0",
    "@capacitor/cli": "^8.2.0",
    "@capacitor/core": "^8.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.1"
  }
}
```

---

## `vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
})
```

`base: './'` produces relative asset paths, which work correctly both on GitHub Pages (where the page is served from a subdirectory) and inside the Android APK (where Capacitor serves assets from `capacitor://localhost/`).

---

## File Structure

```
index.html
vite.config.js
capacitor.config.json
package.json
src/
  main.jsx       — React entry point, mounts <App /> in StrictMode
  index.css      — Global/body styles
  App.jsx        — All UI, session logic, and platform branching
  App.css        — Component-scoped styles
  sounds.js      — SOUNDS array and playSound() using Web Audio API
```

---

## `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Attention Beeper</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

## `src/main.jsx`

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

---

## `src/index.css`

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { overflow-x: hidden; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #eef2f7;
  color: #1a202c;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 2rem 1rem;
}

/* Vertically center only on screens tall enough to avoid clipping */
@media (min-height: 700px) {
  body { justify-content: center; }
}
```

---

## `src/App.jsx` — Architecture

`App.jsx` contains all UI and session logic. It detects the runtime platform at module load time:

```js
const isNative = Capacitor.isNativePlatform()
```

This flag determines whether the JS loop or the native event stream drives the countdown and sound on each platform.

### State and Refs

| Name | Type | Purpose |
|---|---|---|
| `intervalValue` | state | Numeric interval (user input) |
| `intervalUnit` | state | `'seconds'` or `'minutes'` |
| `mode` | state | `'fixed'` or `'random'` |
| `selectedSound` | state | ID of chosen sound |
| `isRunning` | state | Whether a session is active |
| `timeLeft` | state | Seconds until next beep (drives countdown display) |
| `modeRef` | ref | Mirror of `mode` — readable by async loop without closure issues |
| `soundRef` | ref | Mirror of `selectedSound` — readable by event listeners |
| `intervalMsRef` | ref | Computed interval in ms — set on Start |
| `runIdRef` | ref | Monotonic counter; incrementing it invalidates the current JS loop |
| `nextBeepAtRef` | ref | `Date.now()` timestamp of the next beep; read by the countdown ticker |

### Session Start (`handleStart`)

1. Clamp `intervalValue` to `max(1, Number(intervalValue) || 1)`.
2. Compute `intervalMsRef.current` (value × 1 000 or × 60 000).
3. Set `isRunning = true`.
4. Call `BackgroundMode.schedule({ intervalMs, mode })` — no-op on web, starts the native scheduler on Android.
5. On **web** (`!isNative`): increment `runIdRef` and launch the JS loop.
6. On **Android** (`isNative`): return immediately — the native scheduler owns timing.

### Session Stop (`handleStop`)

1. Increment `runIdRef` (invalidates the web JS loop; harmless on Android).
2. Set `nextBeepAtRef.current = null` (clears the countdown immediately on Android).
3. Set `isRunning = false`.
4. Call `BackgroundMode.cancel()`.

### Web JS Loop

Runs only on web (`!isNative`). On each iteration:

**Fixed mode:**
1. Set `nextBeepAtRef.current = Date.now() + intervalMs`.
2. `await sleep(intervalMs)`.
3. Check `runIdRef.current === id`; break if not.
4. Call `playSound(soundRef.current)`.

**Random mode:**
1. Pick `delay = max(1000, random() * intervalMs)` (reuse pre-picked value from previous iteration if available).
2. Set `nextBeepAtRef.current = Date.now() + delay`.
3. `await sleep(delay)`.
4. Check `runIdRef.current === id`; break if not.
5. Call `playSound(soundRef.current)`.
6. Compute `remainder = intervalMs - delay`.
7. Pre-pick `nextDelay = max(1000, random() * intervalMs)`.
8. Set `nextBeepAtRef.current = Date.now() + remainder + nextDelay`.
9. `await sleep(remainder)`.

At the end of the loop, set `nextBeepAtRef.current = null`.

`sleep` helper:
```js
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
```

### Native Event Listeners

Registered unconditionally at mount; events only arrive on Android (no-op on web):

```js
// 'scheduled' fires once at session start — sets initial countdown
BackgroundMode.addListener('scheduled', ({ nextDelayMs }) => {
  nextBeepAtRef.current = Date.now() + nextDelayMs
})

// 'beep' fires on every beep — plays sound and resets countdown
BackgroundMode.addListener('beep', ({ nextDelayMs }) => {
  playSound(soundRef.current)
  nextBeepAtRef.current = Date.now() + nextDelayMs
})
```

### Countdown Ticker

Runs every 250 ms while `isRunning`. Reads `nextBeepAtRef.current` and updates `timeLeft`:
```js
setTimeLeft(Math.max(0, Math.ceil((nextBeepAtRef.current - Date.now()) / 1000)))
```
Sets `timeLeft = null` if `nextBeepAtRef.current` is null (shows `—`).

---

## Audio Synthesis (`src/sounds.js`)

A single `AudioContext` is lazily created and reused. Before each sound, it is resumed if suspended (required by mobile browser autoplay policy):

```js
let audioCtx = null

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

async function resumeCtx() {
  const ctx = getCtx()
  if (ctx.state === 'suspended') await ctx.resume()
  return ctx
}
```

`playSound(soundId)` calls `resumeCtx()` then dispatches to the matching synthesis function. Errors are swallowed via `console.warn`.

### Sound Synthesis Table

| ID | Synthesis |
|---|---|
| `digital` | Square wave, 440 Hz; gain 0.18 flat for 0.12s then linear ramp to 0 at 0.15s |
| `ping` | Triangle wave, 1400 Hz; gain 0.5, exponential decay to 0.001 at 0.4s |
| `pluck` | Triangle wave, 493 Hz; gain 0.5, exponential decay to 0.001 at 0.6s |
| `ding` | Sine wave, 1047 Hz; gain ramp 0→0.45 in 0.01s, exponential decay to 0.001 at 1.6s |
| `danger` | 6 cycles × 2 bursts: square wave at 800 Hz then 1200 Hz, 0.25s each with 0.03s fade; ~3s total |
| `chime` | Sine wave, 880→660 Hz exponential glide over 0.8s; gain 0→0.4 in 0.05s, decay to 0.001 at 1.4s |
| `bell` | 3 sine oscillators at 523, 1046, 1568 Hz; amplitudes 0.3, 0.15, 0.1; all decay to 0.001 at 2.0s |
| `alert` | Two sine bursts: 880 Hz at t+0 and 1100 Hz at t+0.22; each 0.35 gain flat for 0.14s then ramp to 0 at 0.18s |
| `drop` | Sine wave, 600→150 Hz exponential pitch drop over 0.4s; gain 0.4, decay to 0.001 at 0.4s |
| `bubble` | Sine wave, 300→1200 Hz exponential rise over 0.08s; gain 0.35, decay to 0.001 at 0.12s |
| `woodblock` | Sine wave, 800→400 Hz exponential drop over 0.05s; gain 0.6, decay to 0.001 at 0.08s |
| `chord` | 3 sine oscillators at 261, 329, 392 Hz, staggered 0.06s apart; each ramps 0→0.2 in 0.04s, decays to 0.001 at 1.2s |
| `blip` | Square wave, 1800 Hz; gain 0.12 linear ramp to 0 at 0.06s |
| `whoosh` | 0.35s white noise buffer through bandpass filter sweeping 400→3000 Hz (Q=2); gain 0.6, decay to 0.001 at 0.35s |
| `click` | 0.02s white noise buffer with cubic amplitude envelope `(1 - i/length)³`; gain constant at 1.2 |

---

## UI Elements

| Element | Disabled while running? |
|---|---|
| Sound dropdown | Yes |
| Test Sound button | No |
| Interval value input | Yes |
| Interval unit dropdown | Yes |
| Mode radio cards | Yes (opacity 0.55, cursor: not-allowed) |
| Mode hint text | — |
| Start button | Hidden when running |
| Stop button | Hidden when stopped |
| Countdown display | Shown only when running |
| Status badge | Always visible |

---

## Visual Design

| Token | Value |
|---|---|
| Page background | `#eef2f7` |
| Card | White, `border-radius: 20px`, shadow `0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)` |
| Primary color (buttons, focus, countdown) | `#667eea` |
| Danger/stop color | `#f56565` |
| Font | `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` |
| Number input spinners | Hidden |
| Dropdown chevron | Inline SVG (`#718096` filled triangle) |
| Status badge — stopped | Background `#fff5f5`, color `#c53030` |
| Status badge — running | Background `#f0fff4`, color `#276749` |
| Running dot animation | `@keyframes pulse` — opacity+scale oscillation, 1.4s ease-in-out |
| Max content width | 460px, centered |

### Responsive Breakpoints

| Max-width | Changes |
|---|---|
| 480px | Card padding 1.25rem, gap 1.1rem, border-radius 16px; h1 1.5rem; unit dropdown min-width 90px |
| 360px | Card padding 1rem; h1 1.3rem; icon 2rem; inputs/buttons height 42px; unit dropdown min-width 80px |

---

## Platform Compatibility

- Chrome, Firefox, Safari, Edge (desktop and mobile).
- iOS Safari, Android Chrome.
- Audio must be triggered by a user gesture. `AudioContext` is resumed on each `playSound()` call rather than recreated.

---

## Build & Deployment

```sh
npm install
npm run build    # outputs to dist/
# deploy dist/ to GitHub Pages
```
