import React from 'react'
import ReactDOM from 'react-dom/client'
import Formulario from './Formulario.jsx'
import Sorteo from './Sorteo.jsx'
import './estilos.css'

const esSorteo = window.location.pathname.replace(/\/+$/, '').toLowerCase() === '/sorteo'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>{esSorteo ? <Sorteo /> : <Formulario />}</React.StrictMode>
)
