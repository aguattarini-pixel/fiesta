import { useMemo } from 'react'

// Fondo de luces doradas (estilo bokeh), como en el flyer.
// Siempre se generan en las mismas posiciones para que no "salten" al recargar.

const CANTIDAD_GRUPOS = 7 // grupos de luces
const LUCES_POR_GRUPO = 22
const LUCES_SUELTAS = 45

function azar(semilla) {
  let a = semilla
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function crearLuces() {
  const r = azar(20261214)
  const luces = []
  const nueva = (x, y) => {
    const brillante = r() < 0.55
    const tam = brillante ? 3 + r() * 7 : 5 + r() * 11
    luces.push({
      x,
      y,
      tam,
      color: brillante ? '#F2C66D' : '#6E5527',
      opacidad: brillante ? 0.75 + r() * 0.25 : 0.55 + r() * 0.35,
      desenfoque: !brillante && tam > 10,
      demora: r() * 6,
      duracion: 3 + r() * 5,
      titila: r() < 0.6,
    })
  }
  // Grupos (como las nubes de puntitos del flyer)
  for (let g = 0; g < CANTIDAD_GRUPOS; g++) {
    const cx = 5 + r() * 90
    const cy = 5 + r() * 90
    const radio = 8 + r() * 14
    for (let i = 0; i < LUCES_POR_GRUPO; i++) {
      const ang = r() * Math.PI * 2
      const dist = Math.pow(r(), 0.7) * radio
      nueva(cx + Math.cos(ang) * dist * 1.2, cy + Math.sin(ang) * dist)
    }
  }
  // Luces sueltas por toda la pantalla
  for (let i = 0; i < LUCES_SUELTAS; i++) nueva(r() * 100, r() * 100)
  return luces.filter((l) => l.x > -2 && l.x < 102 && l.y > -2 && l.y < 102)
}

export default function Luces() {
  const luces = useMemo(crearLuces, [])
  return (
    <div className="luces" aria-hidden="true">
      {luces.map((l, i) => (
        <span
          key={i}
          className={l.titila ? 'luz titila' : 'luz'}
          style={{
            left: `${l.x}%`,
            top: `${l.y}%`,
            width: l.tam,
            height: l.tam,
            background: l.color,
            '--o': l.opacidad,
            opacity: l.opacidad,
            filter: l.desenfoque ? 'blur(1.5px)' : undefined,
            animationDelay: `${l.demora}s`,
            animationDuration: `${l.duracion}s`,
          }}
        />
      ))}
    </div>
  )
}
