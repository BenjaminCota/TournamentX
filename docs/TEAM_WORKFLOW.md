# Organización del equipo

## Dev 1 — Core y autenticación

**Rama:** `dev-1/core-auth`

**Alcance de dos días:** gestión de usuarios; roles de Admin, Organizador, Capitán y Jugador; esquema inicial de base de datos; API Gateway/Router.

## Dev 2 — Motor de torneos y brackets

**Rama:** `dev-2/tournament-brackets`

**Alcance de dos días:** creación de torneos; brackets de fase de grupos y eliminación directa; avance de rondas.

## Dev 3 — Gestión de equipos y jugadores

**Rama:** `dev-3/teams-players`

**Alcance de dos días:** registro de equipos; asignación de plantillas; perfiles de jugador; historial básico.

## Dev 4 — Calendario y partidos en vivo

**Rama:** `dev-4/schedule-live`

**Alcance de dos días:** programación automática de partidos; captura de resultados en tiempo real; actualización de marcadores.

## Dev 5 — Estadísticas y dashboard analítico

**Rama:** `dev-5/analytics-dashboard`

**Alcance de dos días:** tablas de posiciones instantáneas; rankings; métricas de rendimiento; panel analítico.

## Dev 6 — Esports e integración media

**Rama:** `dev-6/esports-media`

**Alcance de dos días:** integración de streams mediante Twitch/YouTube API; gestión de lobbies o salas virtuales; métricas por videojuego.

## Dev 7 — Geolocalización y notificaciones

**Rama:** `dev-7/geolocation-notifications`

**Alcance de dos días:** mapa de sedes mediante Leaflet/Mapbox; búsqueda de torneos cercanos; alertas y notificaciones en tiempo real mediante WebSockets.

## Dev 8 — Recompensas y Stripe

**Rama:** `dev-8/rewards-payments`

**Alcance de dos días:** patrocinadores, bolsas de premios e integración de Stripe para pagos.

## Convención de trabajo

- Cada integrante desarrolla en su rama asignada y abre pull requests hacia `main`.
- Los pull requests deben indicar módulo, cambio realizado, pruebas y posibles riesgos.
- Los cambios que afecten contratos compartidos —esquema de datos, rutas, eventos o tipos— deben coordinarse con Dev 1.
- Ningún secreto debe registrarse en Git. Utilizar variables de entorno y mantener un `.env.example` sin valores sensibles.
- Los merges a `main` requieren al menos una revisión del equipo.

## Convención de commits

Usar mensajes con el formato `tipo(área): descripción`, por ejemplo:

```text
feat(brackets): generar primera ronda de eliminación
fix(auth): validar expiración del token
docs(teams): documentar alta de jugadores
```

Tipos sugeridos: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.
