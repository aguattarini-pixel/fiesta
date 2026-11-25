import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { llamar, formatoNumero, soloDigitos } from './supabase.js'
import Acceso from './Acceso.jsx'

const VOLVER_EN = 7000 // ms que se muestra la bienvenida antes de volver al teclado

export default function Asistencia() {
  return (
    <Acceso tipo="asistencia" titulo="RECEPCIÓN" subtitulo="CONTROL DE ASISTENCIA">
      {({ clave, salir }) => <Recepcion clave={clave} salir={salir} />}
    </Acceso>
  )
}

function Recepcion({ clave, salir }) {
  const [dni, setDni] = useState('')
  const [estado, setEstado] = useState('teclado') // teclado | buscando | resultado
  const [res, setRes] = useState(null)
  const timer = useRef(null)

  const reiniciar = useCallback(() => {
    clearTimeout(timer.current)
    setDni('')
    setRes(null)
    setEstado('teclado')
  }, [])

  const confirmar = useCallback(async () => {
    if (estado !== 'teclado') return
    if (dni.length < 7) {
      setRes({ error: 'El DNI tiene que tener 7 u 8 números.' })
      return
    }
    setEstado('buscando')
    setRes(null)
    try {
      const r = await llamar('marcar_llegada', { p_clave: clave, p_dni: dni })
      if (!r?.ok) {
        setRes({ error: r?.error || 'No se pudo registrar.' })
        setEstado('teclado')
        return
      }
      setRes(r)
      setEstado('resultado')
      timer.current = setTimeout(reiniciar, VOLVER_EN)
    } catch (e) {
      if (/clave incorrecta/i.test(e?.message || '')) {
        salir()
        return
      }
      setRes({ error: 'Sin conexión. Revisá el wifi e intentá de nuevo.' })
      setEstado('teclado')
    }
  }, [estado, dni, clave, reiniciar, salir])

  const tocar = useCallback(
    (t) => {
      if (estado === 'resultado') {
        reiniciar()
        return
      }
      if (estado !== 'teclado') return
      setRes(null)
      if (t === 'borrar') setDni((d) => d.slice(0, -1))
      else if (t === 'ok') confirmar()
      else setDni((d) => (d.length < 8 ? d + t : d))
    },
    [estado, confirmar, reiniciar]
  )

  // También funciona con un teclado físico
  useEffect(() => {
    const tecla = (e) => {
      if (/^\d$/.test(e.key)) tocar(e.key)
      else if (e.key === 'Backspace') tocar('borrar')
      else if (e.key === 'Enter') tocar('ok')
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [tocar])

  useEffect(() => () => clearTimeout(timer.current), [])

  const hora = (iso) =>
    new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  return (
    <main className="recepcion">
      <button className="boton-mini salir" onClick={salir}>Salir</button>
      <header className="encabezado">
        <h1 className="titulo grande">FIESTA</h1>
        <p className="subtitulo">¡BIENVENIDOS!</p>
      </header>

      <AnimatePresence mode="wait">
        {estado === 'resultado' && res ? (
          <motion.div
            key="res"
            className="bienvenida"
            onClick={reiniciar}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 180, damping: 18 }}
          >
            <p className="bienvenida-hola">{res.ya_estaba ? 'Ya estabas registrado/a' : '¡Qué bueno que viniste!'}</p>
            <p className="bienvenida-nombre">{res.nombre}</p>
            {res.numero ? (
              <>
                <p className="texto-suave">Tu número de sorteo</p>
                <motion.p
                  className="bienvenida-numero"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.25, type: 'spring', stiffness: 140, damping: 12 }}
                >
                  {formatoNumero(res.numero)}
                </motion.p>
                <p className="bienvenida-ok">
                  {res.ya_estaba ? `Llegada registrada a las ${hora(res.llegada)}` : '¡Ya estás participando del sorteo!'}
                </p>
              </>
            ) : (
              <p className="bienvenida-ok">
                {res.ya_estaba
                  ? `Tu llegada ya estaba registrada a las ${hora(res.llegada)}`
                  : 'Registramos tu llegada. ¡Que disfrutes la fiesta!'}
              </p>
            )}
            <p className="texto-suave chico">Tocá la pantalla para continuar</p>
          </motion.div>
        ) : (
          <motion.div key="teclado" className="zona-teclado" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="texto-suave">Ingresá tu DNI para registrar tu llegada</p>
            <div className={'pantalla-dni' + (dni ? '' : ' vacia')}>
              {dni ? soloDigitos(dni).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : 'DNI'}
            </div>
            <div className="aviso-recepcion">
              {estado === 'buscando' && <span className="texto-suave">Buscando…</span>}
              {res?.error && <span className="error grande">{res.error}</span>}
            </div>
            <div className="teclado">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'borrar', '0', 'ok'].map((t) => (
                <motion.button
                  key={t}
                  className={'tecla' + (t === 'ok' ? ' ok' : '') + (t === 'borrar' ? ' borrar' : '')}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => tocar(t)}
                  disabled={estado === 'buscando'}
                >
                  {t === 'borrar' ? '⌫' : t === 'ok' ? 'OK' : t}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
