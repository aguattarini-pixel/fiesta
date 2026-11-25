import React from 'react'
import ReactDOM from 'react-dom/client'
import Formulario from './Formulario.jsx'
import Sorteo from './Sorteo.jsx'
import Asistencia from './Asistencia.jsx'
import Panel from './Panel.jsx'
import Luces from './Luces.jsx'
import './estilos.css'

const ruta = window.location.pathname.replace(/\/+$/, '').toLowerCase()
const paginas = { '/sorteo': Sorteo, '/asistencia': Asistencia, '/panel': Panel }
const Pagina = paginas[ruta] || Formulario

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Luces />
    <Pagina />
  </React.StrictMode>
)
