# Attention Beeper — Requirements

## Overview
Attention Beeper is a React application that plays a synthesized beep sound at user-configured intervals to help the user maintain focus. It targets two platforms:

1. **Web** — deployed as a static site to GitHub Pages.
2. **Android** — wrapped with Capacitor and built as a native APK, with a foreground service that keeps the session alive when the app is in the background.

There is no backend. All logic is client-side.

---

## Technology Stack

| Concern | Choice |
|---|---|
| UI framework | React 18 (functional components and hooks only, no class components) |
| Build tool | Vite 5 with `@vitejs/plugin-react` |
| Language | JSX (no TypeScript) |
| Audio | Web Audio API only — all sounds are synthesized at runtime, no audio files |
| Android wrapper | Capacitor 8 (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`) |
| Android background execution | Custom Capacitor plugin (`BackgroundMode`) backed by a native Android foreground service |

### `package.json` dependencies

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

### `vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Attention_Beeper/',
})
```

`base` is set to `/Attention_Beeper/` for GitHub Pages deployment. Capacitor's build step (`npx cap sync android`) copies the `dist/` output into the Android project automatically.

### `capacitor.config.json`

```json
{
  "appId": "com.attentionbeeper.app",
  "appName": "Attention Beeper",
  "webDir": "dist"
}
```

---

## File Structure

```
index.html                         — HTML entry point
vite.config.js                     — Vite config (sets base path)
capacitor.config.json              — Capacitor config
package.json
src/
  main.jsx                         — React root, mounts <App /> in StrictMode
  index.css                        — Global/body styles
  App.jsx                          — All UI and scheduling logic
  App.css                          — Component-scoped styles
  sounds.js                        — SOUNDS array + playSound() via Web Audio API
android/
  app/src/main/
    AndroidManifest.xml            — Permissions + service + activity declarations
    java/com/attentionbeeper/app/
      MainActivity.java            — Registers BackgroundModePlugin; extends BridgeActivity
      BackgroundModePlugin.java    — Capacitor plugin: enable() / disable() methods
      BackgroundService.java       — Android foreground service (sticky notification)
```

---

## Default State

| Setting | Default value |
|---|---|
| Interval value | `60` |
| Interval unit | `seconds` |
| Mode | `random` |
| Selected sound | `digital` (first entry in SOUNDS array) |

---

## Functional Requirements

### 1. Beep Interval Configuration

- A number input for the interval value (`min="1"`). Defaults to `60`.
- A unit selector dropdown: **Seconds** or **Minutes**. Defaults to `seconds`.
- Both are **disabled while the session is running**.

### 2. Interval Mode

Two modes rendered as styled radio cards (hidden `<input type="radio">` with a visible styled `<label>`):

- **Fixed** (`value="fixed"`) — beep plays exactly at the end of each interval.
- **Random** (`value="random"`) — beep plays at a random moment within each interval window.

The label for the selected card gets class `selected`; when running it also gets class `disabled` (cursor: not-allowed, opacity 0.55). The hidden `<input>` has `disabled={isRunning}`.

Below the cards, render a dynamic hint line:
- Fixed: `Beeps exactly every {value} {unit}`
- Random: `Beeps at a random moment within each {value}-{minute|second} window`

Mode selection is disabled while running.

#### Random mode scheduling

When a loop iteration starts in random mode:
1. Pick `delay = max(1000ms, random() * intervalMs)` — either pre-picked from the previous iteration or freshly computed.
2. Set `nextBeepAtRef.current = Date.now() + delay`.
3. `await sleep(delay)`.
4. Check `runIdRef.current === id`; break if not.
5. Play beep.
6. Compute `remainder = intervalMs - delay`.
7. Pre-pick `nextDelay = max(1000ms, random() * intervalMs)` for the next window.
8. Set `nextBeepAtRef.current = Date.now() + remainder + nextDelay` (so the countdown reflects the entire remaining wait until the next beep).
9. `await sleep(remainder)`.
10. Loop back; use the pre-picked `nextDelay` as the delay for the next iteration.

This guarantees each beep falls within its window boundary while the countdown remains meaningful across the full window.

### 3. Sound Selection

A `<select>` dropdown of 15 built-in sounds. The dropdown is **disabled while running**.

| ID | Label |
|---|---|
| `digital` | Digital Beep |
| `ping` | Ping |
| `pluck` | Pluck |
| `ding` | Ding |
| `danger` | Danger Warning |
| `chime` | Soft Chime |
| `bell` | Bell |
| `alert` | Alert Tone |
| `drop` | Drop |
| `bubble` | Bubble Pop |
| `woodblock` | Wood Block |
| `chord` | Soft Chord |
| `blip` | Blip |
| `whoosh` | Whoosh |
| `click` | Click |

### 4. Audio Preview

A **Test** button next to the sound dropdown calls `playSound(selectedSound)` immediately. Always enabled (never disabled).

### 5. Playback Controls

- **Start** button: visible only when stopped.
  1. Clamps `intervalValue` to `max(1, Number(intervalValue) || 1)`.
  2. Computes `intervalMsRef.current` from the clamped value and unit.
  3. Sets `isRunning = true`.
  4. Calls `BackgroundMode.enable().catch(() => {})`.
  5. Increments `runIdRef` to get a unique `id` for this run.
  6. Launches the async loop (non-blocking — no `await` before the call).

- **Stop** button: visible only when running.
  1. Increments `runIdRef` (invalidates the loop).
  2. Sets `isRunning = false`.
  3. Calls `BackgroundMode.disable().catch(() => {})`.

- On component unmount, the cleanup function increments `runIdRef` and calls `BackgroundMode.disable().catch(() => {})`.

#### `sleep` helper

```js
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
```

The loop `await`s each sleep. After every `await`, it checks `runIdRef.current === id` before proceeding. This makes Stop (or unmount) take effect as soon as the current sleep resolves.

### 6. Countdown Timer

Shown only while running, below the Stop button.

- Label: `Next beep in` (rendered as `.countdown-label`, styled uppercase).
- Value: rendered as `.countdown-time`, formatted `M:SS` (e.g. `1:05`, `0:30`) — large bold indigo text.
- A `setInterval` ticking every 250 ms reads `nextBeepAtRef.current` and updates `timeLeft` state:
  ```js
  setTimeLeft(Math.max(0, Math.ceil((nextBeepAtRef.current - Date.now()) / 1000)))
  ```
- Displays `—` if `timeLeft` is `null` (i.e. `nextBeepAtRef.current` not yet set).
- The interval is started in a `useEffect` dependent on `isRunning` and cleared on cleanup.

### 7. Status Badge

Always visible. A styled `<span className="status-badge">` containing a `<span className="status-dot">`.

- **Stopped**: class `status-badge` only — red/pink pill, static dot.
- **Running**: class `status-badge running` — green pill, pulsing animated dot (`@keyframes pulse`).

### 8. Background Execution (Android only)

`BackgroundMode` is a custom Capacitor plugin with two methods — `enable()` and `disable()` — called from `App.jsx` via:
```js
const BackgroundMode = registerPlugin('BackgroundMode')
```

Both calls are fire-and-forget (`.catch(() => {})`), so they do not throw on web where the native implementation is absent.

The native side starts/stops a foreground `Service` (`BackgroundService`) that displays a sticky "Beeping session is running" notification. This prevents Android from killing the WebView process mid-session.

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

## `src/index.css` (global styles)

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  overflow-x: hidden;
}

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

/* Only vertically center on screens tall enough to avoid clipping */
@media (min-height: 700px) {
  body {
    justify-content: center;
  }
}
```

---

## Audio Synthesis (`src/sounds.js`)

Export a single `AudioContext` that is lazily created and reused:

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

`playSound(soundId)` calls `resumeCtx()` then dispatches to the matching synthesis function. Errors are caught and logged via `console.warn`.

### Sound synthesis details

| Sound ID | Function | Synthesis |
|---|---|---|
| `digital` | `digitalBeep` | Square wave, 440 Hz; gain 0.18 flat for 0.12s then linear ramp to 0 at 0.15s |
| `ping` | `ping` | Triangle wave, 1400 Hz; gain 0.5, exponential decay to 0.001 at 0.4s |
| `pluck` | `pluck` | Triangle wave, 493 Hz; gain 0.5, exponential decay to 0.001 at 0.6s |
| `ding` | `ding` | Sine wave, 1047 Hz; gain linear ramp 0→0.45 in 0.01s, exponential decay to 0.001 at 1.6s |
| `danger` | `danger` | 6 cycles × 2 bursts: square wave at 800 Hz then 1200 Hz, each 0.25s with 0.03s fade; total ~3s |
| `chime` | `softChime` | Sine wave, 880→660 Hz exponential glide over 0.8s; gain 0→0.4 in 0.05s, exponential decay to 0.001 at 1.4s |
| `bell` | `bell` | 3 sine oscillators at 523, 1046, 1568 Hz simultaneously; amplitudes 0.3, 0.15, 0.1; all decay to 0.001 at 2.0s |
| `alert` | `alertTone` | Two sine bursts: 880 Hz at t+0, 1100 Hz at t+0.22; each gain 0.35 flat for 0.14s then ramp to 0 at 0.18s |
| `drop` | `drop` | Sine wave, 600→150 Hz exponential pitch drop over 0.4s; gain 0.4, exponential decay to 0.001 at 0.4s |
| `bubble` | `bubble` | Sine wave, 300→1200 Hz exponential pitch rise over 0.08s; gain 0.35, exponential decay to 0.001 at 0.12s |
| `woodblock` | `woodblock` | Sine wave, 800→400 Hz exponential drop over 0.05s; gain 0.6, exponential decay to 0.001 at 0.08s |
| `chord` | `chord` | 3 sine oscillators at 261, 329, 392 Hz, staggered 0.06s apart; each ramps 0→0.2 in 0.04s, decays to 0.001 at 1.2s after its start |
| `blip` | `blip` | Square wave, 1800 Hz; gain 0.12 linear ramp to 0 at 0.06s |
| `whoosh` | `whoosh` | 0.35s white noise buffer through bandpass filter sweeping 400→3000 Hz (Q=2); gain 0.6, exponential decay to 0.001 at 0.35s |
| `click` | `click` | 0.02s white noise buffer with cubic amplitude envelope (`(1 - i/length)^3`); gain constant at 1.2 |

---

## Android Native Files

### `AndroidManifest.xml` (key entries)

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />

<service
    android:name=".BackgroundService"
    android:foregroundServiceType="mediaPlayback"
    android:exported="false" />
```

### `MainActivity.java`

Extends `BridgeActivity`. Registers `BackgroundModePlugin` before calling `super.onCreate()`:

```java
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackgroundModePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

### `BackgroundModePlugin.java`

Capacitor plugin named `"BackgroundMode"`. Exposes two plugin methods:

- `enable(call)` — starts `BackgroundService` via `startForegroundService`; resolves the call.
- `disable(call)` — stops `BackgroundService` via `stopService`; resolves the call.

### `BackgroundService.java`

Extends `Service`. On `onCreate`, creates a `NotificationChannel` with `IMPORTANCE_LOW` (id: `attention_beeper_channel`). On `onStartCommand`, builds a sticky foreground notification:

- Title: `"Attention Beeper"`
- Body: `"Beeping session is running"`
- Small icon: `android.R.drawable.ic_lock_idle_alarm`
- `setOngoing(true)` — not dismissible by the user
- Tapping the notification opens `MainActivity` with `FLAG_ACTIVITY_SINGLE_TOP`

Returns `START_STICKY`. `onBind` returns `null`.

---

## Non-Functional Requirements

### Platform Compatibility
- Modern desktop browsers (Chrome, Firefox, Safari, Edge).
- Mobile browsers (iOS Safari, Android Chrome).
- Android native APK via Capacitor 8 (minSdk 23+, targetSdk 35).
- Audio must be triggered by a user gesture — `AudioContext` is resumed (not re-created) on each `playSound()` call.

### No Persistence
Settings are not saved between sessions. All state is in-memory React state.

### Responsive Design
- Max width: 460px, centered horizontally.
- Body: `min-height: 100dvh`, flexbox; `justify-content: flex-start` with padding `2rem 1rem` by default; switches to `justify-content: center` on screens taller than 700px.
- No horizontal scrolling at any viewport width.

#### Breakpoints

| Max-width | Changes |
|---|---|
| 480px | Card padding 1.25rem, gap 1.1rem, border-radius 16px; h1 font-size 1.5rem; `.select-unit` min-width 90px |
| 360px | Card padding 1rem, gap 1rem; h1 font-size 1.3rem; icon font-size 2rem; inputs/buttons height 42px; `.select-unit` min-width 80px |

---

## UI Elements Summary

| Element | Type | Disabled while running? |
|---|---|---|
| Sound dropdown | `<select>` | **Yes** |
| Test Sound button | `<button>` | No |
| Interval input | `<input type="number">` | Yes |
| Unit dropdown | `<select>` | Yes |
| Mode radio cards | styled `<label>` | Yes (opacity 0.55, cursor: not-allowed) |
| Mode hint text | `<p className="hint">` | — |
| Start button | `<button>` | Hidden when running |
| Stop button | `<button>` | Hidden when stopped |
| Countdown display | `.countdown` div | Shown only when running |
| Status badge | `<span className="status-badge">` | — (always visible) |

---

## Visual Design

| Token | Value |
|---|---|
| Background | `#eef2f7` |
| Card background | `#fff`, `border-radius: 20px`, shadow `0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)` |
| Primary / focus / countdown | `#667eea` (indigo) |
| Stop / danger | `#f56565` (red) |
| Font | `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` |
| Number input spinners | Hidden via `-webkit-appearance: none` and `-moz-appearance: textfield` |
| Dropdown chevron | Inline SVG background image (filled `#718096` triangle) |
| Status badge — stopped | Background `#fff5f5`, color `#c53030` |
| Status badge — running | Background `#f0fff4`, color `#276749` |
| Status dot animation | `@keyframes pulse` — opacity+scale oscillation over 1.4s ease-in-out |

---

## Build & Deployment

### Web (GitHub Pages)
```sh
npm install
npm run build          # outputs to dist/
# push dist/ or configure GitHub Pages to deploy from dist/
```

### Android APK
```sh
npm run build                  # build the web assets
npx cap sync android           # copy dist/ into android/ and sync plugins
# open android/ in Android Studio → Build → Generate Signed APK
# or: npx cap open android
```

Prerequisites for Android build: Android Studio, JDK 17+, Android SDK with API 35.
