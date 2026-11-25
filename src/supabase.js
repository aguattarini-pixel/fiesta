import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_KEY, CONFIG_DEFECTO } from './config.js'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
})

// Llama a una función de la base con reintentos (por si hay mucha gente a la vez)
export async function llamar(funcion, params, intentos = 4) {
  let ultimoError
  for (let i = 0; i < intentos; i++) {
    const { data, error } = await supabase.rpc(funcion, params)
    if (!error) return data
    ultimoError = error
    if (/clave incorrecta/i.test(error.message)) break
    await new Promise((r) => setTimeout(r, 600 * (i + 1) + Math.random() * 400))
  }
  throw ultimoError
}

export async function leerConfig() {
  try {
    const { data, error } = await supabase.from('config').select('clave, valor')
    if (error || !data) return { ...CONFIG_DEFECTO }
    const cfg = { ...CONFIG_DEFECTO }
    data.forEach(({ clave, valor }) => (cfg[clave] = valor))
    return cfg
  } catch {
    return { ...CONFIG_DEFECTO }
  }
}

export const soloDigitos = (s) => (s || '').replace(/\D/g, '')
export const formatoNumero = (n) => String(n ?? 0).padStart(3, '0')
