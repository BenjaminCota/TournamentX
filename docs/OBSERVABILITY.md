# Observabilidad y procedimiento de revisión

## Señales disponibles

- `GET /api/health` confirma la disponibilidad de la API, el almacenamiento
  activo, si Socket.IO está adjunto y la cantidad de clientes conectados.
- Todas las respuestas incluyen `X-Request-Id`; las respuestas de error también
  devuelven `requestId` en JSON.
- Los errores 5xx se emiten como una línea JSON en stderr con `requestId`, método,
  ruta y código de error. La plataforma de despliegue debe conservar este stream.
- Los proveedores externos devuelven explícitamente estado `configured`, `demo` o
  `error`, para evitar que un fallback pase por datos oficiales.

## Revisión operativa

1. Si un usuario reporta un fallo, solicita su `X-Request-Id` y busca ese valor
   en los logs de la API.
2. Comprueba `/api/health`. En una instancia iniciada con `createRealtimeServer`,
   `realtime.status` debe ser `ready`.
3. Si hay errores de proveedor, mantén el modo demo y revisa cuota, credenciales
   y conectividad antes de reintentar.
4. Investiga cualquier 5xx repetido por ruta y crea un issue con el `requestId`,
   hora, entorno y pasos para reproducirlo.

La plataforma de despliegue sigue siendo responsable de configurar retención de
logs y alertas sobre errores 5xx o una comprobación de salud fallida.
