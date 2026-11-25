import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { llamar, leerConfig, soloDigitos, formatoNumero } from './supabase.js'
import { RODILLOS_FORMULARIO, CONFIG_DEFECTO } from './config.js'
import Rodillos from './Rodillos.jsx'
import { descargarInvitacion } from './invitacion.js'

const PREFERENCIAS = ['Vegetariano/a', 'Celíaco/a', 'Ninguna']
const emailValido = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.trim())

const aparecer = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.35 },
}

function Opciones({ opciones, valor, onChange }) {
  return (
    <div className="opciones">
      {opciones.map((o) => (
        <button
          type="button"
          key={o.valor}
          className={'opcion' + (valor === o.valor ? ' sel' : '')}
          onClick={() => onChange(o.valor)}
        >
          <span className="punto" />
          {o.texto}
        </button>
      ))}
    </div>
  )
}

function Encabezado() {
  return (
    <header className="encabezado">
      <h1 className="titulo">FIESTA</h1>
      <p className="subtitulo">DE FIN DE AÑO</p>
      <hr />
    </header>
  )
}

export default function Formulario() {
  const [cfg, setCfg] = useState(CONFIG_DEFECTO)
  const [paso, setPaso] = useState('form') // form | resultado | no
  const [dni, setDni] = useState('')
  const [empleado, setEmpleado] = useState(null) // {encontrado, nombre, ya_inscripto, asiste, numero}
  const [buscando, setBuscando] = useState(false)
  const [email, setEmail] = useState('')
  const [asiste, setAsiste] = useState(null)
  const [preferencia, setPreferencia] = useState(null)
  const [alergico, setAlergico] = useState(null)
  const [alergia, setAlergia] = useState('')
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState(null) // {nombre, numero, yaInscripto}

  useEffect(() => {
    leerConfig().then(setCfg)
  }, [])

  // Busca el nombre cuando el DNI tiene 7 u 8 números
  const busqueda = useRef(0)
  useEffect(() => {
    const d = soloDigitos(dni)
    setEmpleado(null)
    if (d.length < 7) return
    const id = ++busqueda.current
    setBuscando(true)
    const t = setTimeout(async () => {
      try {
        const r = await llamar('buscar_empleado', { p_dni: d })
        if (id === busqueda.current) setEmpleado(r)
      } catch {
        if (id === busqueda.current) setEmpleado(null)
      } finally {
        if (id === busqueda.current) setBuscando(false)
      }
    }, 450)
    return () => clearTimeout(t)
  }, [dni])

  const limpiarError = (campo) => setErrores((e) => ({ ...e, [campo]: undefined, general: undefined }))

  async function enviar(e) {
    e.preventDefault()
    const err = {}
    const d = soloDigitos(dni)
    if (d.length < 7) err.dni = 'Ingresá tu DNI (solo números).'
    else if (empleado && !empleado.encontrado) err.dni = 'No encontramos ese DNI en la lista de empleados.'
    if (!emailValido(email)) err.email = 'Ingresá un correo válido.'
    if (asiste === null) err.asiste = 'Elegí una opción.'
    if (asiste === true) {
      if (!preferencia) err.preferencia = 'Elegí una opción.'
      if (alergico === null) err.alergico = 'Elegí una opción.'
      if (alergico === true && !alergia.trim()) err.alergia = 'Contanos a qué alimento.'
    }
    setErrores(err)
    if (Object.keys(err).length) return

    setEnviando(true)
    try {
      const r = await llamar('registrar', {
        p_dni: d,
        p_email: email.trim(),
        p_asiste: asiste,
        p_preferencia: asiste ? preferencia : null,
        p_alergia: asiste && alergico ? alergia.trim() : null,
      })
      if (!r?.ok) {
        setErrores({ general: r?.error || 'No pudimos guardar tu respuesta. Probá de nuevo.' })
        return
      }
      setResultado({ nombre: r.nombre, numero: r.numero, yaInscripto: r.ya_inscripto })
      setPaso(r.asiste ? 'resultado' : 'no')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setErrores({ general: 'Hay mucha gente anotándose en este momento. Esperá unos segundos y tocá Confirmar otra vez.' })
    } finally {
      setEnviando(false)
    }
  }

  function verMiNumero() {
    setResultado({ nombre: empleado.nombre, numero: empleado.numero, yaInscripto: true })
    setPaso('resultado')
  }

  const cerrada = cfg.inscripcion_abierta !== 'si'

  return (
    <main className="pagina">
      <div className="tarjeta">
        <Encabezado />
        <AnimatePresence mode="wait">
          {cerrada && paso === 'form' ? (
            <motion.div key="cerrada" {...aparecer} className="centro">
              <p className="texto-grande">La inscripción está cerrada.</p>
              <p className="texto-suave">Si tenés dudas, consultá con RRHH.</p>
            </motion.div>
          ) : paso === 'form' ? (
            <motion.form key="form" {...aparecer} onSubmit={enviar} noValidate>
              <label className="etiqueta" htmlFor="dni">DNI</label>
              <input
                id="dni"
                className="campo"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Sin puntos ni espacios"
                value={dni}
                maxLength={10}
                onChange={(e) => {
                  setDni(soloDigitos(e.target.value))
                  limpiarError('dni')
                }}
              />
              <div className="aviso-dni">
                {buscando && <span className="texto-suave">Buscando…</span>}
                {!buscando && empleado?.encontrado && (
                  <span className="hola">Hola, {empleado.nombre}</span>
                )}
                {!buscando && empleado && !empleado.encontrado && (
                  <span className="error">No encontramos ese DNI en la lista de empleados.</span>
                )}
              </div>
              {errores.dni && <p className="error">{errores.dni}</p>}

              {empleado?.ya_inscripto && empleado.asiste && (
                <div className="ya-inscripto">
                  <p>Ya estás inscripto/a con el número <b>{formatoNumero(empleado.numero)}</b>.</p>
                  <button type="button" className="boton secundario" onClick={verMiNumero}>
                    VER MI NÚMERO
                  </button>
                </div>
              )}

              <label className="etiqueta" htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                className="campo"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="nombre@correo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  limpiarError('email')
                }}
              />
              {errores.email && <p className="error">{errores.email}</p>}

              <p className="etiqueta">¿Contamos con tu presencia?</p>
              <Opciones
                opciones={[
                  { valor: true, texto: 'Sí, allí estaré' },
                  { valor: false, texto: 'No puedo, lo siento' },
                ]}
                valor={asiste}
                onChange={(v) => {
                  setAsiste(v)
                  limpiarError('asiste')
                }}
              />
              {errores.asiste && <p className="error">{errores.asiste}</p>}

              <AnimatePresence initial={false}>
                {asiste === true && (
                  <motion.div
                    key="extra"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <p className="etiqueta">Preferencia alimentaria</p>
                    <Opciones
                      opciones={PREFERENCIAS.map((p) => ({ valor: p, texto: p }))}
                      valor={preferencia}
                      onChange={(v) => {
                        setPreferencia(v)
                        limpiarError('preferencia')
                      }}
                    />
                    {errores.preferencia && <p className="error">{errores.preferencia}</p>}

                    <p className="etiqueta">¿Sos alérgico/a a algún alimento en particular?</p>
                    <Opciones
                      opciones={[
                        { valor: true, texto: 'Sí' },
                        { valor: false, texto: 'No' },
                      ]}
                      valor={alergico}
                      onChange={(v) => {
                        setAlergico(v)
                        limpiarError('alergico')
                      }}
                    />
                    {errores.alergico && <p className="error">{errores.alergico}</p>}

                    <AnimatePresence initial={false}>
                      {alergico === true && (
                        <motion.div
                          key="cual"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <label className="etiqueta" htmlFor="alergia">¿Cuál?</label>
                          <input
                            id="alergia"
                            className="campo"
                            maxLength={200}
                            placeholder="Maní, mariscos…"
                            value={alergia}
                            onChange={(e) => {
                              setAlergia(e.target.value)
                              limpiarError('alergia')
                            }}
                          />
                          {errores.alergia && <p className="error">{errores.alergia}</p>}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {errores.general && <p className="error general">{errores.general}</p>}

              <motion.button
                type="submit"
                className="boton"
                disabled={enviando}
                whileTap={{ scale: 0.97 }}
              >
                {enviando ? 'ENVIANDO…' : 'CONFIRMAR'}
              </motion.button>
            </motion.form>
          ) : paso === 'resultado' ? (
            <motion.div key="resultado" {...aparecer}>
              <Resultado resultado={resultado} cfg={cfg} />
            </motion.div>
          ) : (
            <motion.div key="no" {...aparecer} className="centro">
              <p className="texto-grande">Gracias por avisarnos.</p>
              <p className="texto-suave">
                Te vamos a extrañar, {resultado?.nombre}. ¡Que tengas un muy lindo fin de año!
              </p>
              <p className="texto-suave chico">
                Si cambiás de idea, volvé a entrar con tu DNI y marcá “Sí, allí estaré”.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}

function Resultado({ resultado, cfg }) {
  const [giro, setGiro] = useState(0)
  const [listo, setListo] = useState(resultado.yaInscripto)
  const [descargando, setDescargando] = useState(false)
  const numero = formatoNumero(resultado.numero)

  useEffect(() => {
    if (!resultado.yaInscripto) {
      const t = setTimeout(() => setGiro(1), 500)
      return () => clearTimeout(t)
    }
  }, [resultado.yaInscripto])

  async function descargar() {
    setDescargando(true)
    try {
      await descargarInvitacion(resultado.numero)
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="centro">
      <p className="texto-grande">¡Te esperamos!</p>
      <p className="texto-suave">{resultado.nombre}</p>
      <p className="texto-suave espacio">Tu número para el sorteo es</p>
      <Rodillos
        numero={numero}
        giro={giro}
        paradas={RODILLOS_FORMULARIO.paradas}
        vueltas={RODILLOS_FORMULARIO.vueltas}
        alTerminar={() => setListo(true)}
      />
      <AnimatePresence>
        {listo && (
          <motion.div key="info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <p className="texto-suave chico">
              Guardá este número: lo vas a necesitar en el sorteo. Descargá tu invitación para tenerlo siempre a mano.
            </p>
            <p className="fecha">{cfg.fecha} · {cfg.hora}</p>
            <p className="lugar">{cfg.lugar}</p>
            <p className="texto-suave chico">{cfg.direccion}</p>
            <button className="boton secundario" onClick={descargar} disabled={descargando}>
              {descargando ? 'PREPARANDO…' : 'DESCARGAR MI INVITACIÓN'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
