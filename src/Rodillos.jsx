import { useEffect, useRef } from 'react'

// Tres rodillos estilo tragamonedas: cada uno gira 0,1,2...9 en orden, bajando,
// y frena suave (sin rebote) en la cifra que le toca. El primero frena antes.
//
// props:
//  numero      -> texto de 3 cifras, ej "347"
//  giro        -> número que cambia cada vez que hay que girar (0 = no girar)
//  paradas     -> [ms, ms, ms] momento en que se detiene cada rodillo
//  vueltas     -> [n, n, n] vueltas completas de 0 a 9 antes de frenar
//  alTerminar  -> función que se llama cuando frenan los tres
//  alFrenar    -> función(i) que se llama cuando frena cada rodillo

const mod = (n) => ((n % 10) + 10) % 10
const frenado = (x) => 1 - Math.pow(1 - x, 4)

export default function Rodillos({ numero = '000', giro = 0, paradas, vueltas, alTerminar, alFrenar, grande = false }) {
  const reels = [useRef(null), useRef(null), useRef(null)]
  const strips = [useRef(null), useRef(null), useRef(null)]
  const actual = useRef([0, 0, 0])
  const cb = useRef({})
  cb.current = { alTerminar, alFrenar }

  // Al principio muestra el número tal cual (o 000)
  useEffect(() => {
    strips.forEach((s, i) => {
      const d = +(numero[i] || 0)
      actual.current[i] = d
      if (s.current) {
        s.current.innerHTML = `<div>${d}</div>`
        s.current.style.transform = 'translateY(0px)'
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!giro) return
    const alto = reels[0].current?.clientHeight || 100
    const inicio = performance.now()
    let listos = 0
    let cancelado = false

    strips.forEach((s, i) => {
      const el = s.current
      const reel = reels[i].current
      if (!el || !reel) return
      reel.classList.remove('ok')
      const t = +numero[i]
      const L = 1 + 10 * vueltas[i] + mod(t - actual.current[i])
      // De arriba hacia abajo: la cifra siguiente queda arriba, así al bajar aparecen en orden 0,1,2...
      let html = `<div>${mod(t + 1)}</div>`
      for (let k = 1; k <= L; k++) html += `<div>${mod(t - (k - 1))}</div>`
      el.innerHTML = html
      const desde = -L * alto
      const hasta = -alto
      el.style.transform = `translateY(${desde}px)`

      const anim = (ahora) => {
        if (cancelado) return
        const p = Math.min(Math.max((ahora - inicio) / paradas[i], 0), 1)
        el.style.transform = `translateY(${desde + (hasta - desde) * frenado(p)}px)`
        if (p < 1) {
          requestAnimationFrame(anim)
        } else {
          actual.current[i] = t
          reel.classList.add('ok')
          cb.current.alFrenar?.(i)
          if (++listos === 3) cb.current.alTerminar?.()
        }
      }
      requestAnimationFrame(anim)
    })

    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giro])

  return (
    <div className={'maquina' + (grande ? ' grande' : '')}>
      {[0, 1, 2].map((i) => (
        <div className="reel" ref={reels[i]} key={i}>
          <div className="strip" ref={strips[i]} />
        </div>
      ))}
    </div>
  )
}
