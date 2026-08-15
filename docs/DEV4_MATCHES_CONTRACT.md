# Contrato de integración — Calendario y partidos (Dev 4)

**Estado:** propuesto para la primera entrega del módulo.

## Convenciones

- Prefijo actual de la API: `/api`.
- Los identificadores son cadenas opacas. No se deben inferir a partir del
  nombre de un equipo o torneo.
- Las fechas se intercambian en formato ISO 8601 UTC.
- Un partido pertenece a un torneo y puede pertenecer a un calendario.

## Entidades

### Schedule

```json
{
  "id": "schedule-01",
  "tournamentId": "tour-1",
  "startsAt": "2026-08-20T18:00:00.000Z",
  "endsAt": "2026-08-27T23:00:00.000Z",
  "status": "draft",
  "createdAt": "2026-08-15T18:00:00.000Z",
  "updatedAt": "2026-08-15T18:00:00.000Z"
}
```

Estados permitidos: `draft`, `published`, `completed`, `cancelled`.

### Match

```json
{
  "id": "match-201",
  "scheduleId": "schedule-01",
  "tournamentId": "tour-1",
  "roundId": "round-2",
  "team1Id": "team-lnx",
  "team2Id": "team-titans",
  "scheduledAt": "2026-08-20T18:00:00.000Z",
  "venue": "Arena CDMX",
  "mode": "best_of_3",
  "status": "scheduled",
  "score": { "team1": 0, "team2": 0 },
  "streamUrl": null,
  "createdAt": "2026-08-15T18:00:00.000Z",
  "updatedAt": "2026-08-15T18:00:00.000Z"
}
```

Estados permitidos: `scheduled`, `live`, `completed`, `postponed`,
`cancelled`. Las transiciones válidas son:

```text
scheduled → live → completed
scheduled → postponed → scheduled
scheduled | postponed → cancelled
```

## Endpoints iniciales

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/api/matches` | Lista y filtra por `tournamentId`, `scheduleId`, `status`, `from` y `to`. |
| `GET` | `/api/matches/:id` | Obtiene el detalle de un partido. |
| `POST` | `/api/matches` | Crea un partido programado. |
| `PATCH` | `/api/matches/:id/score` | Actualiza marcador y/o estado; requiere rol de Admin, Organizador o Árbitro cuando auth esté integrada. |
| `GET` | `/api/schedules/:id` | Obtiene un calendario y sus partidos. |
| `GET` | `/api/schedules` | Lista calendarios, opcionalmente por `tournamentId`. |
| `POST` | `/api/schedules` | Crea el calendario y genera la agenda inicial. |

El generador actual acepta `round_robin` y `single_elimination`, recibe los
equipos en orden, y asigna bloques consecutivos de `slotMinutes`. Los eventos
Socket.IO pertenecen a una entrega posterior.

## Dependencias y acuerdos necesarios

| Módulo | Contrato requerido | Situación |
| --- | --- | --- |
| Dev 2 — Torneos | `tournamentId`, `roundId`, formato y equipos participantes. | Pendiente: el módulo API aún no existe. |
| Dev 3 — Equipos | `teamId` y consulta `GET /api/teams/:id`. | Disponible; IDs actuales de ejemplo: `team-lnx`, `team-titans`. |
| Dev 5 — Analítica | Evento/resultados de partidos completados. | Pendiente para la entrega de tiempo real. |
| Dev 6 — Media | `streamUrl` y asociación de lobby. | Opcional en la primera API. |
| Dev 7 — Notificaciones | Evento de inicio, cambio de marcador y finalización. | Pendiente para Socket.IO. |
| Dev 8 — Premios | Resultado final verificable por torneo. | Pendiente para el cierre del torneo. |

## Criterios de aceptación de la primera entrega

1. Los endpoints listados devuelven JSON consistente y errores 404 para IDs
   inexistentes.
2. Un partido no acepta el mismo equipo en ambos lados.
3. La creación exige `tournamentId`, dos equipos distintos y `scheduledAt`.
4. La pantalla de calendario puede mapear el resultado sin depender de nombres
   codificados.
