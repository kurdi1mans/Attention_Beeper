# Attention Beeper — Front-End Requirements

## Overview
Attention Beeper is a browser-based React application with no backend. It plays a beep sound at user-configured intervals to help the user maintain focus. It must work correctly on both desktop and mobile browsers.

---

## Technology Stack

- **Framework**: React 18 (functional components and hooks only, no class components)
- **Build tool**: Vite 5 with `@vitejs/plugin-react`
- **Language**: JSX (no TypeScript)
- **Audio**: Web Audio API only — all sounds are synthesized programmatically at runtime, no audio files
- **No backend** — fully static, client-side only
- **`vite.config.js`** must set `base: '/Attention_Beeper/'` for GitHub Pages deployment

### Dependencies (`package.json`)
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.1"
  }
}
```

Scripts: `dev` → `vite`, `build` → `vite build`, `preview` → `vite preview`.

---

## File Structure

```
index.html
vite.config.js
package.json
src/
  main.jsx       — React root, mounts <App /> in StrictMode
  index.css      — global/body styles
  App.jsx        — main component (all UI and logic)
  App.css        — component-scoped styles
  sounds.js      — SOUNDS array + playSound() using Web Audio API
```

---

## Default State

| Setting        | Default value     |
|----------------|-------------------|
| Interval value | `60`              |
| Interval unit  | `seconds`         |
| Mode           | `random`          |
| Selected sound | `digital` (first in list) |

---

## Functional Requirements

### 1. Beep Interval Configuration
- A number input for the interval value (min: 1). Defaults to `60`.
- A unit selector dropdown: **Seconds** or **Minutes**. Defaults to `seconds`.
- Both inputs are **disabled while the session is running**.

### 2. Interval Mode
Two modes selectable via styled radio cards (hidden `<input type="radio">` with a styled `<label>`):

- **Fixed**: beep plays exactly at the end of each interval.
- **Random**: beep plays at a random moment within each interval window.

Below the mode cards, display a dynamic hint line:
- Fixed: `Beeps exactly every {value} {unit}`
- Random: `Beeps at a random moment within each {value}-{minute|second} window`

Mode selection is **disabled while running**.

#### Random mode scheduling detail
In random mode, when the loop starts, it picks a random delay `d = max(1000ms, random() * intervalMs)` within the window, waits `d`, fires the beep, then waits out the remainder `(intervalMs - d)` before starting the next window (where a new random delay is pre-picked for the next cycle). This ensures each beep falls inside its own window boundary while the next delay is pre-selected.

### 3. Sound Selection
A dropdown of 15 built-in sounds. The dropdown is **not** disabled while running (sound can be changed mid-session).

| ID          | Label          |
|-------------|----------------|
| `digital`   | Digital Beep   |
| `ping`      | Ping           |
| `pluck`     | Pluck          |
| `ding`      | Ding           |
| `danger`    | Danger Warning |
| `chime`     | Soft Chime     |
| `bell`      | Bell           |
| `alert`     | Alert Tone     |
| `drop`      | Drop           |
| `bubble`    | Bubble Pop     |
| `woodblock` | Wood Block     |
| `chord`     | Soft Chord     |
| `blip`      | Blip           |
| `whoosh`    | Whoosh         |
| `click`     | Click          |

### 4. Audio Preview
A **Test** button next to the sound dropdown plays the selected sound immediately. It is always enabled.

### 5. Playback Controls
- **Start** button: begins the session. Converts interval+unit to milliseconds, increments a `runIdRef` to uniquely identify the loop, sets `isRunning = true`, and starts an async loop.
- **Stop** button: increments `runIdRef` (which invalidates the running loop), sets `isRunning = false`.
- Only one button is visible at a time (Start when stopped, Stop when running).
- On component unmount, the loop is invalidated by incrementing `runIdRef`.

#### Timing implementation
All delays inside the loop use a `sleep` helper — **not** direct `setTimeout` callbacks:
```js
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
```
The loop is an `async` function that `await sleep(ms)` for each delay. After each `await`, the loop checks `runIdRef.current === id` before proceeding, so a Stop (or unmount) that happened during the sleep is detected immediately when the sleep resolves.

### 6. Countdown Timer
While running, display a countdown below the Stop button showing time until the next beep:

- Label: `NEXT BEEP IN` (small uppercase)
- Value: `M:SS` format (e.g. `1:05`, `0:30`) — large bold display
- Updated every 250 ms via `setInterval`
- Shows `—` if the next beep time is not yet set
- Disappears when stopped

### 7. Status Badge
Always visible below the controls. Shows either:
- **Stopped**: red/pink badge with a static dot
- **Running**: green badge with a pulsing animated dot

---

## Audio Synthesis (Web Audio API)

A single `AudioContext` is lazily created and reused (resumed if suspended for mobile compatibility). All sounds are synthesized via oscillators and/or noise buffers.

| Sound ID    | Synthesis description |
|-------------|----------------------|
| `digital`   | Square wave, 440 Hz, 0.15s sharp on/off |
| `ping`      | Triangle wave, 1400 Hz, exponential decay over 0.4s |
| `pluck`     | Triangle wave, 493 Hz, exponential decay over 0.6s |
| `ding`      | Sine wave, 1047 Hz, fast attack, exponential decay over 1.6s |
| `danger`    | 6-cycle alternating square wave alarm: 800 Hz and 1200 Hz, 0.25s each, 3s total |
| `chime`     | Sine wave, 880→660 Hz frequency glide, exponential decay over 1.4s |
| `bell`      | 3 sine partials at 523, 1046, 1568 Hz with decaying amplitudes over 2.0s |
| `alert`     | Two-burst sine: 880 Hz then 1100 Hz, 0.22s apart, each 0.18s |
| `drop`      | Sine wave, 600→150 Hz pitch drop, exponential decay over 0.4s |
| `bubble`    | Sine wave, 300→1200 Hz rising, exponential decay over 0.12s |
| `woodblock` | Sine wave, 800→400 Hz, fast exponential decay over 0.08s |
| `chord`     | 3 sine oscillators at 261, 329, 392 Hz, staggered 0.06s apart, decay over 1.2s each |
| `blip`      | Square wave, 1800 Hz, 0.06s linear fade-out |
| `whoosh`    | White noise buffer (0.35s) through bandpass filter sweeping 400→3000 Hz, 0.35s |
| `click`     | Short white noise buffer (0.02s) with cubic amplitude envelope |

---

## Non-Functional Requirements

### Platform Compatibility
- Works in modern desktop browsers (Chrome, Firefox, Safari, Edge).
- Works in mobile browsers (iOS Safari, Android Chrome).
- Audio must be triggered by a user gesture to satisfy mobile browser autoplay policy. The `AudioContext` is resumed on each `playSound()` call.

### No Persistence
Settings are not saved between sessions. All state is in-memory.

### Responsive Design
- Max width: 460px, centered horizontally.
- Body uses `min-height: 100dvh` with flexbox centering (vertical centering only on screens taller than 700px to avoid clipping on short mobile screens).
- Mobile breakpoints at 480px and 360px reducing padding, font sizes, and minimum widths.
- No horizontal scrolling at any viewport width.

---

## UI Elements Summary

| Element            | Type              | Disabled while running? |
|--------------------|-------------------|------------------------|
| Sound dropdown     | `<select>`        | No                     |
| Test Sound button  | `<button>`        | No                     |
| Interval input     | `<input number>`  | Yes                    |
| Unit dropdown      | `<select>`        | Yes                    |
| Mode radio cards   | styled `<label>`  | Yes                    |
| Mode hint text     | `<p>`             | —                      |
| Start button       | `<button>`        | — (hidden when running)|
| Stop button        | `<button>`        | — (hidden when stopped)|
| Countdown display  | text              | — (shown only running) |
| Status badge       | styled `<span>`   | —                      |

---

## Visual Design

- Background: `#eef2f7` (light grey-blue)
- Card: white, `border-radius: 20px`, subtle shadow
- Primary color (buttons, focused inputs, selected mode, countdown): `#667eea` (indigo)
- Danger/stop color: `#f56565` (red)
- Font: system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
- Number input spinners hidden
- Custom dropdown chevron via inline SVG background image
