# Attention Beeper — Front-End Requirements

## Overview
Attention Beeper is a browser-based React application with no backend. It plays a beep sound at user-configured intervals to help the user maintain focus. It must work correctly on both desktop and mobile browsers.

---

## Functional Requirements

### 1. Beep Interval Configuration
- The user can set a beep interval (e.g., in minutes and/or seconds).
- The input must accept positive numeric values only.

### 2. Interval Mode
- The user selects one of two interval modes:
  - **Fixed**: the beep plays exactly at the specified interval (e.g., every 5 minutes).
  - **Random**: the beep plays at a random time within the specified interval (e.g., sometime within each 5-minute window).

### 3. Sound Selection
- A dropdown menu lets the user choose from a set of built-in beep sounds.
- At least 3–5 distinct sounds must be available (e.g., soft chime, bell, digital beep, ping, alert tone).
- All sounds are bundled with the app (no external audio fetching).

### 4. Playback Controls
- A Start button begins the beeping session.
- A Stop button ends the session and resets the timer.
- The UI clearly reflects the current state (running vs. stopped).

### 5. Audio Preview
- The user can preview the selected sound before starting the session (e.g., a "Test Sound" button).

---

## Non-Functional Requirements

### 6. Platform Compatibility
- The app must run correctly in modern desktop browsers (Chrome, Firefox, Safari, Edge).
- The app must run correctly in mobile browsers (iOS Safari, Android Chrome).
- Audio playback must work within mobile browser constraints (audio must be triggered by a user gesture).

### 7. Technology Stack
- Built with **React** (functional components and hooks).
- No backend — fully static, client-side only.
- Audio played via the **Web Audio API** or `<audio>` elements with bundled audio files.

### 8. No Persistence Required
- Settings do not need to be saved between sessions. All state is in-memory only.

### 9. Responsive Design
- The UI must be usable on small screens (mobile) and large screens (desktop) without horizontal scrolling or broken layouts.

---

## UI Elements Summary

| Element            | Type           | Description                                      |
|--------------------|----------------|--------------------------------------------------|
| Interval input     | Number input   | Sets the beep interval (minutes / seconds)       |
| Interval mode      | Radio / Toggle | Fixed or Random mode selection                   |
| Sound selector     | Dropdown       | Choose from bundled beep sounds                  |
| Test Sound button  | Button         | Plays the selected sound once immediately        |
| Start button       | Button         | Starts the beeping session                       |
| Stop button        | Button         | Stops the beeping session                        |
| Status indicator   | Text / Badge   | Shows whether the session is running or stopped  |
