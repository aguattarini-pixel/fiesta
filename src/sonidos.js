// Sonidos del sorteo, estilo "mecánico", generados por el navegador
// (no hacen falta archivos de audio). Se activan con el primer toque de "SORTEAR".
// Van sincronizados con la ruleta: un clic por cada número que pasa,
// un golpe cuando frena cada rodillo y campanas cuando aparece el ganador.

export const SONIDO_ACTIVADO = true
const VOLUMEN = 1 // 0.5 = mitad, 1 = normal, 1.5 = más fuerte

let ctx = null
let ruido = null
let ultimoTic = 0

export function iniciarAudio() {
  if (!SONIDO_ACTIVADO) return
  try {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext
      if (!C) return
      ctx = new C()
      const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      const d = b.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      ruido = b
    }
    if (ctx.state === 'suspended') ctx.resume()
  } catch {
    ctx = null
  }
}

function envolvente(g, t, vol, ataque, dur) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * VOLUMEN), t + ataque)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
}

function tono(freq, t, dur, tipo, vol, ataque = 0.004, freqFinal) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = tipo
  o.frequency.setValueAtTime(freq, t)
  if (freqFinal) o.frequency.exponentialRampToValueAtTime(freqFinal, t + dur)
  envolvente(g, t, vol, ataque, dur)
  o.connect(g)
  g.connect(ctx.destination)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function soplo(t, dur, vol, tipoFiltro, freq, q = 1) {
  const s = ctx.createBufferSource()
  s.buffer = ruido
  const f = ctx.createBiquadFilter()
  f.type = tipoFiltro
  f.frequency.value = freq
  f.Q.value = q
  const g = ctx.createGain()
  envolvente(g, t, vol, 0.002, dur)
  s.connect(f)
  f.connect(g)
  g.connect(ctx.destination)
  s.start(t, Math.random())
  s.stop(t + dur + 0.05)
}

// Clic de cada número que pasa por el rodillo
export function tic() {
  if (!ctx || !ruido) return
  const t = ctx.currentTime
  if (t - ultimoTic < 0.04) return // evita que se amontonen cuando giran rápido
  ultimoTic = t
  soplo(t, 0.03, 0.35, 'bandpass', 2600 + Math.random() * 600, 4)
  tono(900, t, 0.02, 'square', 0.01, 0.002)
}

// Golpe seco cuando frena cada rodillo
export function frenazo(i = 0) {
  if (!ctx || !ruido) return
  const t = ctx.currentTime
  soplo(t, 0.12, 0.5, 'lowpass', 500, 1)
  tono(95 + i * 15, t, 0.22, 'sine', 0.5, 0.003, 55)
}

// Campanas cuando aparece el ganador
export function fanfarria() {
  if (!ctx) return
  const t = ctx.currentTime + 0.05
  const notas = [523.25, 659.25, 783.99, 1046.5]
  notas.forEach((f, k) => {
    tono(f, t + k * 0.14, 1.4, 'sine', 0.18, 0.005)
    tono(f * 2.76, t + k * 0.14, 0.6, 'sine', 0.04, 0.005)
  })
  tono(1046.5, t + 0.6, 2.2, 'sine', 0.1, 0.005)
  tono(1567.98, t + 0.6, 2.2, 'sine', 0.06, 0.005)
}
