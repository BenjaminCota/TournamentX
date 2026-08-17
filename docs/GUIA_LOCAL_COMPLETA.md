# Guía local de TournamentX

La plataforma funciona por defecto sin MySQL ni credenciales externas. La API crea una base JSON local en `apps/api/data/tournamentx.local.json`; el archivo está excluido de Git.

## Inicio rápido

Desde la raíz del proyecto:

```powershell
npm install
npm run dev:api
```

En otra terminal:

```powershell
npm run dev:web
```

Abre `http://localhost:4173`. La API utiliza `http://localhost:3000`.

## Cuentas locales

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@tournamentx.local` | `Admin123!` |
| Organizador | `organizer@tournamentx.local` | `Organizer123!` |
| Capitán | `captain@tournamentx.local` | `Captain123!` |
| Jugador | `player@tournamentx.local` | `Player123!` |

Las cuentas nuevas se crean con rol Espectador. Solo el administrador puede cambiar roles y suspender cuentas desde **Más → Usuarios y roles**.

## Persistencia

- Sin `DATABASE_URL`: almacenamiento JSON local automático.
- Con `DATABASE_URL`: partidos, calendario y pagos pueden utilizar MySQL.
- `npm run db:init` aplica `apps/api/database/schema.sql` sin eliminar información existente.

Para reiniciar exclusivamente los datos locales, detén la API y mueve `apps/api/data/tournamentx.local.json` a otra ubicación. Al iniciar nuevamente se generan datos de demostración limpios.

## Integraciones opcionales

En `apps/api/.env`:

```env
JWT_SECRET=una-clave-local-larga-y-unica
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
YOUTUBE_API_KEY=
TWITCH_CHANNELS=lolesportsla,cblol,valorant_la,lcs,valorant_americas,lec,valorant,rocketleague,eslcs
YOUTUBE_VIDEO_IDS=6VOfpE_HGpw
YOUTUBE_SEARCH_QUERY=esports tournament gaming
PANDASCORE_API_TOKEN=
FOOTBALL_DATA_API_KEY=
FOOTBALL_COMPETITIONS=PL,CL,BSA,MLS
STRIPE_MODE=simulated
BINANCE_PAY_MODE=simulated
```

Sin claves, Twitch, YouTube, Stripe y Binance Pay continúan funcionando en modo local simulado. El modo de producción de Binance permanece bloqueado salvo configuración explícita.

### Centro de transmisión

En **Más → Transmisiones** se cargan los reproductores oficiales de Twitch y YouTube. Los controles propios permiten reproducir, pausar, cambiar volumen, silenciar, buscar ±10 segundos y entrar a pantalla completa. Twitch no admite búsqueda temporal en señales en vivo; sí la admite en VOD.

- `TWITCH_CLIENT_ID` y `TWITCH_CLIENT_SECRET` activan la consulta de directos mediante Twitch Helix.
- `YOUTUBE_API_KEY` activa la búsqueda de directos y el conteo concurrente mediante YouTube Data API v3.
- `TWITCH_CHANNELS` acepta canales separados por comas, por ejemplo `lolesportsla,valorant`.
- `YOUTUBE_VIDEO_IDS` acepta IDs separados por comas. Para una URL como `youtube.com/live/6VOfpE_HGpw`, el ID es `6VOfpE_HGpw`.
- `YOUTUBE_SEARCH_QUERY` controla la búsqueda automática de otros directos gaming cuando la API está configurada.
- Sin credenciales, los canales e IDs anteriores siguen funcionando como enlaces directos embebidos; con credenciales también se actualizan título, estado y espectadores.
- Los marcadores de LoL Worlds, Valorant Champions, The International, Champions League, NBA y UFC están etiquetados como simulación dinámica; no se presentan como resultados oficiales en tiempo real.

La API local expone `GET /api/media/streams`, `GET /api/media/events`, `GET /api/media/lobbies` y `GET /api/media/metrics`.

### Datos para Partidos, Equipos y Estadísticas

`GET /api/competitive/overview` reúne un contrato único con eventos, clasificaciones, forma reciente, equipos y plantillas. Las pantallas **Partidos**, **Equipos** y **Estadísticas** consumen este endpoint; **Transmisiones** se limita a administrar las señales oficiales y mostrar contexto del directo.

- `PANDASCORE_API_TOKEN` activa partidos, torneos, equipos y jugadores de League of Legends, Valorant, Dota 2 y otros esports.
- `FOOTBALL_DATA_API_KEY` activa calendarios, resultados, tablas, forma y plantillas de fútbol.
- `FOOTBALL_COMPETITIONS` recibe códigos separados por comas; el ejemplo incluye Premier League, Champions League, Brasileirão y MLS.
- Sin credenciales se muestran datos regionales de demostración para LATAM, Estados Unidos y Europa, siempre marcados como `DEMO`.

Nunca coloques estas llaves en `apps/web/.env`: deben permanecer exclusivamente en `apps/api/.env`.

## Validación

```powershell
npm run check
npm run build
```

`npm run check` ejecuta TypeScript y las pruebas de API. Las pruebas marcadas como omitidas corresponden únicamente a servicios externos opcionales (MySQL y Stripe Test real).

## Seguridad local

- Las contraseñas se derivan con `scrypt`; nunca se devuelve su hash en la API.
- Los tokens vencen a las ocho horas.
- Los roles provienen de la sesión firmada, no de un selector del navegador.
- Operaciones financieras, administración de usuarios y lobbies requieren sesión y rol autorizado.
- No guardes `.env` ni credenciales en Git.
