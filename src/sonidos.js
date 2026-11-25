// Sonidos del sorteo, generados por el navegador (no hacen falta archivos de audio).
// Se activan con el primer toque de "SORTEAR" (los navegadores lo exigen).

export const SONIDO_ACTIVADO = true
const VOLUMEN = 1 // 0.5 = mitad, 1 = normal, 1.5 = más fuerte

let ctx = null
let ultimoTic = 0

export function iniciarAudio() {
  if (!SONIDO_ACTIVADO) return
  try {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext
      if (C) ctx = new C()
    }
    if (ctx && ctx.state === 'suspended') ctx.resume()
  } catch {
    ctx = null
  }
}

function tono(freq, dur, tipo = 'sine', vol = 0.1, cuando = 0) {
  if (!ctx) return
  const t = ctx.currentTime + cuando
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = tipo
  o.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(Math.max(0.0001, vol * VOLUMEN), t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g)
  g.connect(ctx.destination)
  o.start(t)
  o.stop(t + dur + 0.05)
}

// "Tic" de cada número que pasa por el rodillo
export function tic() {
  if (!ctx) return
  const ahora = ctx.currentTime
  if (ahora - ultimoTic < 0.04) return // evita que se amontonen cuando giran rápido
  ultimoTic = ahora
  tono(1500 + Math.random() * 300, 0.035, 'square', 0.02)
}

// Golpe cuando frena cada rodillo (cada uno un poco más agudo)
export function frenazo(i = 0) {
  tono(180 + i * 70, 0.25, 'triangle', 0.22)
  tono(90 + i * 35, 0.35, 'sine', 0.18)
}

// Fanfarria cuando aparece el ganador
export function fanfarria() {
  const notas = [523.25, 659.25, 783.99, 1046.5]
  notas.forEach((f, k) => tono(f, 0.4, 'triangle', 0.13, k * 0.13))
  notas.forEach((f) => tono(f, 1.6, 'sine', 0.06, 0.55))
  tono(1567.98, 1.2, 'sine', 0.04, 0.6)
}
