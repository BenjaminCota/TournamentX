# Dev 4 — Calendario y partidos en vivo

## Alcance del módulo

- Frontend: `apps/web/src/features/matches`
- Backend: `apps/api/src/modules/matches`
- Contrato HTTP común: `apps/web/src/services/apiClient.ts`

## Pendientes por entrega

- [x] **1. Contrato de partidos.** Definir las entidades `Match`, `Schedule`,
  marcador, estados y filtros; acordar los IDs de torneo y equipo con Dev 2 y
  Dev 3.
- [x] **2. API base de partidos.** Crear el módulo `matches` con rutas para
  consultar, crear y obtener partidos; añadir validación, errores y pruebas.
- [x] **3. Calendarios y programación.** Crear calendarios y generar la agenda
  inicial a partir de equipos, fechas, sedes y formato proporcionados por
  torneos.
- [x] **4. Persistencia MySQL.** Incorporar tablas e índices de calendarios y
  partidos al esquema compartido, tras coordinar el cambio con el equipo.
  Verificación pendiente: ejecutar `npm run db:init` con un `DATABASE_URL`
  válido en el entorno MySQL compartido.
- [x] **5. Marcador y resultado.** Implementar la actualización autorizada de
  resultados y las transiciones `scheduled → live → completed`.
- [x] **6. Integración visual.** Sustituir los datos mock de `CalendarView` y
  `LiveMatchView` por el cliente HTTP, incluyendo carga, vacío y error.
- [x] **7. Tiempo real.** Acordar eventos y añadir Socket.IO para emitir y
  consumir cambios de marcador; notificar los módulos de analítica y alertas.
- [x] **8. Cierre.** Pruebas de API y frontend, documentación de endpoints y
  guía de integración para el pull request.

## Estado final

Módulo listo para revisión. Consultar `docs/DEV4_PULL_REQUEST.md` antes de
abrir el pull request.
