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

Esta rama contiene una API REST en JavaScript para administrar patrocinadores, bolsas de premios, aportaciones, distribuciones, premios en especie y recibos. Stripe y Binance Pay operan exclusivamente de forma simulada durante el MVP; no se requieren claves reales.

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
| GET | `/api/contributions` | Historial de aportaciones | JWT |
| PATCH | `/api/contributions/:id/status` | Aprueba, rechaza o reembolsa un pago simulado | Admin/Organizador |
| GET | `/api/contributions/:id/history` | Auditoría de un pago | JWT |
| PUT | `/api/prize-pools/:id/distribution` | Define porcentajes | Admin/Organizador |
| POST | `/api/prize-pools/:id/payouts` | Libera un premio y genera recibo | Admin/Organizador |
| POST | `/api/prize-pools/:id/cancel` | Cancela una bolsa sin fondos pendientes | Admin/Organizador |
| POST | `/api/prize-pools/:id/results` | Importa ganadores y dispersa premios simulados | Admin/Organizador |
| GET | `/api/receipts/:code` | Verifica un recibo | Público |
| GET/POST | `/api/rewards` | Consulta o crea premios y cupones | JWT/Admin |
| POST | `/api/rewards/:id/assignments` | Asigna un premio a un ganador | Admin/Organizador |
| PATCH | `/api/rewards/assignments/:id` | Registra canje, entrega o cancelación | Admin/Organizador |

La documentación interactiva está en `http://localhost:3000/api/docs`.

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

Para incluir la prueba transaccional contra MySQL:

```powershell
$env:RUN_DB_TESTS='1'; npm test
```

### Flujo funcional actual

1. Un administrador registra un patrocinador.
2. Crea una bolsa vinculada mediante `tournamentId`.
3. Registra una aportación simulada de Stripe o Binance Pay. La aportación comienza como `pending`.
4. Un administrador simula su aprobación, rechazo o reembolso. Cada transición queda en el historial.
5. Configura porcentajes que sumen 100 y bloquea la bolsa como escrow lógico.
6. Registra pagos manualmente o importa la lista oficial de ganadores.
7. El sistema calcula los importes, registra la dispersión simulada y genera recibos.
8. También puede registrar, asignar y marcar como entregados premios físicos, códigos, cupones o tarjetas.

No se contacta Stripe ni Binance, no se mueve dinero y no se requieren credenciales reales. Los prefijos `pi_test_` y `bp_test_` identifican referencias ficticias generadas localmente.

### Contrato provisional de resultados

Dev 2 o el router principal puede notificar el resultado final mediante:

```http
POST /api/prize-pools/:id/results
```

```json
{
  "tournamentId": "uuid-del-torneo",
  "source": "tournament-engine",
  "winners": [
    { "recipientId": "uuid-equipo-1", "recipientType": "team", "position": 1 },
    { "recipientId": "uuid-equipo-2", "recipientType": "team", "position": 2 }
  ]
}
```

La bolsa debe estar bloqueada y debe recibirse exactamente una persona o equipo por cada posición configurada. La operación es transaccional: si un ganador o posición es inválido, no se genera ningún pago parcial.

### Estructura de base de datos

`database/schema.sql` crea únicamente estructura, índices y relaciones; no contiene credenciales ni datos locales. Las tablas del módulo son:

- `sponsors`: patrocinadores.
- `prize_pools`: bolsas y estado del escrow lógico.
- `contributions`: órdenes simuladas de fondeo.
- `payment_events`: auditoría de estados.
- `payment_idempotency`: protección contra solicitudes duplicadas.
- `distribution_rules`: posiciones, porcentajes e importes.
- `payouts`: dispersiones y recibos.
- `reward_items`: premios físicos y digitales.
- `reward_assignments`: asignaciones, códigos y entregas.
- `tournament_result_imports`: resultados recibidos de otros módulos.
- `tournament_winners`: ganadores asociados con esos resultados.

### Integración con el proyecto general

El router completo se exporta desde `src/routes/index.js`. Dev 1 puede montarlo dentro de su aplicación Express con un prefijo como `/api`. Antes de fusionar las ramas deben acordarse los siguientes contratos.

#### Dev 1 — Core y autenticación

- Confirmar si el identificador JWT será `sub`, `id` o `userId`.
- Confirmar los nombres exactos de los roles. Actualmente se usan `admin` y `organizer`.
- Compartir `JWT_SECRET` mediante variables de entorno, nunca mediante Git.
- Definir el prefijo y ubicación definitiva del router general.

#### Dev 2 — Torneos y brackets

- Confirmar el nombre de la tabla y tipo del ID de torneo.
- Enviar el estado final del torneo y las posiciones oficiales.
- Confirmar o adaptar el contrato provisional de `/api/prize-pools/:id/results`.
- Decidir si la notificación será una petición HTTP o un evento interno.

#### Dev 3 — Equipos y jugadores

- Confirmar los tipos de ID de equipos y jugadores.
- Definir si cada `recipientId` representa un equipo o un jugador.
- Proporcionar el destino simulado que aparecerá en la dispersión.

No se agregan todavía llaves foráneas hacia las tablas de los otros módulos para evitar romper sus migraciones antes de conocer los nombres y tipos definitivos.

### Seguridad

- JWT y autorización por roles en operaciones administrativas.
- Validación de cuerpos, parámetros y UUID.
- Consultas parametrizadas y transacciones MySQL.
- Idempotencia en aportaciones.
- `.env` excluido de Git.
- Pagos reales y llamadas externas desactivados.
- Los recibos públicos no muestran destinos ni datos sensibles del ganador.

### Estado

El backend autónomo de Dev 8 está funcional y probado. Permanecen pendientes únicamente la adaptación final al JWT, tablas, IDs, eventos y router que definan Dev 1, Dev 2 y Dev 3, además de la plantilla visual que consumirá esta API.
