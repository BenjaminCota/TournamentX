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

## Estado

Repositorio inicial preparado para el desarrollo colaborativo del MVP.

## Módulo Dev 6 — Esports & Media

La rama `dev-6/esports-media` incluye un panel web funcional para:

- visualizar y filtrar transmisiones de Twitch y YouTube;
- buscar torneos, canales y videojuegos;
- crear y administrar lobbies competitivos;
- copiar códigos de acceso para equipos;
- consultar audiencia, retención y métricas por videojuego;
- operar en escritorio, tablet y móvil con la identidad rosa, negra y blanca de TournamentX.

### Ejecución local

```powershell
npm install
npm run dev
```

La interfaz funciona con información demostrativa. Para conectar datos reales se deben configurar las variables descritas en `.env.example` con credenciales de Twitch Developer y YouTube Data API v3.
