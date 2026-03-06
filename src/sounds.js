export const SOUNDS = [
  { id: 'chime', label: 'Soft Chime' },
  { id: 'bell', label: 'Bell' },
  { id: 'digital', label: 'Digital Beep' },
  { id: 'ping', label: 'Ping' },
  { id: 'alert', label: 'Alert Tone' },
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
      case 'chime':   softChime(ctx);   break
      case 'bell':    bell(ctx);        break
      case 'digital': digitalBeep(ctx); break
      case 'ping':    ping(ctx);        break
      case 'alert':   alertTone(ctx);   break
    }
  } catch (e) {
    console.warn('Audio playback failed:', e)
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
