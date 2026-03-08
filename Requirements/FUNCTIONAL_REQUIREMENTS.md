# Attention Beeper — Functional Requirements

## Overview

Attention Beeper plays a synthesized beep sound at user-configured intervals to help the user maintain focus. It is available as a browser-based web app and as an Android app. There is no backend; all logic runs on the client.

---

## 1. Default Values

| Setting | Default |
|---|---|
| Interval value | 60 |
| Interval unit | Seconds |
| Interval mode | Random |
| Beep sound | Digital Beep |

---

## 2. Beep Interval

The user configures how often the beep fires by setting two values:

- **Interval value** — a positive integer, minimum 1.
- **Interval unit** — either Seconds or Minutes.

Both are locked and cannot be changed while a session is running.

---

## 3. Interval Mode

Two modes are available:

- **Fixed** — the beep fires at exactly the end of every interval.
- **Random** — the beep fires at a random moment within each interval window. Each window has the same duration as the configured interval, and the beep falls somewhere inside it. No two windows overlap; the next window begins only after the current one ends.

A descriptive hint updates dynamically below the mode selector:
- Fixed: *Beeps exactly every {value} {unit}*
- Random: *Beeps at a random moment within each {value}-{second|minute} window*

The mode cannot be changed while a session is running.

---

## 4. Sound Selection

The user selects one of 15 built-in beep sounds from a list. All sounds are generated programmatically — no audio files are used. The selection cannot be changed while a session is running.

The available sounds are:

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

---

## 5. Sound Preview

A **Test** button plays the currently selected sound immediately. It is always available, including during a running session.

---

## 6. Session Controls

- **Start** — begins the session. Locks the interval, unit, mode, and sound selectors. Not visible while a session is running.
- **Stop** — ends the session immediately, even mid-interval. Not visible while the session is stopped.

Only one of these is visible at any time.

---

## 7. Countdown Timer

While a session is running, the app displays a live countdown to the next beep in minutes and seconds (e.g. `1:05`, `0:30`). The display shows `—` if the next beep time is not yet determined. The countdown disappears when the session is stopped.

In **random mode**, the countdown always reflects the exact moment the next beep will fire — it is not an estimate.

---

## 8. Session Status

A status indicator is always visible showing whether the session is stopped or running. The running state is visually distinguished from the stopped state (e.g. by color and animation).

---

## 9. Background Execution (Android)

On Android, the session continues beeping when the app is sent to the background or the screen is turned off. The beep timing and sound are unaffected by the app not being in the foreground. A persistent system notification is shown while a session is running, indicating the session is active.

---

## 10. No Persistence

Settings are not saved between sessions. Every time the app is opened, it starts with the default values.

---

## 11. Responsive Layout

The app layout adapts to the screen size without horizontal scrolling at any viewport width. It works on both desktop and mobile screens.
