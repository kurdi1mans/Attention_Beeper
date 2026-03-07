export const SOUNDS = [
  { id: 'digital',  label: 'Digital Beep' },
  { id: 'ping',     label: 'Ping' },
  { id: 'pluck',    label: 'Pluck' },
  { id: 'ding',     label: 'Ding' },
  { id: 'danger',   label: 'Danger Warning' },
  { id: 'chime',    label: 'Soft Chime' },
  { id: 'bell',     label: 'Bell' },
  { id: 'alert',    label: 'Alert Tone' },
  { id: 'drop',     label: 'Drop' },
  { id: 'bubble',   label: 'Bubble Pop' },
  { id: 'woodblock',label: 'Wood Block' },
  { id: 'chord',    label: 'Soft Chord' },
  { id: 'blip',     label: 'Blip' },
  { id: 'whoosh',   label: 'Whoosh' },
  { id: 'click',    label: 'Click' },
]

let audioCtx = null

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioCtx
}

async function resumeCtx() {
  const ctx = getCtx()
  if (ctx.state === 'suspended') await ctx.resume()
  return ctx
}

export async function playSound(soundId) {
  try {
    const ctx = await resumeCtx()
    switch (soundId) {
      case 'chime':     softChime(ctx);   break
      case 'bell':      bell(ctx);        break
      case 'danger':    danger(ctx);      break
      case 'digital':   digitalBeep(ctx); break
      case 'ping':      ping(ctx);        break
      case 'alert':     alertTone(ctx);   break
      case 'drop':      drop(ctx);        break
      case 'bubble':    bubble(ctx);      break
      case 'woodblock': woodblock(ctx);   break
      case 'pluck':     pluck(ctx);       break
      case 'chord':     chord(ctx);       break
      case 'blip':      blip(ctx);        break
      case 'ding':      ding(ctx);        break
      case 'whoosh':    whoosh(ctx);      break
      case 'click':     click(ctx);       break
    }
  } catch (e) {
    console.warn('Audio playback failed:', e)
  }
}

// 3-second alternating two-tone alarm (6 cycles of 800 Hz / 1200 Hz)
function danger(ctx) {
  const t = ctx.currentTime
  for (let i = 0; i < 6; i++) {
    const base = t + i * 0.5
    ;[0, 0.25].forEach((offset, j) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'square'
      osc.frequency.setValueAtTime(j === 0 ? 800 : 1200, base + offset)
      gain.gain.setValueAtTime(0.25, base + offset)
      gain.gain.setValueAtTime(0.25, base + offset + 0.2)
      gain.gain.linearRampToValueAtTime(0, base + offset + 0.23)
      osc.start(base + offset)
      osc.stop(base + offset + 0.23)
    })
  }
}

function softChime(ctx) {
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, t)
  osc.frequency.exponentialRampToValueAtTime(660, t + 0.8)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.4, t + 0.05)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4)
  osc.start(t)
  osc.stop(t + 1.4)
}

function bell(ctx) {
  const t = ctx.currentTime
  const freqs = [523, 1046, 1568]
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, t)
    const vol = 0.3 / (i + 1)
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0)
    osc.start(t)
    osc.stop(t + 2.0)
  })
}

function digitalBeep(ctx) {
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'square'
  osc.frequency.setValueAtTime(440, t)
  gain.gain.setValueAtTime(0.18, t)
  gain.gain.setValueAtTime(0.18, t + 0.12)
  gain.gain.linearRampToValueAtTime(0, t + 0.15)
  osc.start(t)
  osc.stop(t + 0.15)
}

function ping(ctx) {
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(1400, t)
  gain.gain.setValueAtTime(0.5, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
  osc.start(t)
  osc.stop(t + 0.4)
}

function alertTone(ctx) {
  const t = ctx.currentTime
  ;[0, 0.22].forEach((offset, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(i === 0 ? 880 : 1100, t + offset)
    gain.gain.setValueAtTime(0.35, t + offset)
    gain.gain.setValueAtTime(0.35, t + offset + 0.14)
    gain.gain.linearRampToValueAtTime(0, t + offset + 0.18)
    osc.start(t + offset)
    osc.stop(t + offset + 0.18)
  })
}

// Descending pitch drop
function drop(ctx) {
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(600, t)
  osc.frequency.exponentialRampToValueAtTime(150, t + 0.4)
  gain.gain.setValueAtTime(0.4, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
  osc.start(t)
  osc.stop(t + 0.4)
}

// Short high-pitched pop
function bubble(ctx) {
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(300, t)
  osc.frequency.exponentialRampToValueAtTime(1200, t + 0.08)
  gain.gain.setValueAtTime(0.35, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
  osc.start(t)
  osc.stop(t + 0.12)
}

// Percussive click on a high-freq sine
function woodblock(ctx) {
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(800, t)
  osc.frequency.exponentialRampToValueAtTime(400, t + 0.05)
  gain.gain.setValueAtTime(0.6, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
  osc.start(t)
  osc.stop(t + 0.08)
}

// Guitar-like pluck using filtered noise decay
function pluck(ctx) {
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(493, t)
  gain.gain.setValueAtTime(0.5, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
  osc.start(t)
  osc.stop(t + 0.6)
}

// Three-note ascending soft chord
function chord(ctx) {
  const t = ctx.currentTime
  ;[261, 329, 392].forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, t + i * 0.06)
    gain.gain.setValueAtTime(0, t + i * 0.06)
    gain.gain.linearRampToValueAtTime(0.2, t + i * 0.06 + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 1.2)
    osc.start(t + i * 0.06)
    osc.stop(t + i * 0.06 + 1.2)
  })
}

// Very short high square blip
function blip(ctx) {
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'square'
  osc.frequency.setValueAtTime(1800, t)
  gain.gain.setValueAtTime(0.12, t)
  gain.gain.linearRampToValueAtTime(0, t + 0.06)
  osc.start(t)
  osc.stop(t + 0.06)
}

// Clear mid-range sine ding
function ding(ctx) {
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(1047, t)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.45, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1.6)
  osc.start(t)
  osc.stop(t + 1.6)
}

// Rising filtered noise sweep
function whoosh(ctx) {
  const t = ctx.currentTime
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  const filter = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  src.buffer = buffer
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(400, t)
  filter.frequency.exponentialRampToValueAtTime(3000, t + 0.3)
  filter.Q.setValueAtTime(2, t)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0.6, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
  src.start(t)
}

// Crisp mechanical click
function click(ctx) {
  const t = ctx.currentTime
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3)
  const src = ctx.createBufferSource()
  const gain = ctx.createGain()
  src.buffer = buffer
  src.connect(gain)
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(1.2, t)
  src.start(t)
}
