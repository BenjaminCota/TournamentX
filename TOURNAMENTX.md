# TournamentX — guía definitiva del proyecto

## Propósito

TournamentX es una plataforma web para administrar torneos de esports y deportes: usuarios y roles, equipos y jugadores, inscripciones, brackets, partidos, calendario, estadísticas, sedes, transmisiones y premios.

## Arquitectura

| Componente | Tecnología | Ubicación |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite y Tailwind | `apps/web` |
| API | Node.js, Express, Zod, JWT y Socket.IO | `apps/api` |
| Datos actuales | JSON local persistente | `apps/api/data/tournamentx.local.json` |
| Base opcional | MySQL 8; Supabase se usa de forma opcional | `apps/api/database`, `apps/web/src/services/supabaseRepository.ts` |

La aplicación productiva utiliza la API como fuente principal con `VITE_DATA_SOURCE=api`. No subir archivos `.env`, claves de Stripe, contraseñas, `service_role` de Supabase ni secretos de proveedores a Git.

## Estructura funcional

| Módulo | Frontend | Backend |
| --- | --- | --- |
| Autenticación y administración | `features/auth` | `modules/auth` |
| Torneos y brackets | `features/tournaments` | `modules/tournaments` |
| Equipos y jugadores | `features/teams` | `modules/teams` |
| Calendario y partidos | `features/matches` | `modules/matches` |
| Estadísticas | `features/analytics` | `modules/analytics` |
| Streams y lobbies | `features/media` | `modules/media` |
| Sedes y alertas | `features/geolocation` | `modules/geolocation` |
| Premios y pagos | `features/rewards` | módulos financieros de `apps/api/src` |

Los cambios compartidos se concentran en `apps/web/src/App.tsx`, `apps/web/src/types.ts`, `apps/web/src/services`, `apps/web/src/shared`, `apps/api/src/config` y `apps/api/src/middleware`.

## Desarrollo local

Requisito: Node.js 20 o posterior.

```powershell
npm install
npm run dev:api
npm run dev:web
```

- Web local: `http://localhost:4173`
- API local: `http://localhost:3000`
- Salud: `http://localhost:3000/api/health`
- API docs: `http://localhost:3000/api/docs`

Antes de un commit, ejecutar:

```powershell
npm run check
```

Este comando valida TypeScript del frontend y ejecuta las pruebas de API. Para compilar únicamente el frontend:

```powershell
npm run build
```

## Variables de entorno

La API usa `apps/api/.env`; el frontend local usa `apps/web/.env.local` y producción usa `apps/web/.env.production`.

Variables relevantes de API:

```env
PORT=3038
NODE_ENV=production
JWT_SECRET=<secreto-largo>
WEB_APP_URL=http://2.25.174.243/tournamentx/
SOCKET_CORS_ORIGIN=http://2.25.174.243
STRIPE_MODE=disabled
```

Variables relevantes del frontend para el VPS actual:

```env
VITE_API_URL=http://2.25.174.243/tournamentx/api
VITE_SOCKET_URL=http://2.25.174.243
VITE_DATA_SOURCE=api
VITE_BASE_PATH=/tournamentx/
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

Las variables `VITE_*` se incorporan al navegador: solo pueden contener datos públicos. Para Stripe Test se necesitan `STRIPE_MODE=test`, `STRIPE_PUBLISHABLE_KEY=pk_test_...` y `STRIPE_SECRET_KEY=sk_test_...` únicamente en el `.env` del servidor. Nunca usar claves reales mientras el proyecto esté en pruebas.

## Producción actual

| Elemento | Valor |
| --- | --- |
| URL | `http://2.25.174.243/tournamentx/` |
| VPS | Hostinger, Ubuntu 24.04 |
| Usuario de aplicación | `tournamentx` |
| Código en VPS | `/home/tournamentx/app` |
| Puerto de API | `3038` |
| Proceso | PM2: `tournamentx` |
| Proxy/archivos | Nginx, ruta `/tournamentx/` |
| Repositorio publicado | `https://github.com/BenjaminCota/TournamentX` |

No se utiliza dominio por ahora. Nginx sirve `apps/web/dist`, envía `/tournamentx/api/` a la API y Socket.IO a `127.0.0.1:3038`.

## Flujo de trabajo con GitHub

Cada colaborador trabaja en su rama y abre un pull request hacia `main`. Los cambios que modifiquen contratos, tipos, rutas, datos compartidos o `App.tsx` deben coordinarse con el equipo.

Ejemplo de trabajo local:

```powershell
git checkout -b feat/nombre-del-cambio
# editar y probar
npm run check
git add <archivos>
git commit -m "feat(modulo): descripcion corta"
git push origin feat/nombre-del-cambio
```

Después de integrar el cambio a `main`, se despliega el commit de `main`. No modificar directamente archivos construidos en `apps/web/dist`.

## Despliegue manual al VPS

Ejecutar desde la raíz local, tras confirmar que `main` contiene el cambio y las pruebas pasaron:

```powershell
ssh -o BatchMode=yes -o ConnectTimeout=15 root@2.25.174.243 "sudo -u tournamentx -i git -C /home/tournamentx/app pull --ff-only origin main"
ssh -o BatchMode=yes -o ConnectTimeout=15 root@2.25.174.243 "sudo -u tournamentx -i bash -lc 'cd /home/tournamentx/app && npm run build'"
ssh -o BatchMode=yes -o ConnectTimeout=15 root@2.25.174.243 "sudo -u tournamentx -i pm2 restart tournamentx --update-env"
```

Comprobar después:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri 'http://2.25.174.243/tournamentx/api/health'
Invoke-WebRequest -UseBasicParsing -Uri 'http://2.25.174.243/tournamentx/'
```

Si el cambio solamente afecta al frontend, sigue siendo necesario `npm run build`; si afecta la API, reinicia PM2. No editar Nginx salvo que cambien rutas, puertos o el modo de publicación.

## Operación funcional relevante

- El administrador no se muestra a sí mismo en la lista de Administración.
- El administrador puede dar de baja cualquier torneo no cancelado; se guarda como `CANCELLED` para conservar historial.
- Los jugadores activos en un roster se sincronizan como cuentas tipo `Jugador` al abrir Administración. El admin puede asignar una contraseña temporal desde esa pantalla.
- Los campos de texto y la API validan longitudes para evitar nombres excesivos; los nombres de torneo tienen máximo de 120 caracteres.
- Los buscadores de Administración, Equipos, Jugadores, Plantillas, Partidos y Sedes consideran acentos y mayúsculas/minúsculas.
- El pago Stripe queda deshabilitado hasta que se agreguen claves de prueba válidas en el VPS.

## Mantenimiento y seguridad

- Respaldar regularmente `apps/api/data/tournamentx.local.json` antes de cambios importantes del servidor.
- Consultar el proceso: `sudo -u tournamentx -i pm2 status tournamentx`.
- Consultar registros: `sudo -u tournamentx -i pm2 logs tournamentx --lines 100`.
- Verificar Nginx antes de recargar: `nginx -t`.
- No ejecutar `git reset --hard`, no borrar `/home/tournamentx/app` y no cambiar configuraciones de otros proyectos del VPS.
- Cuando se habilite Stripe, usar exclusivamente credenciales `pk_test_` y `sk_test_` durante pruebas.

## Credenciales iniciales de desarrollo

La cuenta semilla de administrador es:

```text
Correo: admin@tournamentx.local
Contraseña: Admin123!
```

Cambiar o suspender cuentas desde Administración cuando el proyecto se use con personas reales.
