const KEY = 'xotp_sound_on'

export const isSoundOn = () => localStorage.getItem(KEY) !== 'off'

export const setSoundOn = (v) => localStorage.setItem(KEY, v ? 'on' : 'off')

let ctx = null

function ensureCtx() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
    return ctx
  } catch {
    return null
  }
}

export function prime() {
  ensureCtx()
}

function tone(freq, delay, dur, vol) {
  const c = ensureCtx()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'sine'
  o.frequency.value = freq
  o.connect(g)
  g.connect(c.destination)
  const t0 = c.currentTime + delay
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol || 0.35, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.start(t0)
  o.stop(t0 + dur + 0.05)
}

export function playAlert() {
  if (!isSoundOn()) return
  tone(880, 0, 0.22, 0.4)
  tone(1174.66, 0.18, 0.28, 0.4)
  tone(1567.98, 0.4, 0.5, 0.4)
}