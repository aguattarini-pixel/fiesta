import { useState } from 'react'
import { llamar } from './supabase.js'

// Actualizar la nómina de empleados subiendo un Excel.
// El Excel necesita columnas parecidas a: "NOMBRE Y APELLIDO", "CUIL" (o "DNI"),
// "LOCAL/AREA" y "PUESTO". La fila de títulos puede estar en cualquier lugar arriba.

const sinTildes = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
const titulo = (s) =>
  String(s ?? '')
    .trim()
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ')

function leerFilas(XLSX, archivo) {
  const wb = XLSX.read(archivo, { type: 'array' })
  const hoja = wb.Sheets[wb.SheetNames[0]]
  const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '' })

  // Busca la fila de títulos
  let fila = -1
  let col = {}
  for (let i = 0; i < Math.min(filas.length, 20); i++) {
    const t = filas[i].map(sinTildes)
    const nombre = t.findIndex((x) => x.includes('NOMBRE') || x.includes('APELLIDO'))
    const doc = t.findIndex((x) => x.includes('CUIL') || x.includes('DNI') || x.includes('DOCUMENTO'))
    if (nombre >= 0 && doc >= 0) {
      fila = i
      col = {
        nombre,
        doc,
        area: t.findIndex((x) => x.includes('LOCAL') || x.includes('AREA') || x.includes('SUCURSAL')),
        puesto: t.findIndex((x) => x.includes('PUESTO') || x.includes('CARGO')),
      }
      break
    }
  }
  if (fila < 0) throw new Error('No encontré las columnas de nombre y CUIL/DNI en el Excel.')

  const empleados = []
  const salteados = []
  filas.slice(fila + 1).forEach((r, k) => {
    const nombre = String(r[col.nombre] ?? '').trim()
    const digitos = String(r[col.doc] ?? '').replace(/\D/g, '')
    if (!nombre && !digitos) return // fila vacía
    let dni = ''
    if (digitos.length === 11) dni = digitos.slice(2, 10) // es un CUIL
    else if (digitos.length >= 7 && digitos.length <= 8) dni = digitos // es un DNI
    dni = dni.replace(/^0+/, '')
    if (!nombre || !dni) {
      salteados.push(`Fila ${fila + k + 2}: ${nombre || '(sin nombre)'}`)
      return
    }
    const a = col.area >= 0 ? r[col.area] : ''
    const area = typeof a === 'number' ? `Local ${a}` : String(a ?? '').trim()
    empleados.push({
      dni,
      cuil: digitos.length === 11 ? `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}` : '',
      nombre: titulo(nombre),
      area,
      puesto: col.puesto >= 0 ? String(r[col.puesto] ?? '').trim() : '',
    })
  })
  return { empleados, salteados }
}

export default function Nomina({ clave, alTerminar }) {
  const [abierto, setAbierto] = useState(false)
  const [datos, setDatos] = useState(null) // { empleados, salteados, archivo }
  const [quitar, setQuitar] = useState(true)
  const [claveReinicio, setClaveReinicio] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  async function elegirArchivo(e) {
    const f = e.target.files?.[0]
    setMensaje(null)
    setDatos(null)
    if (!f) return
    try {
      const XLSX = await import('xlsx')
      const buffer = await f.arrayBuffer()
      const r = leerFilas(XLSX, buffer)
      if (!r.empleados.length) throw new Error('No encontré empleados válidos en el archivo.')
      setDatos({ ...r, archivo: f.name })
    } catch (err) {
      setMensaje({ error: true, texto: err.message || 'No se pudo leer el archivo.' })
    }
    e.target.value = ''
  }

  async function subir() {
    if (!datos || !claveReinicio.trim()) return
    setTrabajando(true)
    setMensaje(null)
    try {
      const r = await llamar(
        'importar_empleados',
        { p_clave_panel: clave, p_clave_reinicio: claveReinicio.trim(), p_filas: datos.empleados, p_quitar: quitar },
        1
      )
      if (!r?.ok) {
        setMensaje({ error: true, texto: r?.error || 'No se pudo actualizar.' })
      } else {
        let t = `Listo: ${r.nuevos} nuevos y ${r.actualizados} actualizados.`
        if (quitar) t += ` Se quitaron ${r.quitados} que ya no están.`
        if (r.no_quitados) t += ` ${r.no_quitados} no se quitaron porque tienen inscripción (borrala antes con "Reiniciar todo").`
        t += ` Total en la base: ${r.empleados}.`
        setMensaje({ error: false, texto: t })
        setDatos(null)
        setClaveReinicio('')
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
        {abierto ? 'Ocultar nómina' : 'Actualizar nómina de empleados (Excel)'}
      </button>
      {abierto && (
        <div className="herramientas-caja">
          <p className="texto-suave chico">
            Subí el Excel con las columnas <b>Nombre y apellido</b>, <b>CUIL</b> (o DNI), <b>Local/Área</b> y <b>Puesto</b>,
            como el de este año. Los que ya estaban se actualizan y los nuevos se agregan. La marca de excluido se conserva.
          </p>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={elegirArchivo} className="campo archivo" />

          {datos && (
            <div className="confirmar-reinicio">
              <p style={{ margin: 0 }}>
                <b>{datos.archivo}</b>: {datos.empleados.length} empleados listos para cargar.
              </p>
              {datos.salteados.length > 0 && (
                <p className="texto-suave chico">
                  Se saltean {datos.salteados.length} filas sin nombre o con CUIL/DNI inválido:{' '}
                  {datos.salteados.slice(0, 5).join(' · ')}
                  {datos.salteados.length > 5 ? '…' : ''}
                </p>
              )}
              <label className="check">
                <input type="checkbox" checked={quitar} onChange={(e) => setQuitar(e.target.checked)} />
                Quitar de la base a quienes ya no están en este Excel
              </label>
              <label className="etiqueta" htmlFor="claveNomina">Clave de reinicio</label>
              <input
                id="claveNomina"
                className="campo"
                type="password"
                value={claveReinicio}
                onChange={(e) => setClaveReinicio(e.target.value)}
              />
              <button className="boton" disabled={!claveReinicio.trim() || trabajando} onClick={subir}>
                {trabajando ? 'CARGANDO…' : 'ACTUALIZAR NÓMINA'}
              </button>
            </div>
          )}
          {mensaje && <p className={mensaje.error ? 'error' : 'ok-msg'}>{mensaje.texto}</p>}
        </div>
      )}
    </section>
  )
}
