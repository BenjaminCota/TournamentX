# Contrato de integración del módulo Dev 8

El módulo de recompensas utiliza **Stripe como única pasarela de pago**. Durante
el desarrollo debe operar únicamente con Stripe Test; ninguna
clave `live` debe guardarse en el repositorio ni usarse en las pruebas.

## Acceso por rol

| Rol | Acceso actual |
| --- | --- |
| Administrador | Consulta todas las bolsas, aportaciones, patrocinadores, reglas, transferencias y recibos. Configura la comisión, realiza reembolsos y consulta la conciliación. |
| Organizador | Administra únicamente sus torneos, bolsas, aportaciones, distribución, premios, reembolsos y transferencias. Consulta la comisión y la conciliación. |
| Capitán | Consulta premios y el estado de pago de su equipo, paga la inscripción y administra su cuenta receptora mediante Stripe Express. |
| Jugador | Consulta el total de cada bolsa, los premios publicados y el estado de pago de su equipo. |
| Visitante | Consulta el total público acumulado y el total de cada torneo. |

Los endpoints de patrocinadores, aportaciones, recibos y mutaciones financieras
requieren rol `admin` u `organizer`. La API no debe crear sesiones demo con rol
administrador para abrir la pantalla.

## Flujo actual de una bolsa

1. Un administrador u organizador registra el patrocinador.
2. Crea una bolsa asociada con un torneo.
3. Registra una aportación con `provider: "stripe"`.
4. Stripe Test crea un PaymentIntent con captura manual.
5. El webhook firmado cambia la aportación a `authorized`.
6. El responsable captura la autorización y el importe pasa a la bolsa.
7. Configura porcentajes que sumen exactamente 100 y bloquea la bolsa.
8. El resultado oficial registra ganadores y prepara los payouts.
9. El organizador libera cada posición hacia la cuenta Express del capitán ganador.
10. Cada transferencia guarda la referencia de Stripe Test y genera un recibo auditable.

## Orden de implementación

### 1. Stripe único y permisos

Estado: **terminado y validado**.

- retirar proveedores alternativos de interfaz, API, pruebas y variables;
- usar el JWT real del usuario;
- separar la vista pública, la consulta de equipo y la administración privada;
- conservar pruebas de autorización e idempotencia.

### 2. Pago de inscripción del capitán

Estado: **terminado y validado** con Stripe Test.

- crear la cuota por torneo;
- permitir pagar solamente al capitán del equipo inscrito;
- enlazar PaymentIntent, equipo, torneo e inscripción;
- marcar el equipo como `PAID` o `CONFIRMED` mediante webhook idempotente.

### 3. Cuenta receptora

Estado: **terminado y validado** con incorporación alojada y Panel Express.

- registrar una cuenta Stripe Connect de prueba para cada capitán;
- guardar solo identificadores seguros, nunca datos de tarjeta;
- verificar que el capitán sea dueño del equipo receptor.

### 4. Distribución de ganadores

Estado: **terminado y validado** con transferencias reales de Stripe Test.

- procesar todas las posiciones configuradas;
- requerir la autorización definida para liberar fondos;
- evitar payouts duplicados;
- conciliar estado interno con Stripe.

### 5. Comisión, reembolsos y auditoría

Estado: **terminado y validado** con MySQL y Stripe Test.

- comisión configurable por administrador;
- reembolso antes de bloquear la bolsa;
- historial de webhooks, errores y reintentos;
- panel de conciliación y recibos.

### 6. Vista pública y pruebas completas

Estado: **terminado y validado** por rol.

- total público por torneo;
- estado pagado para capitán y jugador;
- recorrido E2E por rol;
- pruebas Stripe Test con MySQL y webhook local.

## Configuración

- `STRIPE_MODE=test`: requiere `sk_test_` y nunca acepta una clave live.
- `STRIPE_PUBLISHABLE_KEY`: clave publicable del entorno Stripe Test.
- `STRIPE_SECRET_KEY`: secreto Test solo en el entorno local o gestor de secretos.
- `STRIPE_WEBHOOK_SECRET`: firma temporal del listener de Stripe.
- `STRIPE_CONNECT_RETURN_URL`: regreso a TournamentX después de la incorporación.
- `STRIPE_CONNECT_REFRESH_URL`: regreso cuando debe generarse un enlace nuevo.
- `VITE_STRIPE_PUBLISHABLE_KEY`: clave publicable Test; no es un secreto.

Sin estas variables, la aplicación devuelve que Stripe no está configurado y no
crea pagos ficticios. Las pruebas automatizadas usan un adaptador aislado que
solo se activa bajo `node:test` y nunca forma parte del flujo visible.

## Prueba local de Stripe Test

1. Ejecutar `stripe login`.
2. Ejecutar `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
3. Guardar temporalmente la firma `whsec_` en el `.env` local.
4. Iniciar la API con `STRIPE_MODE=test`.
5. Usar la tarjeta oficial de prueba `4242 4242 4242 4242`, fecha futura y
   cualquier CVC de tres dígitos.

Stripe Elements tokeniza los datos directamente en Stripe. El número de tarjeta,
fecha, CVC y código postal nunca deben atravesar Express ni guardarse en MySQL.
