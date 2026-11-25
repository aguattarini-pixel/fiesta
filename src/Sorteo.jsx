import { useEffect, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { llamar, formatoNumero } from './supabase.js'
import { RODILLOS_SORTEO } from './config.js'
import Rodillos from './Rodillos.jsx'

// Respaldo local: si se corta internet en la fiesta, el sorteo sigue funcionando
const K_CLAVE = 'fiesta_clave'
const K_LISTA = 'fiesta_participantes'
const K_PEND = 'fiesta_ganadores_pendientes'

const leer = (k, def) => {
  try {
    const v = localStorage.getItem(k)
    return v ? JSON.parse(v) : def
  } catch {
    return def
  }
}
const guardar = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* sin almacenamiento */
  }
}

export default function Sorteo() {
  const [clave, setClave] = useState(() => leer(K_CLAVE, ''))
  const [lista, setLista] = useState(() => leer(K_LISTA, null))
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [sinConexion, setSinConexion] = useState(false)

  const cargar = useCallback(async (c) => {
    setCargando(true)
    setError('')
    try {
      const data = await llamar('sorteo_participantes', { p_clave: c }, 2)
      // Conserva ganadores marcados acá que todavía no se pudieron subir
      const pend = leer(K_PEND, [])
      const final = data.map((p) => {
        const pe = pend.find((x) => x.numero === p.numero)
        return pe ? { ...p, gano: true, premio: pe.premio } : p
      })
      setLista(final)
      guardar(K_LISTA, final)
      guardar(K_CLAVE, c)
      setSinConexion(false)
    } catch (e) {
      if (/clave incorrecta/i.test(e?.message || '')) {
        setError('Clave incorrecta.')
        setLista(null)
      } else if (leer(K_LISTA, null)) {
        setLista(leer(K_LISTA, null))
        setSinConexion(true)
      } else {
        setError('No se pudo conectar. Revisá internet e intentá de nuevo.')
      }
    } finally {
      setCargando(false)
    }
  }, [])

  // Si ya había entrado antes, recarga la lista al abrir
  useEffect(() => {
    if (clave) cargar(clave)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!lista) {
    return (
      <main className="pagina sorteo">
        <form
          className="tarjeta login"
          onSubmit={(e) => {
            e.preventDefault()
            if (clave.trim()) cargar(clave.trim())
          }}
        >
          <h1 className="titulo">SORTEO</h1>
          <p className="subtitulo">FIESTA DE FIN DE AÑO</p>
          <hr />
          <label className="etiqueta" htmlFor="clave">Clave del sorteo</label>
          <input
            id="clave"
            className="campo"
            type="password"
            value={clave}
            onChange={(e) => {
              setClave(e.target.value)
              setError('')
            }}
          />
          {error && <p className="error">{error}</p>}
          <button className="boton" disabled={cargando}>{cargando ? 'CARGANDO…' : 'ENTRAR'}</button>
        </form>
      </main>
    )
  }

  return (
    <Tablero
      lista={lista}
      setLista={setLista}
      clave={clave}
      sinConexion={sinConexion}
      setSinConexion={setSinConexion}
      recargar={() => cargar(clave)}
      cargando={cargando}
    />
  )
}

function Tablero({ lista, setLista, clave, sinConexion, setSinConexion, recargar, cargando }) {
  const [giro, setGiro] = useState(0)
  const [numero, setNumero] = useState('000')
  const [actual, setActual] = useState(null) // participante sorteado
  const [mostrarGanador, setMostrarGanador] = useState(false)
  const [girando, setGirando] = useState(false)
  const [premio, setPremio] = useState('')
  const [confeti, setConfeti] = useState(0)

  const disponibles = useMemo(() => lista.filter((p) => !p.gano), [lista])
  const ganadores = useMemo(() => lista.filter((p) => p.gano).reverse(), [lista])

  // Reintenta subir ganadores pendientes cada 20 segundos
  useEffect(() => {
    const subir = async () => {
      const pend = leer(K_PEND, [])
      if (!pend.length) return
      const quedan = []
      for (const g of pend) {
        try {
          await llamar('sorteo_registrar_ganador', { p_clave: clave, p_numero: g.numero, p_premio: g.premio }, 1)
        } catch {
          quedan.push(g)
        }
      }
      guardar(K_PEND, quedan)
      setSinConexion(quedan.length > 0)
    }
    subir()
    const t = setInterval(subir, 20000)
    return () => clearInterval(t)
  }, [clave, setSinConexion])

  const sortear = useCallback(() => {
    if (girando || !disponibles.length) return
    const elegido = disponibles[Math.floor(Math.random() * disponibles.length)]
    setActual({ ...elegido, premio: premio.trim() })
    setMostrarGanador(false)
    setNumero(formatoNumero(elegido.numero))
    setGirando(true)
    setGiro((g) => g + 1)
  }, [girando, disponibles, premio])

  // Barra espaciadora o Enter para sortear (cómodo con un control remoto o teclado)
  useEffect(() => {
    const tecla = (e) => {
      if (e.target.tagName === 'INPUT') return
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        sortear()
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [sortear])

  async function terminar() {
    setGirando(false)
    setMostrarGanador(true)
    setConfeti((c) => c + 1)
    const g = actual
    const nueva = lista.map((p) => (p.numero === g.numero ? { ...p, gano: true, premio: g.premio } : p))
    setLista(nueva)
    guardar(K_LISTA, nueva)
    try {
      await llamar('sorteo_registrar_ganador', { p_clave: clave, p_numero: g.numero, p_premio: g.premio }, 2)
    } catch {
      guardar(K_PEND, [...leer(K_PEND, []), { numero: g.numero, premio: g.premio }])
      setSinConexion(true)
    }
    setPremio('')
  }

  function pantallaCompleta() {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else document.documentElement.requestFullscreen?.()
  }

  return (
    <main className="sorteo-pantalla">
      <Confeti disparo={confeti} />
      <div className="sorteo-barra">
        <span>{disponibles.length} participan · {ganadores.length} ganadores</span>
        {sinConexion && <span className="sin-conexion">Sin conexión: se guarda en esta compu</span>}
        <button className="boton-mini" onClick={recargar} disabled={cargando || girando}>
          {cargando ? 'Actualizando…' : 'Actualizar lista'}
        </button>
        <button className="boton-mini" onClick={pantallaCompleta}>Pantalla completa</button>
      </div>

      <div className="sorteo-centro">
        <h1 className="titulo grande">FIESTA</h1>
        <p className="subtitulo">SORTEO DE FIN DE AÑO</p>

        <div className="premio-zona">
          {girando || mostrarGanador ? (
            actual?.premio ? <p className="premio-texto">{actual.premio}</p> : <p className="premio-texto">&nbsp;</p>
          ) : (
            <input
              className="campo premio-campo"
              placeholder="Premio (opcional)"
              value={premio}
              onChange={(e) => setPremio(e.target.value)}
            />
          )}
        </div>

        <Rodillos
          numero={numero}
          giro={giro}
          paradas={RODILLOS_SORTEO.paradas}
          vueltas={RODILLOS_SORTEO.vueltas}
          alTerminar={terminar}
          grande
        />

        <div className="ganador-zona">
          <AnimatePresence mode="wait">
            {mostrarGanador && actual ? (
              <motion.div
                key={'g' + actual.numero}
                initial={{ opacity: 0, scale: 0.6, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 160, damping: 14 }}
              >
                <p className="ganador-nombre">{actual.nombre}</p>
                <p className="ganador-area">{actual.area}</p>
              </motion.div>
            ) : girando ? (
              <motion.p key="girando" className="texto-suave" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Mucha suerte…
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        <motion.button
          className="boton boton-sortear"
          onClick={sortear}
          disabled={girando || !disponibles.length}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
        >
          {!disponibles.length ? 'YA SALIERON TODOS' : girando ? 'GIRANDO…' : 'SORTEAR'}
        </motion.button>
      </div>

      {ganadores.length > 0 && (
        <aside className="lista-ganadores">
          <p className="etiqueta">Ganadores</p>
          {ganadores.map((g, i) => (
            <div className="fila-ganador" key={g.numero}>
              <span>{ganadores.length - i}. {g.nombre}{g.premio ? ` · ${g.premio}` : ''}</span>
              <span className="num">{formatoNumero(g.numero)}</span>
            </div>
          ))}
        </aside>
      )}
    </main>
  )
}

const COLORES = ['#E9C46A', '#F4D98B', '#C9A24A', '#FFFFFF']

function Confeti({ disparo }) {
  const piezas = useMemo(
    () =>
      Array.from({ length: disparo ? 90 : 0 }, (_, i) => ({
        id: `${disparo}-${i}`,
        x: Math.random() * 100,
        tam: 6 + Math.random() * 8,
        color: COLORES[i % COLORES.length],
        demora: Math.random() * 0.6,
        dur: 2.4 + Math.random() * 1.8,
        giro: (Math.random() - 0.5) * 720,
        deriva: (Math.random() - 0.5) * 200,
        redondo: Math.random() > 0.6,
      })),
    [disparo]
  )
  return (
    <div className="confeti" aria-hidden="true">
      {piezas.map((p) => (
        <motion.span
          key={p.id}
          style={{
            left: `${p.x}%`,
            width: p.tam,
            height: p.redondo ? p.tam : p.tam * 0.45,
            background: p.color,
            borderRadius: p.redondo ? '50%' : 2,
          }}
          initial={{ y: -40, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '110vh', x: p.deriva, rotate: p.giro, opacity: [1, 1, 0] }}
          transition={{ duration: p.dur, delay: p.demora, ease: 'easeIn' }}
        />
      ))}
    </div>
  )
}
