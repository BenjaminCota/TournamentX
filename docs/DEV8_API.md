# Contrato de integración del módulo Dev 8

El módulo utiliza MySQL 8 mediante `mysql2`. La cadena de conexión se define en `DATABASE_URL`.

## Dependencias con otros módulos

La tabla `prize_pools` almacena `tournament_id`, pero no agrega una llave foránea todavía porque la tabla de torneos pertenece a otro módulo. `recipient_id` representa al equipo o jugador ganador y sigue la misma estrategia. Al integrar ramas, estos campos deben enlazarse con los nombres definitivos de las tablas compartidas.

El middleware JWT espera `sub` y `role`. Los roles internos de la API están normalizados en minúsculas: `admin`, `organizer`, `referee`, `player` y `spectator`.

## Flujo de una bolsa

1. Un administrador u organizador registra al patrocinador.
2. Crea una bolsa asociada con un torneo.
3. Registra una aportación con `stripe` o `binance_pay`; la orden comienza como `pending`.
4. Stripe Test crea un PaymentIntent con `capture_method=manual`. Después de la autorización pasa a `authorized` y puede capturarse o cancelarse.
5. Binance Pay continúa simulado hasta obtener la URL y cuenta merchant del entorno de prueba. El cliente C2B ya implementa nonce, timestamp y firma HMAC SHA-512, pero bloquea la URL de producción.
6. Solamente una aportación capturada o pagada aumenta el monto fondeado.
7. Define porcentajes que sumen exactamente 100.
8. La bolsa queda bloqueada como escrow lógico.
9. Registra un payout por cada posición y obtiene un código de recibo.
10. Cuando se pagan todas las posiciones, la bolsa queda distribuida.

## Modos de operación

- `STRIPE_MODE=simulated`: genera referencias locales `pi_test_`.
- `STRIPE_MODE=test`: utiliza una clave `sk_test_`, crea autorizaciones manuales y nunca acepta una clave live.
- `BINANCE_PAY_MODE=simulated`: genera referencias locales `bp_test_`.
- `BINANCE_PAY_MODE=test`: requiere credenciales, una base URL de prueba y mantiene bloqueada la URL pública de producción.

Cada transición se guarda en `payment_events`. El webhook de Stripe valida `STRIPE_WEBHOOK_SECRET` antes de modificar una aportación.

## Prueba local de Stripe Test

1. Iniciar sesión con `stripe login`.
2. Ejecutar `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
3. Copiar temporalmente la firma `whsec_` a `STRIPE_WEBHOOK_SECRET` solo en el entorno local.
4. Iniciar la API con `STRIPE_MODE=test`.
5. Ejecutar desde `apps/api`:

   `RUN_STRIPE_TESTS=1 node --test test/stripe.integration.test.js`

En PowerShell se usa `$env:RUN_STRIPE_TESTS='1'` antes del comando. La prueba crea dos PaymentIntent de Stripe Test, verifica autorización, captura y cancelación mediante webhooks, y elimina sus registros temporales de MySQL. Nunca debe ejecutarse con una clave `sk_live_`.

## Demostración del frontend

En desarrollo, `POST /api/dev8-demo/session` crea o recupera un patrocinador y una bolsa de demostración, y entrega un JWT temporal. Esta ruta no existe en producción. La pantalla de Premios y pagos utiliza esa sesión para guardar y consultar aportaciones reales en MySQL.

- **Stripe Test:** crea el PaymentIntent, lo autoriza con la tarjeta oficial de prueba, espera el webhook y realiza la captura manual.
- **Binance simulado:** crea una orden C2B y contenido QR local, firma la notificación con RSA-SHA256, valida la firma y registra el pago.
- Las aportaciones usan una clave de idempotencia para evitar duplicados.
- Binance real permanece bloqueado hasta obtener una cuenta Merchant aprobada.

La interfaz también consume patrocinadores, premios, reglas de distribución, ganadores, payouts y recibos desde la API. El QR de Binance se genera con el contenido de la orden simulada. Los recibos de payout se descargan consultando `GET /api/receipts/:code`.

Cuando el módulo de autenticación definitivo esté disponible, debe guardar el JWT en `tournamentx_token` y el contexto seleccionado en `tournamentx_prize_pool_id`, `tournamentx_prize_pool_name` y `tournamentx_sponsor_id`. En ausencia de esos valores, localhost utiliza la sesión demo, deshabilitada automáticamente en producción.

La entrada interactiva de tarjeta utiliza Stripe Elements. Número, vencimiento, CVC y código postal se tokenizan directamente con Stripe y nunca atraviesan Express ni se guardan en MySQL. Para pruebas automatizadas se conserva `pm_card_visa`, como recomienda Stripe. La interfaz acepta las tarjetas oficiales del entorno Test, por ejemplo `4242 4242 4242 4242`, una fecha futura y cualquier CVC de tres dígitos.
