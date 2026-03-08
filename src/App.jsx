import { useState, useRef, useEffect, useCallback } from 'react'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { SOUNDS, playSound } from './sounds'
import './App.css'

const BackgroundMode = registerPlugin('BackgroundMode')

// True when running inside the Android APK; false on the web (GitHub Pages).
// Determines whether the JS loop or native events drive countdown + sound.
const isNative = Capacitor.isNativePlatform()

export default function App() {
  const [intervalValue, setIntervalValue] = useState(60)
  const [intervalUnit, setIntervalUnit] = useState('seconds')
  const [mode, setMode] = useState('random')
  const [selectedSound, setSelectedSound] = useState(SOUNDS[0].id)
  const [isRunning, setIsRunning] = useState(false)

  const modeRef = useRef(mode)
  const soundRef = useRef(selectedSound)
  const intervalMsRef = useRef(null)
  const runIdRef = useRef(0)
  const nextBeepAtRef = useRef(null)
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { soundRef.current = selectedSound }, [selectedSound])

  // ── Native event listeners ────────────────────────────────────────────────
  // These are registered unconditionally but only ever fire on Android.
  // On web the BackgroundMode proxy is a no-op and no events arrive.
  //
  // 'scheduled' — fires once when the native service starts.
  //   nextDelayMs = time until the first beep.
  //   Sets the initial countdown so the display is non-zero immediately.
  //
  // 'beep' — fires on every beep.
  //   nextDelayMs = the delay ALREADY CHOSEN for the next cycle by the native
  //   Handler, computed before triggerBeep() was called. This means the
  //   countdown is always an exact mirror of what the native timer is waiting
  //   on — no independent random sampling, no drift.
  useEffect(() => {
    const p1 = BackgroundMode.addListener('scheduled', ({ nextDelayMs }) => {
      nextBeepAtRef.current = Date.now() + nextDelayMs
    })
    const p2 = BackgroundMode.addListener('beep', ({ nextDelayMs }) => {
      playSound(soundRef.current)
      nextBeepAtRef.current = Date.now() + nextDelayMs
    })
    return () => {
      p1.then(h => h.remove())
      p2.then(h => h.remove())
    }
  }, [])

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  const handleStart = () => {
    const val = Math.max(1, Number(intervalValue) || 1)
    intervalMsRef.current = intervalUnit === 'minutes' ? val * 60_000 : val * 1_000
    setIsRunning(true)

    // Always tell the native side to start (no-op on web).
    BackgroundMode.schedule({ intervalMs: intervalMsRef.current, mode: modeRef.current }).catch(() => {})

    if (isNative) {
      // On Android: the native service owns timing, countdown, and sound.
      // 'scheduled' will fire shortly and set the initial nextBeepAtRef.
      // No JS loop needed.
      return
    }

    // ── Web fallback loop ─────────────────────────────────────────────────
    // On web the native events never arrive, so the JS loop handles both
    // the countdown display and sound playback — identical to the original
    // behaviour before Capacitor was added.
    const id = ++runIdRef.current

    const loop = async () => {
      let prePickedDelay = null

      while (runIdRef.current === id) {
        const base = intervalMsRef.current

        if (modeRef.current === 'fixed') {
          nextBeepAtRef.current = Date.now() + base
          await sleep(base)
          if (runIdRef.current !== id) break
          playSound(soundRef.current)
        } else {
          const delay = prePickedDelay ?? Math.max(1000, Math.random() * base)
          prePickedDelay = null
          nextBeepAtRef.current = Date.now() + delay
          await sleep(delay)
          if (runIdRef.current !== id) break
          playSound(soundRef.current)
          const remainder = base - delay
          const nextDelay = Math.max(1000, Math.random() * base)
          prePickedDelay = nextDelay
          nextBeepAtRef.current = Date.now() + remainder + nextDelay
          await sleep(remainder)
        }
      }
      nextBeepAtRef.current = null
    }
    loop()
  }

  const handleStop = useCallback(() => {
    runIdRef.current++           // invalidates the web JS loop (harmless on native)
    nextBeepAtRef.current = null // clears countdown immediately on native
    setIsRunning(false)
    BackgroundMode.cancel().catch(() => {})
  }, [])

  // Cleanup on unmount
  useEffect(() => () => {
    runIdRef.current++
    nextBeepAtRef.current = null
    BackgroundMode.cancel().catch(() => {})
  }, [])

  // Countdown ticker — reads nextBeepAtRef every 250 ms regardless of platform.
  // On native, nextBeepAtRef is set by native events. On web, by the JS loop.
  useEffect(() => {
    if (!isRunning) { setTimeLeft(null); return }
    const ticker = setInterval(() => {
      if (nextBeepAtRef.current != null) {
        setTimeLeft(Math.max(0, Math.ceil((nextBeepAtRef.current - Date.now()) / 1000)))
      } else {
        setTimeLeft(null)
      }
    }, 250)
    return () => clearInterval(ticker)
  }, [isRunning])

  const formatTime = (s) => {
    if (s == null) return '—'
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const modeHint = mode === 'fixed'
    ? `Beeps exactly every ${intervalValue} ${intervalUnit}`
    : `Beeps at a random moment within each ${intervalValue}-${intervalUnit === 'minutes' ? 'minute' : 'second'} window`

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-icon" aria-hidden="true">🔔</div>
        <h1>Attention Beeper</h1>
        <p>Stay focused with mindful audio cues</p>
      </header>

      <main className="card">
        {/* Sound */}
        <section className="field">
          <label className="field-label" htmlFor="sound-select">Beep Sound</label>
          <div className="row">
            <select
              id="sound-select"
              className="select"
              value={selectedSound}
              onChange={e => setSelectedSound(e.target.value)}
              disabled={isRunning}
            >
              {SOUNDS.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <button
              className="btn btn-secondary"
              onClick={() => playSound(selectedSound)}
              aria-label="Test selected sound"
            >
              Test
            </button>
          </div>
        </section>

        {/* Interval */}
        <section className="field">
          <label className="field-label" htmlFor="interval-input">Beep Interval</label>
          <div className="row">
            <input
              id="interval-input"
              className="input-number"
              type="number"
              min="1"
              value={intervalValue}
              onChange={e => setIntervalValue(e.target.value)}
              disabled={isRunning}
            />
            <select
              className="select select-unit"
              value={intervalUnit}
              onChange={e => setIntervalUnit(e.target.value)}
              disabled={isRunning}
            >
              <option value="seconds">Seconds</option>
              <option value="minutes">Minutes</option>
            </select>
          </div>
        </section>

        {/* Mode */}
        <section className="field">
          <span className="field-label">Interval Mode</span>
          <div className="mode-row">
            {[
              { value: 'fixed',  label: 'Fixed',  desc: 'Exact interval' },
              { value: 'random', label: 'Random', desc: 'Within interval' },
            ].map(opt => (
              <label
                key={opt.value}
                className={`mode-option${mode === opt.value ? ' selected' : ''}${isRunning ? ' disabled' : ''}`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={opt.value}
                  checked={mode === opt.value}
                  onChange={() => setMode(opt.value)}
                  disabled={isRunning}
                />
                <span className="mode-label">{opt.label}</span>
                <span className="mode-desc">{opt.desc}</span>
              </label>
            ))}
          </div>
          <p className="hint">{modeHint}</p>
        </section>

        {/* Controls */}
        <section className="controls">
          {isRunning ? (
            <button className="btn btn-danger btn-large" onClick={handleStop}>
              Stop
            </button>
          ) : (
            <button className="btn btn-primary btn-large" onClick={handleStart}>
              Start
            </button>
          )}
          {isRunning && (
            <div className="countdown">
              <span className="countdown-label">Next beep in</span>
              <span className="countdown-time">{formatTime(timeLeft)}</span>
            </div>
          )}
          <span className={`status-badge${isRunning ? ' running' : ''}`}>
            <span className="status-dot" />
            {isRunning ? 'Running' : 'Stopped'}
          </span>
        </section>
      </main>
    </div>
  )
}
