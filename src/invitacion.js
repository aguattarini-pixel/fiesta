import { formatoNumero } from './supabase.js'

// Arma la invitación personalizada: el flyer de Canva con el número abajo
export async function crearInvitacion(numero) {
  try {
    await Promise.all([
      document.fonts.load('110px "Italiana"'),
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

  const c = document.createElement('canvas')
  c.width = img.width // 1080
  c.height = img.height // 1920
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0)

  const x = c.width / 2
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = '#ffffff'
  ctx.font = '500 24px Montserrat, sans-serif'
  dibujarEspaciado(ctx, 'TU NÚMERO DE SORTEO', x, 1790, 5)

  ctx.fillStyle = '#E9C46A'
  ctx.font = '120px Italiana, serif'
  dibujarEspaciado(ctx, formatoNumero(numero), x, 1895, 18)

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

// Texto centrado con espacio entre letras (como en el flyer)
function dibujarEspaciado(ctx, texto, x, y, espacio) {
  const letras = [...texto]
  const anchos = letras.map((l) => ctx.measureText(l).width)
  const total = anchos.reduce((a, b) => a + b, 0) + espacio * (letras.length - 1)
  let cx = x - total / 2
  ctx.textAlign = 'left'
  letras.forEach((l, i) => {
    ctx.fillText(l, cx, y)
    cx += anchos[i] + espacio
  })
  ctx.textAlign = 'center'
}
