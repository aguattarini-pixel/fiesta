import { formatoNumero } from './supabase.js'

// Cuánto se sube el diseño del flyer para dejar más lugar al número abajo
const SUBIR = 90

// Arma la invitación personalizada: el flyer de Canva con el número abajo
export async function crearInvitacion(numero) {
  try {
    await Promise.all([
      document.fonts.load('175px "Italiana"'),
      document.fonts.load('500 30px "Montserrat"'),
    ])
  } catch {
    /* si no cargan las fuentes, se usa una parecida */
  }

  const img = await new Promise((ok, mal) => {
    const i = new Image()
    i.onload = () => ok(i)
    i.onerror = mal
    i.src = '/flyer.png'
  })

  const W = img.width // 1080
  const H = img.height // 1920
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  // Todo el diseño un poco más arriba
  ctx.drawImage(img, 0, SUBIR, W, H - SUBIR, 0, 0, W, H - SUBIR)
  // La franja de arriba (solo puntitos) se pone abajo para completar
  ctx.drawImage(img, 0, 0, W, SUBIR, 0, H - SUBIR, W, SUBIR)

  const x = W / 2

  // Título chico
  ctx.fillStyle = '#ffffff'
  ctx.font = '500 30px Montserrat, sans-serif'
  dibujarCentrado(ctx, 'TU NÚMERO DE SORTEO', x, 1695, 8)

  // Número grande, dorado y con brillo
  ctx.font = '175px Italiana, serif'
  ctx.fillStyle = '#E9C46A'
  ctx.shadowColor = 'rgba(233, 196, 106, 0.55)'
  ctx.shadowBlur = 36
  dibujarCentrado(ctx, formatoNumero(numero), x, 1862, 22)
  ctx.shadowBlur = 0
  dibujarCentrado(ctx, formatoNumero(numero), x, 1862, 22)

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
