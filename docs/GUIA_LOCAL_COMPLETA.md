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
STRIPE_MODE=simulated
BINANCE_PAY_MODE=simulated
```

Sin claves, Twitch, YouTube, Stripe y Binance Pay continúan funcionando en modo local simulado. El modo de producción de Binance permanece bloqueado salvo configuración explícita.

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
