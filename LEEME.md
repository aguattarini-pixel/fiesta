# Fiesta de fin de año: formulario y sorteo

## Páginas
- `/` : formulario de inscripción (lo que reciben los empleados)
- `/sorteo` : pantalla del sorteo para el proyector (pide la clave de la tabla `config`)

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
La pantalla del sorteo guarda la lista en la compu. Abrila con internet antes de la fiesta
(y tocá "Actualizar lista"). Si después se corta la conexión, sigue funcionando y sube los
ganadores cuando vuelve internet.
Atajo: barra espaciadora o Enter para sortear.
