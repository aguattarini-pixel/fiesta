# Fiesta de fin de año: formulario y sorteo

## Páginas
- `/` : formulario de inscripción (lo que reciben los empleados)
- `/asistencia` : tablet de recepción; cada uno pone su DNI al llegar (clave `clave_asistencia`)
- `/panel` : tarjetas, asistencia por local, listas y descarga de Excel (clave `clave_panel`)
- `/sorteo` : pantalla del sorteo para el proyector (clave `clave_sorteo`)

Solo participan del sorteo los que registraron su llegada en recepción y no están excluidos.

## Excluir a alguien del sorteo
Supabase > Table Editor > `empleados` > columna `excluido_sorteo` = true.
Igual recibe su número y puede registrar su llegada, pero nunca sale sorteado.

## Números
Tabla `config`: `rangos_numeros` (por defecto 7-300,589-750) se asignan al azar.
Si se agotan, siguen en orden desde `rango_extra` (751-999).

## Cambiar fecha, hora, lugar o cerrar la inscripción
Supabase > Table Editor > tabla `config` > editar el valor. No hace falta tocar el código.
- `inscripcion_abierta`: `si` para abrir, cualquier otra cosa para cerrar.

## Cambiar el flyer
Reemplazar `public/flyer.png` por el nuevo (PNG, 1080 x 1920). El número se agrega solo abajo.

## Tiempos de los rodillos
Archivo `src/config.js`:
- `RODILLOS_FORMULARIO`: los del número al inscribirse
- `RODILLOS_SORTEO`: los del sorteo
`paradas` = cuándo frena cada rodillo (en milisegundos). `vueltas` = cuántas vueltas de 0 a 9 da cada uno.

## Sorteo sin internet
La lista se actualiza sola cada 30 segundos mientras llega gente.
La pantalla del sorteo guarda la lista en la compu. Abrila con internet antes de la fiesta
(y tocá "Actualizar lista"). Si después se corta la conexión, sigue funcionando y sube los
ganadores cuando vuelve internet.
Atajo: barra espaciadora o Enter para sortear.
