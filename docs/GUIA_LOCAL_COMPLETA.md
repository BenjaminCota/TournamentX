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

- Con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`: el registro y el inicio de sesión utilizan Supabase Auth.
- Por defecto, la API local coordina equipos, jugadores, torneos, brackets, calendarios, resultados, notificaciones y premios en una sola fuente de datos. Esta es la configuración recomendada para demostrar el flujo completo.
- `VITE_DATA_SOURCE=supabase-direct` conserva el modo directo anterior para los módulos compatibles. No se recomienda mezclarlo con el flujo local mientras Supabase no contenga todos los datos relacionados.
- Sin Supabase: autenticación y almacenamiento JSON local automáticos.
- Con `DATABASE_URL`: partidos, calendario y pagos pueden utilizar MySQL.
- `npm run db:init` aplica `apps/api/database/schema.sql` sin eliminar información existente.

Para reiniciar exclusivamente los datos locales, detén la API y mueve `apps/api/data/tournamentx.local.json` a otra ubicación. Al iniciar nuevamente se genera el catálogo operativo inicial de TournamentX.

### Supabase conectado

El proyecto remoto activo es `fhjaqzexiwgjkvqvnydm`. La configuración real de esta computadora está en `apps/web/.env.local`, que Git ignora; `apps/web/.env.example` solo conserva marcadores seguros para compartir.

Las migraciones reproducibles están en `supabase/migrations/` e incluyen el esquema, datos iniciales, Row Level Security, Realtime, funciones administrativas y el bucket privado `tournamentx-media`. No vuelvas a pegar la llave `service_role` en el frontend: el navegador únicamente debe utilizar la llave publicable.

La primera cuenta creada en un proyecto vacío recibe el rol Administrador; las siguientes nacen como Jugador. Si la confirmación de correo está habilitada en Supabase, hay que confirmar el mensaje antes de iniciar sesión. Los accesos terminados en `.local` son cuentas internas de desarrollo emitidas por la API y no representan usuarios de Supabase.

El motor probado de grupos, brackets y calendarios continúa ejecutándose en la API local. La API también acepta el token de Supabase y crea una identidad local vinculada para aplicar los mismos permisos sin duplicar el inicio de sesión. Por eso deben estar encendidas tanto la API (`npm run dev:api`) como la web (`npm run dev:web`).

## Flujo principal entregable

Inicia sesión como Administrador u Organizador y sigue este recorrido:

1. En **Equipos**, crea al menos dos equipos y completa sus jugadores/plantillas.
2. En **Torneos**, crea o selecciona un torneo.
3. Inscribe los equipos desde el selector de participantes. El formulario guarda el ID real del equipo, no solo su nombre.
4. Genera el bracket o los grupos según el formato del torneo.
5. En el panel **Flujo principal**, define fecha, sede y modalidad y pulsa **Programar partidos**.
6. Abre **Partidos**, realiza el check-in cuando corresponda y captura/aprueba el resultado.
7. Consulta el avance en **Torneos**, las métricas en **Estadísticas** y las alertas en **Notificaciones**. Al terminar la final, el campeón puede conectarse con el flujo de premios.

Cada paso muestra el siguiente pendiente y reutiliza los módulos existentes; no es necesario volver a capturar equipos o torneos en pantallas separadas.

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
STRIPE_MODE=test
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Sin claves, Twitch y YouTube conservan enlaces curados a canales o grabaciones oficiales. Los pagos
Stripe permanecen deshabilitados y no generan operaciones ficticias.

### Centro de transmisión

En **Partidos → Transmisiones** se cargan los reproductores oficiales de Twitch y YouTube. Los controles propios permiten reproducir, pausar, cambiar volumen, silenciar, buscar ±10 segundos y entrar a pantalla completa. Twitch no admite búsqueda temporal en señales en vivo; sí la admite en VOD.

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
- Sin credenciales se muestran únicamente encuentros y resultados registrados en TournamentX; la integración externa aparece como `not_configured`.

Nunca coloques estas llaves en `apps/web/.env`: deben permanecer exclusivamente en `apps/api/.env`.

## Validación

```powershell
npm run check
npm run build
```

`npm run check` ejecuta TypeScript y las pruebas de API. Las pruebas marcadas como omitidas corresponden únicamente a servicios externos opcionales (MySQL y Stripe Test real).

### Validación MySQL de integración

Cuando el integrador proporcione una `DATABASE_URL` de **pruebas** (nunca de
producción), ejecuta desde la raíz:

```powershell
$env:DATABASE_URL = 'mysql://usuario:contrasena@host:3306/tournamentx_test'
npm run test:db --workspace @tournamentx/api
```

El comando aplica el esquema idempotente y ejecuta por separado los flujos de
persistencia y de premios/pagos. Las pruebas crean datos temporales y los limpian
al finalizar. No configura ni muestra credenciales.

## Seguridad local

- Las contraseñas se derivan con `scrypt`; nunca se devuelve su hash en la API.
- Los tokens vencen a las ocho horas.
- Los roles provienen de la sesión firmada, no de un selector del navegador.
- Operaciones financieras, administración de usuarios y lobbies requieren sesión y rol autorizado.
- No guardes `.env` ni credenciales en Git.
