import { useEffect, useState } from 'react'
import { llamar } from './supabase.js'

// Pantalla de clave para la tablet de asistencia y el panel.
// La clave queda guardada en el dispositivo para no pedirla cada vez.
export default function Acceso({ tipo, titulo, subtitulo, children }) {
  const k = `fiesta_clave_${tipo}`
  const [clave, setClave] = useState(() => {
    try {
      return localStorage.getItem(k) || ''
    } catch {
      return ''
    }
  })
  const [ok, setOk] = useState(false)
  const [probando, setProbando] = useState(false)
  const [error, setError] = useState('')

  async function probar(c) {
    setProbando(true)
    setError('')
    try {
      const valida = await llamar('comprobar_clave', { p_tipo: tipo, p_clave: c }, 2)
      if (valida) {
        try {
          localStorage.setItem(k, c)
        } catch {
          /* sin almacenamiento */
        }
        setOk(true)
      } else {
        setError('Clave incorrecta.')
      }
    } catch {
      setError('No se pudo conectar. Revisá internet e intentá de nuevo.')
    } finally {
      setProbando(false)
    }
  }

  useEffect(() => {
    if (clave) probar(clave)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const salir = () => {
    try {
      localStorage.removeItem(k)
    } catch {
      /* nada */
    }
    setClave('')
    setOk(false)
  }

  if (ok) return children({ clave, salir })

  return (
    <main className="pagina">
      <form
        className="tarjeta login"
        onSubmit={(e) => {
          e.preventDefault()
          if (clave.trim()) probar(clave.trim())
        }}
      >
        <h1 className="titulo">{titulo}</h1>
        <p className="subtitulo">{subtitulo}</p>
        <hr />
        <label className="etiqueta" htmlFor="clave">Clave</label>
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
        <button className="boton" disabled={probando}>{probando ? 'VERIFICANDO…' : 'ENTRAR'}</button>
      </form>
    </main>
  )
}
