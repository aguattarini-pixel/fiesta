import { formatoNumero } from './supabase.js'

// Arma la invitación personalizada: el flyer completo y, debajo,
// una franja oscura con el número de sorteo en dorado.
// Funciona con cualquier tamaño de flyer (se reemplaza public/flyer.png).

const FONDO_FRANJA = '#151a22'
const DORADO = '#E9C46A'

export async function crearInvitacion(numero) {
  const img = await new Promise((ok, mal) => {
    const i = new Image()
    i.onload = () => ok(i)
    i.onerror = mal
    i.src = '/flyer.png?v=2'
  })

  const W = img.width
  const franja = Math.round(W * 0.3)
  const H = img.height + franja

  try {
    await Promise.all([
      document.fonts.load(`${Math.round(W * 0.15)}px "Italiana"`),
      document.fonts.load(`500 ${Math.round(W * 0.026)}px "Montserrat"`),
    ])
  } catch {
    /* si no cargan las fuentes, se usa una parecida */
  }

  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')

  // Flyer arriba
  ctx.drawImage(img, 0, 0)

  // Franja de abajo
  const y0 = img.height
  ctx.fillStyle = FONDO_FRANJA
  ctx.fillRect(0, y0, W, franja)

  // Línea dorada de separación
  ctx.fillStyle = DORADO
  ctx.fillRect(0, y0, W, Math.max(3, Math.round(W * 0.004)))

  const x = W / 2

  // Título chico
  ctx.fillStyle = '#ffffff'
  ctx.font = `500 ${Math.round(W * 0.026)}px Montserrat, sans-serif`
  dibujarCentrado(ctx, 'TU NÚMERO DE SORTEO', x, y0 + franja * 0.27, Math.round(W * 0.008))

  // Número grande, dorado y con brillo
  const yNum = y0 + franja * 0.84
  ctx.font = `${Math.round(W * 0.15)}px Italiana, serif`
  ctx.fillStyle = DORADO
  ctx.shadowColor = 'rgba(233, 196, 106, 0.55)'
  ctx.shadowBlur = Math.round(W * 0.03)
  dibujarCentrado(ctx, formatoNumero(numero), x, yNum, Math.round(W * 0.02))
  ctx.shadowBlur = 0
  dibujarCentrado(ctx, formatoNumero(numero), x, yNum, Math.round(W * 0.02))

  return new Promise((ok) => c.toBlob(ok, 'image/png'))
}

export async function descargarInvitacion(numero) {
  const blob = await crearInvitacion(numero)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `invitacion-fiesta-${formatoNumero(numero)}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// Texto con espacio entre letras, centrado según lo que realmente se ve
function dibujarCentrado(ctx, texto, x, y, espacio) {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const letras = [...texto]
  const medidas = letras.map((l) => ctx.measureText(l))
  const pos = []
  let cx = 0
  medidas.forEach((m) => {
    pos.push(cx)
    cx += m.width + espacio
  })
  const ultimo = letras.length - 1
  const izq = pos[0] - (medidas[0].actualBoundingBoxLeft || 0)
  const der = pos[ultimo] + (medidas[ultimo].actualBoundingBoxRight || medidas[ultimo].width)
  const inicio = x - (izq + der) / 2
  letras.forEach((l, i) => ctx.fillText(l, inicio + pos[i], y))
}
