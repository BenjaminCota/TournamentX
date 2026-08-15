# Contrato de integración del módulo Dev 8

El módulo utiliza MySQL 8 mediante `mysql2`. La cadena de conexión se define en `DATABASE_URL`.

## Dependencias con otros módulos

La tabla `prize_pools` almacena `tournament_id`, pero no agrega una llave foránea todavía porque la tabla de torneos pertenece a otro módulo. `recipient_id` representa al equipo o jugador ganador y sigue la misma estrategia. Al integrar ramas, estos campos deben enlazarse con los nombres definitivos de las tablas compartidas.

El middleware JWT espera `sub` y `role`. Los roles internos de la API están normalizados en minúsculas: `admin`, `organizer`, `referee`, `player` y `spectator`.

## Flujo de una bolsa

1. Un administrador u organizador registra al patrocinador.
2. Crea una bolsa asociada con un torneo.
3. Registra una aportación con `stripe` o `binance_pay`; la orden comienza como `pending`.
4. Un administrador simula su aprobación o rechazo. Solamente una aprobación aumenta el monto fondeado.
5. Define porcentajes que sumen exactamente 100.
6. La bolsa queda bloqueada como escrow lógico.
7. Registra un payout por cada posición y obtiene un código de recibo.
8. Cuando se pagan todas las posiciones, la bolsa queda distribuida.

## Límites del simulador

El simulador no contacta servicios externos ni mueve dinero. Devuelve referencias con prefijo `pi_test` o `bp_test`. Cada transición se guarda en `payment_events`; también permite simular fallos y reembolsos. Las credenciales reales de las plataformas no son necesarias.
