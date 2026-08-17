# Variables de entorno

Esta matriz describe todas las variables consumidas por TournamentX. Los archivos
`.env` están ignorados por Git: parte de los ejemplos versionados y guarda los
valores reales en el gestor de secretos del entorno de despliegue.

## Inicio local

La API se configura desde `apps/api/.env` y el frontend desde `apps/web/.env`.

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
```

Sin ninguna variable, la API usa puerto 3000, almacenamiento JSON local y
proveedores simulados. El frontend usa `http://localhost:3000/api` y
`http://localhost:3000` para sockets.

## API

| Variable | Requerida | Desarrollo/pruebas | Producción y respaldo |
| --- | --- | --- | --- |
| `PORT` | No | `3000`. | Puerto asignado por la plataforma; por defecto `3000`. |
| `NODE_ENV` | No | `development`; las pruebas usan su propio contexto. | `production`. |
| `JWT_SECRET` | Sí en producción | Hay valor de desarrollo para las pruebas. | Secreto aleatorio de alta entropía, nunca el valor por defecto. |
| `SOCKET_CORS_ORIGIN` | Sí en producción | `http://localhost:4173`. | URL exacta del frontend publicado. |
| `DATABASE_URL` | No | Si falta, JSON local; para integración usar una base MySQL no productiva. | URL MySQL gestionada y respaldada; no usar JSON local. |
| `LOCAL_DATA_FILE` | No | Cambia la ruta del JSON local. | No configurarla si MySQL es la fuente de verdad. |
| `RUN_DB_TESTS` | No | `1` habilita pruebas MySQL; requiere `DATABASE_URL` de prueba. | Nunca habilitar en la aplicación desplegada. |
| `PAYMENTS_MODE`, `STRIPE_MODE` | No | `simulated`. | Activar el modo autorizado solo con pruebas y conciliación verificadas. |
| `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Solo Stripe real | Vacías: Stripe usa simulación. | Secretos de Stripe Test/producción según el entorno; validar webhook. |
| `BINANCE_PAY_MODE`, `BINANCE_PAY_BASE_URL`, `BINANCE_PAY_API_KEY`, `BINANCE_PAY_SECRET_KEY`, `BINANCE_PAY_ALLOW_PRODUCTION` | Solo Binance real | `simulated`, producción deshabilitada. | Credenciales merchant aprobadas y `BINANCE_PAY_ALLOW_PRODUCTION=true` únicamente tras autorización financiera. |
| `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_CHANNELS` | No | Sin credenciales se muestra fuente demo; hay canales demo por defecto. | Credenciales de aplicación y lista de canales aprobados. |
| `YOUTUBE_API_KEY`, `YOUTUBE_VIDEO_IDS`, `YOUTUBE_SEARCH_QUERY` | No | Sin clave se muestra demo. | Clave restringida por API/referrer y límites de cuota supervisados. |
| `PANDASCORE_API_TOKEN`, `FOOTBALL_DATA_API_KEY`, `FOOTBALL_COMPETITIONS` | No | Sin tokens se usa feed demo. | Tokens con cuota y competiciones permitidas explícitas. |
| `RUN_STRIPE_TESTS` | No | `1` ejecuta integración Stripe Test. | Solo en CI/entorno de pruebas, nunca contra cobros reales. |

## Frontend (Vite)

Las variables `VITE_*` se incluyen en el navegador. No coloques secretos en ellas.

| Variable | Requerida | Desarrollo/pruebas | Producción y respaldo |
| --- | --- | --- | --- |
| `VITE_API_URL` | No | `http://localhost:3000/api`. | URL HTTPS pública de la API. |
| `VITE_SOCKET_URL` | No | `http://localhost:3000`. | Origen HTTPS/WSS que sirve Socket.IO. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | No | Vacías: Supabase queda deshabilitado. | URL del proyecto y clave publishable/anon; nunca `service_role`. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Solo Stripe web real | Vacía: el flujo local conserva modo simulado. | Clave publishable del entorno Stripe correspondiente. |
| `VITE_MATCH_TOKEN` | No | Útil para pruebas manuales de marcador. | No configurarla; las sesiones autenticadas deben emitir el token. |

## Verificación antes de desplegar

1. Confirma que ningún `.env` ni clave privada esté incluido en el commit.
2. Ejecuta `npm run check` y `npm run build` con variables no secretas de prueba.
3. Consulta `/api/health`: debe reportar `mysql` cuando `DATABASE_URL` sea la
   fuente configurada para el entorno compartido.
4. En producción, rechaza el despliegue si `JWT_SECRET` conserva el valor de
   desarrollo, si CORS permite un origen no esperado o si una clave secreta se
   intenta pasar mediante `VITE_*`.
