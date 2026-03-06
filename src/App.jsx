import { useState, useRef, useEffect, useCallback } from 'react'
import { SOUNDS, playSound } from './sounds'
import './App.css'

export default function App() {
  const [intervalValue, setIntervalValue] = useState(5)
  const [intervalUnit, setIntervalUnit] = useState('minutes')
  const [mode, setMode] = useState('fixed')
  const [selectedSound, setSelectedSound] = useState(SOUNDS[0].id)
  const [isRunning, setIsRunning] = useState(false)

  // Refs so the scheduler always reads the latest values without restarts
  const modeRef = useRef(mode)
  const soundRef = useRef(selectedSound)
  const intervalMsRef = useRef(null)
  const timerRef = useRef(null)
  const scheduleRef = useRef(null)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { soundRef.current = selectedSound }, [selectedSound])

  scheduleRef.current = useCallback(() => {
    const base = intervalMsRef.current
    const delay = modeRef.current === 'fixed'
      ? base
      : Math.max(1000, Math.random() * base)

    timerRef.current = setTimeout(() => {
      playSound(soundRef.current)
      scheduleRef.current()
    }, delay)
  }, [])

  const handleStart = () => {
    const val = Math.max(1, Number(intervalValue) || 1)
    intervalMsRef.current = intervalUnit === 'minutes' ? val * 60_000 : val * 1_000
    setIsRunning(true)
    scheduleRef.current()
  }

  const handleStop = useCallback(() => {
    clearTimeout(timerRef.current)
    setIsRunning(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => () => clearTimeout(timerRef.current), [])

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
          <span className={`status-badge${isRunning ? ' running' : ''}`}>
            <span className="status-dot" />
            {isRunning ? 'Running' : 'Stopped'}
          </span>
        </section>
      </main>
    </div>
  )
}
