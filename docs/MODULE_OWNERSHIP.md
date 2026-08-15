# Propiedad de módulos

Cada cambio funcional debe permanecer dentro de la carpeta del módulo correspondiente. Los cambios en carpetas compartidas, contratos o base de datos deben coordinarse antes de fusionarse.

| Dev | Dominio | Frontend | Backend sugerido |
| --- | --- | --- | --- |
| 1 | Core y autenticación | `apps/web/src/features/auth` | `apps/api/src/modules/auth` |
| 2 | Torneos y brackets | `apps/web/src/features/tournaments` | `apps/api/src/modules/tournaments` |
| 3 | Equipos y jugadores | `apps/web/src/features/teams` | `apps/api/src/modules/teams` |
| 4 | Calendario y partidos | `apps/web/src/features/matches` | `apps/api/src/modules/matches` |
| 5 | Estadísticas y dashboard | `apps/web/src/features/analytics` | `apps/api/src/modules/analytics` |
| 6 | Esports y media | `apps/web/src/features/media` | `apps/api/src/modules/media` |
| 7 | Sedes y notificaciones | `apps/web/src/features/geolocation` | `apps/api/src/modules/geolocation` |
| 8 | Premios y pagos | `apps/web/src/features/rewards` | API existente en `apps/api/src` |

## Carpetas compartidas

- `apps/web/src/shared`: componentes visuales reutilizables.
- `apps/web/src/services`: cliente HTTP y servicios comunes.
- `apps/web/src/data`: datos temporales de desarrollo.
- `apps/api/src/config`: conexión y configuración del servidor.
- `apps/api/src/middleware`: autenticación, validación y errores.
- `apps/api/database`: esquema SQL versionado.
- `docs`: contratos y decisiones compartidas.

No deben guardarse llaves, contraseñas ni archivos `.env` en Git.
