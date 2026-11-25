import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { llamar, formatoNumero } from './supabase.js'
import Acceso from './Acceso.jsx'

const ACTUALIZAR_CADA = 20000 // ms

export default function Panel() {
  return (
    <Acceso tipo="panel" titulo="PANEL" subtitulo="CONTROL DE ASISTENCIA">
      {({ clave, salir }) => <Tablero clave={clave} salir={salir} />}
    </Acceso>
  )
}

const hora = (iso) => (iso ? new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '')
const fechaHora = (iso) => (iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '')
const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '–')
const sinTildes = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Orden natural de locales: Local 1, Local 2 … Local 10, después las áreas
function ordenArea(a, b) {
  const na = /^Local (\d+)$/.exec(a)
  const nb = /^Local (\d+)$/.exec(b)
  if (na && nb) return +na[1] - +nb[1]
  if (na) return -1
  if (nb) return 1
  return a.localeCompare(b, 'es')
}

function clasificar(rows) {
  return rows.map((r) => ({
    ...r,
    area: r.area || 'Sin área',
    confirmo: !!r.asiste && r.origen !== 'recepcion',
    llego: !!r.llegada,
    dijoNo: r.respondio && r.asiste === false,
    sinResponder: !r.respondio,
    enRecepcion: r.origen === 'recepcion',
  }))
}

function Tablero({ clave, salir }) {
  const [datos, setDatos] = useState(null)
  const [actualizado, setActualizado] = useState(null)
  const [error, setError] = useState('')
  const [vista, setVista] = useState('asistieron')
  const [buscar, setBuscar] = useState('')
  const [bajando, setBajando] = useState(false)
  const [verLocales, setVerLocales] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const r = await llamar('panel_datos', { p_clave: clave }, 2)
      setDatos(clasificar(r))
      setActualizado(new Date())
      setError('')
    } catch (e) {
      if (/clave incorrecta/i.test(e?.message || '')) salir()
      else setError('Sin conexión. Se muestran los últimos datos.')
    }
  }, [clave, salir])

  useEffect(() => {
    cargar()
    const t = setInterval(cargar, ACTUALIZAR_CADA)
    return () => clearInterval(t)
  }, [cargar])

  const t = useMemo(() => {
    if (!datos) return null
    const c = (f) => datos.filter(f).length
    return {
      empleados: datos.length,
      confirmaron: c((r) => r.confirmo),
      asistieron: c((r) => r.llego),
      asistieronConfirmados: c((r) => r.llego && r.confirmo),
      noAsistieron: c((r) => r.confirmo && !r.llego),
      enRecepcion: c((r) => r.enRecepcion),
      dijeronNo: c((r) => r.dijoNo),
      sinResponder: c((r) => r.sinResponder),
      excluidos: c((r) => r.excluido),
      enSorteo: c((r) => r.llego && !r.excluido && r.numero),
    }
  }, [datos])

  const porLocal = useMemo(() => {
    if (!datos) return []
    const m = new Map()
    datos.forEach((r) => {
      if (!m.has(r.area)) m.set(r.area, { area: r.area, empleados: 0, confirmaron: 0, asistieron: 0, noAsistieron: 0, sinAnotarse: 0 })
      const x = m.get(r.area)
      x.empleados++
      if (r.confirmo) x.confirmaron++
      if (r.confirmo && r.llego) x.asistieron++
      if (r.confirmo && !r.llego) x.noAsistieron++
      if (r.enRecepcion) x.sinAnotarse++
    })
    return [...m.values()].sort((a, b) => ordenArea(a.area, b.area))
  }, [datos])

  const listas = useMemo(() => {
    if (!datos) return {}
    return {
      asistieron: datos.filter((r) => r.llego).sort((a, b) => (b.llegada || '').localeCompare(a.llegada || '')),
      noAsistieron: datos.filter((r) => r.confirmo && !r.llego),
      sinResponder: datos.filter((r) => r.sinResponder || r.dijoNo),
      ganadores: datos.filter((r) => r.gano).sort((a, b) => (a.gano_en || '').localeCompare(b.gano_en || '')),
      excluidos: datos.filter((r) => r.excluido),
    }
  }, [datos])

  const filas = useMemo(() => {
    const l = listas[vista] || []
    const q = sinTildes(buscar.trim())
    if (!q) return l
    return l.filter((r) => sinTildes(`${r.nombre} ${r.dni} ${r.area} ${r.numero ?? ''}`).includes(q))
  }, [listas, vista, buscar])

  async function deshacer(r) {
    if (!window.confirm(`¿Quitar la llegada de ${r.nombre}? Deja de participar del sorteo.`)) return
    try {
      await llamar('desmarcar_llegada', { p_clave: clave, p_dni: r.dni }, 2)
      cargar()
    } catch {
      setError('No se pudo deshacer. Probá de nuevo.')
    }
  }

  async function descargarExcel() {
    setBajando(true)
    try {
      const XLSX = await import('xlsx')
      const persona = (r) => ({
        Nombre: r.nombre,
        DNI: r.dni,
        'Local / Área': r.area,
        Puesto: r.puesto || '',
        'Número sorteo': r.numero ?? '',
        Respuesta: r.sinResponder ? 'Sin responder' : r.dijoNo ? 'No asiste' : r.enRecepcion ? 'Llegó sin anotarse' : 'Confirmó',
        'Asistió': r.llego ? 'Sí' : 'No',
        'Hora llegada': hora(r.llegada),
        Comida: r.preferencia || '',
        Alergia: r.alergia || '',
        'Excluido del sorteo': r.excluido ? 'Sí' : '',
        'Ganó sorteo': r.gano ? 'Sí' : '',
        'Fecha inscripción': fechaHora(r.inscripto),
      })
      const hoja = (filas, anchos) => {
        const ws = XLSX.utils.json_to_sheet(filas)
        ws['!cols'] = anchos.map((w) => ({ wch: w }))
        return ws
      }
      const anchosPersona = [32, 11, 18, 22, 14, 22, 9, 13, 15, 22, 18, 12, 18]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(
        wb,
        hoja(
          [
            { Dato: 'Empleados en la lista', Cantidad: t.empleados },
            { Dato: 'Confirmaron por formulario', Cantidad: t.confirmaron },
            { Dato: 'Asistieron (total)', Cantidad: t.asistieron },
            { Dato: 'Confirmaron y asistieron', Cantidad: t.asistieronConfirmados },
            { Dato: 'Confirmaron y no asistieron', Cantidad: t.noAsistieron },
            { Dato: 'Llegaron sin anotarse (sin número)', Cantidad: t.enRecepcion },
            { Dato: 'Dijeron que no', Cantidad: t.dijeronNo },
            { Dato: 'Sin responder', Cantidad: t.sinResponder },
            { Dato: 'Participan del sorteo', Cantidad: t.enSorteo },
            { Dato: 'Datos al', Cantidad: fechaHora(new Date().toISOString()) },
          ],
          [30, 18]
        ),
        'Resumen'
      )
      XLSX.utils.book_append_sheet(
        wb,
        hoja(
          porLocal.map((x) => ({
            'Local / Área': x.area,
            Empleados: x.empleados,
            Confirmaron: x.confirmaron,
            Asistieron: x.asistieron,
            'No asistieron': x.noAsistieron,
            '% asistencia': pct(x.asistieron, x.confirmaron),
            'Llegaron sin anotarse': x.sinAnotarse,
          })),
          [22, 11, 12, 11, 14, 13, 24]
        ),
        'Por local'
      )
      XLSX.utils.book_append_sheet(wb, hoja(listas.asistieron.map(persona), anchosPersona), 'Asistieron')
      XLSX.utils.book_append_sheet(wb, hoja(listas.noAsistieron.map(persona), anchosPersona), 'No asistieron')
      XLSX.utils.book_append_sheet(
        wb,
        hoja(listas.ganadores.map((r, i) => ({ Orden: i + 1, ...persona(r), 'Hora del sorteo': hora(r.gano_en) })), [8, ...anchosPersona, 15]),
        'Ganadores'
      )
      XLSX.utils.book_append_sheet(wb, hoja(datos.map(persona), anchosPersona), 'Todos')
      const f = new Date()
      const sello = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}_${String(f.getHours()).padStart(2, '0')}${String(f.getMinutes()).padStart(2, '0')}`
      XLSX.writeFile(wb, `asistencia-fiesta_${sello}.xlsx`)
    } catch {
      setError('No se pudo generar el Excel.')
    } finally {
      setBajando(false)
    }
  }

  if (!datos) {
    return (
      <main className="pagina">
        <p className="texto-suave">{error || 'Cargando…'}</p>
      </main>
    )
  }

  const tarjetas = [
    { titulo: 'Asistieron', valor: t.asistieron, detalle: `${pct(t.asistieronConfirmados, t.confirmaron)} de los que confirmaron`, destacada: true },
    { titulo: 'Confirmaron', valor: t.confirmaron, detalle: `de ${t.empleados} empleados` },
    { titulo: 'Confirmaron y no vinieron', valor: t.noAsistieron, detalle: 'todavía no llegaron' },
    { titulo: 'En el sorteo', valor: t.enSorteo, detalle: `${t.excluidos} excluidos` },
    { titulo: 'Llegaron sin anotarse', valor: t.enRecepcion, detalle: 'sin número, no participan' },
    { titulo: 'Dijeron que no', valor: t.dijeronNo, detalle: `${t.sinResponder} sin responder` },
  ]

  const pestanas = [
    ['asistieron', `Asistieron (${listas.asistieron.length})`],
    ['noAsistieron', `No asistieron (${listas.noAsistieron.length})`],
    ['sinResponder', `No vienen / sin responder (${listas.sinResponder.length})`],
    ['ganadores', `Ganadores (${listas.ganadores.length})`],
    ['excluidos', `Excluidos (${listas.excluidos.length})`],
  ]

  const conComida = vista === 'asistieron' || vista === 'noAsistieron'
  const conEstado = vista === 'sinResponder' || vista === 'excluidos'
  const estado = (r) =>
    r.llego ? 'Llegó' : r.confirmo ? 'Confirmó' : r.dijoNo ? 'No asiste' : 'Sin responder'

  return (
    <main className="panel">
      <div className="panel-cabecera">
        <div>
          <h1 className="titulo panel-titulo">Panel de asistencia</h1>
          <p className="texto-suave chico">
            Actualizado a las {actualizado?.toLocaleTimeString('es-AR')} · se actualiza solo cada 20 segundos
            {error && <span className="error"> · {error}</span>}
          </p>
        </div>
        <div className="panel-acciones">
          <button className="boton boton-chico" onClick={descargarExcel} disabled={bajando}>
            {bajando ? 'GENERANDO…' : 'DESCARGAR EXCEL'}
          </button>
          <button className="boton-mini" onClick={cargar}>Actualizar</button>
          <button className="boton-mini" onClick={salir}>Salir</button>
        </div>
      </div>

      <div className="tarjetas">
        {tarjetas.map((c, i) => (
          <motion.div
            key={c.titulo}
            className={'tarjeta-dato' + (c.destacada ? ' destacada' : '')}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <p className="dato-titulo">{c.titulo}</p>
            <p className="dato-valor">{c.valor}</p>
            <p className="dato-detalle">{c.detalle}</p>
          </motion.div>
        ))}
      </div>

      <section className="bloque">
        <div className="pestanas">
          {pestanas.map(([k, txt]) => (
            <button key={k} className={'pestana' + (vista === k ? ' activa' : '')} onClick={() => setVista(k)}>
              {txt}
            </button>
          ))}
        </div>
        <input
          className="campo buscador"
          placeholder="Buscar por nombre, DNI, local o número"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />
        <div className="tabla-scroll">
          <table className="tabla">
            <thead>
              <tr>
                {vista === 'ganadores' && <th>Orden</th>}
                <th>Nombre</th>
                <th>DNI</th>
                <th>Local / Área</th>
                <th>N°</th>
                {vista === 'asistieron' && <th>Llegada</th>}
                {conComida && <th>Comida</th>}
                {conComida && <th>Alergia</th>}
                {conEstado && <th>Estado</th>}
                {vista === 'asistieron' && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filas.map((r) => (
                <tr key={r.dni}>
                  {vista === 'ganadores' && <td className="dorado">{listas.ganadores.indexOf(r) + 1}°</td>}
                  <td>
                    {r.nombre}
                    {r.excluido && <span className="etiqueta-chica">excluido</span>}
                    {r.enRecepcion && <span className="etiqueta-chica">sin anotarse</span>}
                    {r.gano && <span className="etiqueta-chica oro">ganó</span>}
                  </td>
                  <td>{r.dni}</td>
                  <td>{r.area}</td>
                  <td className="dorado">{r.numero ? formatoNumero(r.numero) : ''}</td>
                  {vista === 'asistieron' && <td>{hora(r.llegada)}</td>}
                  {conComida && <td>{r.preferencia || ''}</td>}
                  {conComida && <td>{r.alergia || ''}</td>}
                  {conEstado && <td>{estado(r)}</td>}
                  {vista === 'asistieron' && (
                    <td>
                      <button className="boton-mini" onClick={() => deshacer(r)}>Deshacer</button>
                    </td>
                  )}
                </tr>
              ))}
              {!filas.length && (
                <tr>
                  <td colSpan={8} className="texto-suave">Nadie por acá todavía.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bloque">
        <div className="pestanas">
          <button className={'pestana' + (verLocales ? ' activa' : '')} onClick={() => setVerLocales((v) => !v)}>
            Por local / área {verLocales ? '▴' : '▾'}
          </button>
        </div>
        {verLocales && (
        <div className="tabla-scroll">
          <table className="tabla">
            <thead>
              <tr>
                <th>Local / Área</th>
                <th>Confirmaron</th>
                <th>Asistieron</th>
                <th>No asistieron</th>
                <th>%</th>
                <th>Sin anotarse</th>
              </tr>
            </thead>
            <tbody>
              {porLocal.map((x) => (
                <tr key={x.area}>
                  <td>{x.area}</td>
                  <td>{x.confirmaron}</td>
                  <td className="dorado">{x.asistieron}</td>
                  <td>{x.noAsistieron}</td>
                  <td>
                    <div className="barra"><span style={{ width: pct(x.asistieron, x.confirmaron) === '–' ? 0 : pct(x.asistieron, x.confirmaron) }} /></div>
                    {pct(x.asistieron, x.confirmaron)}
                  </td>
                  <td>{x.sinAnotarse || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </section>

      <Reinicio clave={clave} alTerminar={cargar} />
    </main>
  )
}

const OPCIONES_REINICIO = [
  {
    id: 'sorteo',
    titulo: 'Reiniciar sorteo',
    texto: 'Borra los ganadores. Todos los presentes vuelven a participar.',
  },
  {
    id: 'asistencia',
    titulo: 'Reiniciar asistencia',
    texto: 'Borra las llegadas marcadas en la tablet y los ganadores. Las inscripciones y números del formulario se mantienen.',
  },
  {
    id: 'todo',
    titulo: 'Reiniciar todo',
    texto: 'Borra inscripciones, números, llegadas y ganadores. Queda como nuevo. La lista de empleados, los excluidos y la configuración no se tocan.',
  },
]

function Reinicio({ clave, alTerminar }) {
  const [abierto, setAbierto] = useState(false)
  const [opcion, setOpcion] = useState(null)
  const [claveReinicio, setClaveReinicio] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const elegida = OPCIONES_REINICIO.find((o) => o.id === opcion)
  const listo = elegida && claveReinicio.trim() && confirmacion.trim().toUpperCase() === 'BORRAR'

  async function ejecutar() {
    if (!listo) return
    setTrabajando(true)
    setMensaje(null)
    try {
      const r = await llamar('reiniciar_datos', { p_clave_panel: clave, p_clave_reinicio: claveReinicio.trim(), p_que: opcion }, 1)
      if (!r?.ok) {
        setMensaje({ error: true, texto: r?.error || 'No se pudo borrar.' })
      } else {
        setMensaje({ error: false, texto: `Listo: ${elegida.titulo.toLowerCase()} hecho. Si la pantalla del sorteo está abierta, tocá “Actualizar lista”.` })
        setOpcion(null)
        setClaveReinicio('')
        setConfirmacion('')
        alTerminar()
      }
    } catch {
      setMensaje({ error: true, texto: 'No se pudo conectar. Probá de nuevo.' })
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <section className="bloque herramientas">
      <button className="boton-mini" onClick={() => setAbierto((a) => !a)}>
        {abierto ? 'Ocultar herramientas' : 'Herramientas: borrar datos de prueba'}
      </button>
      {abierto && (
        <div className="herramientas-caja">
          <div className="opciones-reinicio">
            {OPCIONES_REINICIO.map((o) => (
              <button
                key={o.id}
                className={'opcion-reinicio' + (opcion === o.id ? ' sel' : '') + (o.id === 'todo' ? ' peligro' : '')}
                onClick={() => {
                  setOpcion(o.id)
                  setMensaje(null)
                }}
              >
                <span className="opcion-titulo">{o.titulo}</span>
                <span className="opcion-texto">{o.texto}</span>
              </button>
            ))}
          </div>
          {elegida && (
            <div className="confirmar-reinicio">
              <p className="texto-suave chico">Esto no se puede deshacer. Si querés guardar los datos, descargá el Excel antes.</p>
              <label className="etiqueta" htmlFor="claveReinicio">Clave de reinicio</label>
              <input
                id="claveReinicio"
                className="campo"
                type="password"
                value={claveReinicio}
                onChange={(e) => setClaveReinicio(e.target.value)}
              />
              <label className="etiqueta" htmlFor="confirmacion">Escribí BORRAR para confirmar</label>
              <input
                id="confirmacion"
                className="campo"
                autoComplete="off"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
              />
              <button className="boton boton-peligro" disabled={!listo || trabajando} onClick={ejecutar}>
                {trabajando ? 'BORRANDO…' : elegida.titulo.toUpperCase()}
              </button>
            </div>
          )}
          {mensaje && <p className={mensaje.error ? 'error' : 'ok-msg'}>{mensaje.texto}</p>}
        </div>
      )}
    </section>
  )
}
