# TournamentX

TournamentX es una plataforma para administrar torneos de deportes tradicionales y esports. Este repositorio contiene la aplicación web, la API y el esquema MySQL en un monorepo compartido.

## Tecnologías

- Web: React 19, TypeScript, Vite, Tailwind CSS y Leaflet.
- API: Node.js, Express, Zod y JWT.
- Persistencia local automática en JSON y esquema MySQL 8 opcional.
- Tiempo real: Socket.IO para marcadores, alertas y lobbies.
- Pagos: flujo local completo y adaptadores opcionales de Stripe/Binance Pay.

No existe una integración de inteligencia artificial ni se cargan recursos de fuentes externas para la tipografía.

## Estructura

```text
project-torneo/
├── apps/
│   ├── api/
│   │   ├── database/schema.sql       Esquema MySQL
│   │   ├── public/                   Página básica de la API
│   │   ├── src/
│   │   │   ├── config/               Entorno y conexión MySQL
│   │   │   ├── controllers/          Casos de uso del módulo 8
│   │   │   ├── docs/                 Especificación OpenAPI
│   │   │   ├── middleware/           JWT, validación y errores
│   │   │   ├── modules/              Espacio de los ocho módulos
│   │   │   ├── routes/               Rutas Express
│   │   │   ├── services/             Pagos y cálculo de premios
│   │   │   ├── validators/           Esquemas Zod
│   │   │   ├── app.js                Aplicación Express
│   │   │   └── server.js             Arranque de la API
│   │   └── test/                      Pruebas unitarias e integración
│   └── web/
│       ├── src/
│       │   ├── data/                  Datos temporales de presentación
│       │   ├── features/              Pantallas agrupadas por dominio
│       │   ├── services/              Cliente HTTP
│       │   ├── shared/                Componentes compartidos
│       │   ├── App.tsx                Composición y navegación
│       │   └── types.ts               Tipos comunes actuales
│       └── package.json
├── docs/
│   ├── DEV8_API.md                    Contrato del módulo de premios
│   ├── MODULE_OWNERSHIP.md            Responsables y rutas de trabajo
│   └── TEAM_WORKFLOW.md               Flujo de Git del equipo
├── package.json                       Comandos del monorepo
└── package-lock.json                  Versiones únicas de dependencias
```

## Distribución de trabajo

| Dev | Responsabilidad | Frontend | Backend |
| --- | --- | --- | --- |
| 1 | Core y autenticación | `features/auth` | `modules/auth` |
| 2 | Torneos y brackets | `features/tournaments` | `modules/tournaments` |
| 3 | Equipos y jugadores | `features/teams` | `modules/teams` |
| 4 | Calendario y partidos | `features/matches` | `modules/matches` |
| 5 | Estadísticas y dashboard | `features/analytics` | `modules/analytics` |
| 6 | Esports y medios | `features/media` | `modules/media` |
| 7 | Sedes y notificaciones | `features/geolocation` | `modules/geolocation` |
| 8 | Premios, patrocinadores y pagos | `features/rewards` | API de premios existente |

Las rutas de frontend parten de `apps/web/src/` y las de backend de `apps/api/src/`.

## Instalación

Requisito: Node.js 20 o posterior. MySQL 8 es opcional.

```bash
npm install
```

La aplicación inicia sin archivo `.env`. Para personalizarla, crea la configuración local de la API:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

Ejemplo seguro:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=replace-with-a-long-random-secret
PAYMENTS_MODE=simulated
```

No se deben subir archivos `.env`, contraseñas ni llaves privadas.

## Persistencia local y MySQL opcional

Sin `DATABASE_URL`, TournamentX guarda la información en `apps/api/data/tournamentx.local.json`.

Para utilizar MySQL, crea una base llamada `tournamentx`, configura `DATABASE_URL` y ejecuta:

Crea primero una base llamada `tournamentx` y ejecuta:

```bash
npm run db:init
```

El comando utiliza `apps/api/database/schema.sql` y puede ejecutarse nuevamente sin borrar los datos existentes.

## Ejecutar localmente

Abre dos terminales desde la raíz.

Terminal 1:

```bash
npm run dev:api
```

Terminal 2:

```bash
npm run dev:web
```

- Aplicación: `http://localhost:4173`
- API: `http://localhost:3000`
- Estado: `http://localhost:3000/api/health`
- Documentación: `http://localhost:3000/api/docs`

## Stripe y Binance Pay

Los dos proveedores funcionan como simulaciones del MVP:

- Stripe genera referencias con prefijo `pi_test_`.
- Binance Pay genera referencias con prefijo `bp_test_`.
- Las aportaciones empiezan en estado `pending`.
- Un administrador u organizador puede aprobar, rechazar o reembolsar la operación.
- Las transiciones se guardan en `payment_events`.
- No se contactan servicios externos ni se mueve dinero.

Debe mantenerse:

```env
PAYMENTS_MODE=simulated
```

Las credenciales reales no son necesarias para este proyecto.

## Comandos

```bash
npm run dev:web       # frontend en el puerto 4173
npm run dev:api       # API en el puerto 3000
npm run db:init       # crea o actualiza el esquema local
npm run check         # TypeScript y pruebas de API
npm run build         # build de producción del frontend
npm test              # pruebas del backend
```

Prueba completa con MySQL:

```powershell
$env:RUN_DB_TESTS='1'; npm test
```

## Forma de trabajo

1. Trabaja únicamente en la rama asignada.
2. Modifica primero la carpeta de tu módulo.
3. Coordina cambios en `App.tsx`, `shared`, `config`, `middleware`, contratos o SQL.
4. Ejecuta `npm run check` antes de crear un commit.
5. Describe en el pull request las rutas, tablas o eventos modificados.
6. No mezcles ajustes visuales de otros módulos sin avisar a su responsable.
7. Nunca subas secretos o dependencias instaladas.

Formato de commits recomendado:

```text
feat(rewards): registrar aportación simulada
fix(matches): corregir actualización del marcador
docs(core): documentar contrato de autenticación
```

## Estado actual

Los ocho módulos cuentan con una ruta funcional local: autenticación y roles, torneos/brackets, equipos/rosters, calendario en vivo, analítica calculada, streams/lobbies, sedes/notificaciones y premios/pagos. Consulta `docs/GUIA_LOCAL_COMPLETA.md` para cuentas de prueba, proveedores opcionales y reinicio de datos.
