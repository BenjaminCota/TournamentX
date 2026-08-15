# Pull request — Dev 4: calendario y partidos en vivo

## Título sugerido

`feat(matches): implementar calendario, marcadores y actualizaciones en vivo`

## Resumen

- API de partidos y calendarios con validación, filtros y generación inicial.
- Persistencia MySQL para `schedules` y `matches`, con respaldo temporal local.
- Actualización protegida de marcadores y transiciones de estado.
- Vista de calendario y marcador conectadas a la API.
- Eventos Socket.IO por sala de partido (`match:<id>`).

## Pruebas realizadas

- `npm test`: pruebas de API, transición de marcador y emisión Socket.IO.
- `npm run build`: compilación del frontend Vite.
- Handshake local de Socket.IO verificado en `/socket.io`.

## Integraciones que debe revisar el equipo

- Dev 1: reemplazar el JWT temporal de desarrollo por autenticación real.
- Dev 2: proporcionar torneos, rondas y equipos participantes para generar agendas.
- Dev 3: confirmar que los IDs de equipos definitivos coincidan con `team1Id` y `team2Id`.
- Dev 5 y Dev 7: consumir `match-update` para analítica y notificaciones.
- Dev 8: consumir resultados de partidos finalizados al distribuir premios.

## Riesgos conocidos

- Falta ejecutar `npm run db:init` contra el MySQL compartido con un
  `DATABASE_URL` válido.
- `npm run check` tiene errores TypeScript previos en módulos fuera de Dev 4;
  la compilación de producción del frontend sí pasa.
