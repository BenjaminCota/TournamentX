# Despliegue mínimo en VPS

TournamentX mantiene separados el frontend Vite y la API Express. En producción deben publicarse detrás de HTTPS; Nginx puede servir `apps/web/dist` y redirigir `/api` y Socket.IO al proceso Node.

## 1. Preparar el artefacto

```bash
npm ci
npm test
npm run build
```

Ejecuta la API con un supervisor como systemd o PM2. No ejecutes el servidor de desarrollo de Vite en producción.

## 2. Variables de la API

Copia `apps/api/.env.example` a `apps/api/.env` en el servidor. Genera secretos distintos y largos para `JWT_SECRET`, `LOBBY_ENCRYPTION_KEY` y `PRIVATE_ASSET_SIGNING_KEY`. Ajusta:

- `WEB_APP_URL=https://tu-dominio`
- `SOCKET_CORS_ORIGIN=https://tu-dominio`
- `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`
- `TWITCH_CLIENT_ID` y `TWITCH_CLIENT_SECRET` para detectar cuáles de los cinco canales están en vivo.
- `YOUTUBE_API_KEY` para resolver los cinco canales oficiales y encontrar su live actual.
- `STRIPE_MODE=disabled` hasta que el responsable agregue credenciales. Después puede cambiarse a `test` y, tras validar webhooks, a `live`.

Nunca subas `.env`, service-role keys de Supabase, secretos de Twitch, YouTube ni Stripe al repositorio.

## 3. Variables del frontend

Antes de compilar, crea `apps/web/.env.production`:

```env
VITE_API_URL=https://tu-dominio/api
VITE_SOCKET_URL=https://tu-dominio
VITE_DATA_SOURCE=api
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_STRIPE_PUBLISHABLE_KEY=
```

La clave publicable de Supabase puede estar en el navegador; una `service_role` nunca debe estarlo.

## 4. Datos y archivos

El modo entregable persiste en `apps/api/data/tournamentx.local.json` y guarda evidencias privadas en `apps/api/data/private-assets`. En el VPS monta `apps/api/data` en un volumen con copias de seguridad y permisos exclusivos del usuario de Node. Para más de una instancia, migra ambas cosas a Supabase/Postgres y Storage privado.

## 5. Comprobación

Verifica `GET https://tu-dominio/api/health`, registro/inicio de sesión, creación de equipo, inscripción, calendario, check-in, doble reporte, disputa, aprobación y actualización de bracket. Confirma también que un lobby no exponga su contraseña en `GET /api/media/lobbies`.
