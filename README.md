# TournamentX

Plataforma web para la gestión integral de torneos deportivos y competencias de esports. TournamentX centraliza la administración de participantes, formatos de competencia, calendarios, resultados en vivo, estadísticas, transmisiones y recompensas.

## Objetivo

Construir una plataforma híbrida que cubra tanto deportes tradicionales —como fútbol, básquetbol y voleibol— como esports —Valorant, League of Legends, Rocket League, EA FC, Free Fire y Roblox—.

## Módulos de trabajo

| Integrante | Módulo | Rama |
| --- | --- | --- |
| Dev 1 | Core y autenticación | `dev-1/core-auth` |
| Dev 2 | Motor de torneos y brackets | `dev-2/tournament-brackets` |
| Dev 3 | Gestión de equipos y jugadores | `dev-3/teams-players` |
| Dev 4 | Calendario y partidos en vivo | `dev-4/schedule-live` |
| Dev 5 | Estadísticas y dashboard analítico | `dev-5/analytics-dashboard` |
| Dev 6 | Esports e integración media | `dev-6/esports-media` |
| Dev 7 | Geolocalización y notificaciones | `dev-7/geolocation-notifications` |
| Dev 8 | Recompensas y pasarela dual | `dev-8/rewards-payments` |

El alcance exacto y el flujo de colaboración se encuentran en [docs/TEAM_WORKFLOW.md](docs/TEAM_WORKFLOW.md).

## Flujo Git

1. Trabajar únicamente en la rama asignada.
2. Mantener los commits pequeños y descriptivos.
3. Sincronizar los cambios recientes de `main` antes de abrir un pull request.
4. Abrir un pull request hacia `main` y solicitar revisión.
5. No subir secretos, credenciales ni archivos `.env`.

## Backend Dev 8 — Premios y pagos

Esta rama contiene una API REST en JavaScript para administrar patrocinadores, bolsas de premios, aportaciones, distribuciones y recibos. Stripe y Binance Pay operan de forma simulada durante el MVP; no se requieren claves reales.

### Requisitos

- Node.js 20 o posterior.
- MySQL 8 o posterior.

### Instalación

```bash
npm install
copy .env.example .env
npm run db:init
npm run dev
```

Antes de inicializar, crea en MySQL la base indicada en `DATABASE_URL`. Por ejemplo: `CREATE DATABASE tournamentx;`. Después ejecuta `npm run db:init`. La API estará disponible en `http://localhost:3000`.

### Autenticación

Las rutas administrativas reciben un JWT mediante `Authorization: Bearer TOKEN`. El token debe incluir:

```json
{
  "sub": "uuid-del-usuario",
  "role": "admin"
}
```

Los roles autorizados para modificar premios son `admin` y `organizer`. La clave para verificar el token se configura con `JWT_SECRET` y deberá coincidir con la del módulo de autenticación de Dev 1.

### Endpoints

| Método | Ruta | Descripción | Acceso |
| --- | --- | --- | --- |
| GET | `/api/health` | Estado de la API | Público |
| GET | `/api/sponsors` | Lista patrocinadores | JWT |
| POST | `/api/sponsors` | Crea un patrocinador | Admin/Organizador |
| GET | `/api/prize-pools` | Lista bolsas | JWT |
| POST | `/api/prize-pools` | Crea una bolsa | Admin/Organizador |
| GET | `/api/prize-pools/:id` | Detalle y aportaciones | JWT |
| POST | `/api/prize-pools/:id/contributions` | Simula un fondeo | Admin/Organizador |
| PUT | `/api/prize-pools/:id/distribution` | Define porcentajes | Admin/Organizador |
| POST | `/api/prize-pools/:id/payouts` | Libera un premio y genera recibo | Admin/Organizador |
| GET | `/api/receipts/:code` | Verifica un recibo | Público |

Ejemplo de distribución:

```json
{
  "rules": [
    { "position": 1, "percentage": 50 },
    { "position": 2, "percentage": 30 },
    { "position": 3, "percentage": 20 }
  ]
}
```

### Pruebas

```bash
npm test
```

### Estado

Backend inicial del módulo Dev 8 preparado para integrarse con autenticación, torneos y equipos.
