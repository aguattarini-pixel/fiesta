// Datos de conexión a Supabase.
// La clave "publishable" es pública: puede estar en el código sin problema.
export const SUPABASE_URL = 'https://gicynreytiosqdfsgltp.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_L_KbLwAKzgCiSZYN6utsXg_e4cScyqc'

// Tiempos de los rodillos (en milisegundos) y vueltas completas de 0 a 9 de cada uno
export const RODILLOS_FORMULARIO = { paradas: [3500, 5500, 7500], vueltas: [5, 8, 11] }
export const RODILLOS_SORTEO = { paradas: [4000, 7000, 10000], vueltas: [4, 7, 10] }

// Valores por defecto si no se puede leer la tabla config
export const CONFIG_DEFECTO = {
  fecha: '14 | 12',
  hora: '21:00 HS',
  lugar: 'ALTO BOTÁNICO',
  direccion: 'Chancay 600, Córdoba',
  inscripcion_abierta: 'si',
}
