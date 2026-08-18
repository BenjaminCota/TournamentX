# Backlog general de TournamentX

Este documento concentra los pendientes detectados al contrastar la documentación
del proyecto con el código actual. Sirve para coordinar a los ocho módulos sin
duplicar trabajo. Un pendiente se cierra únicamente cuando cumple su criterio de
aceptación y queda verificado en una rama o entorno compartido.

El reparto actualizado y los criterios de terminado de cada desarrollador están
en [`PENDIENTES_POR_MODULO.md`](./PENDIENTES_POR_MODULO.md).

## Estado de la revisión

- Fecha de revisión: 2026-08-16.
- Validación local: `npm run check` correcto (40 pruebas aprobadas, 3 omitidas
  por depender de servicios externos) y `npm run build` correcto.
- La API y el frontend funcionan sin servicios externos usando almacenamiento y
  proveedores de demostración. Esto es útil para desarrollo, pero no equivale a
  una validación de producción.
- Avance 2026-08-17: las escrituras de equipos, jugadores, torneos, brackets,
  calendarios y creación de partidos requieren rol `admin` u `organizer`.
  Los árbitros conservan acceso exclusivo a la actualización de marcadores.
- Avance 2026-08-17: se agregaron solicitudes de organizador, gestión de equipos
  por capitán, check-in, evidencias, disputas y aprobación de resultados. El
  resultado oficial ya conecta partido, bracket, notificaciones y premio del
  campeón de forma idempotente.

## Prioridad transversal

| Estado | Prioridad | Pendiente | Responsable propuesto | Dependencia | Criterio de aceptación |
| --- | --- | --- | --- | --- | --- |
| Hecho | P0 | Ejecutar tipos, pruebas API y build web automáticamente en cada PR y push a `main`. | Integración | Ninguna | GitHub Actions ejecuta `npm ci`, `npm run check` y `npm run build`. |
| Pendiente | P0 | Verificar en un entorno compartido las migraciones y políticas RLS de Supabase. | Dev 1 + integrador | Proyecto Supabase y credenciales con permisos de despliegue | Migraciones aplicadas; altas, lecturas y escrituras cumplen los roles documentados. |
| Hecho | P0 | Ejecutar las pruebas MySQL de premios y calendario contra una base efímera o de pruebas. | Dev 4 + Dev 8 | Base `tournamentx_test` local | `npm run test:db --workspace @tournamentx/api` pasó el 2026-08-17 y no dejó datos de prueba. |
| Hecho | P1 | Definir un flujo E2E mínimo: registro, equipo, torneo, bracket/calendario, resultado, notificación y recompensa. | Integración con Dev 1-8 | Contratos estables y datos de prueba | Una prueba de integración cubre solicitud de rol, equipo, check-in, resultado aprobado, avance de bracket, notificación y premio del campeón. |
| En curso | P1 | Consolidar la fuente de verdad de entidades compartidas entre API local, Supabase y MySQL. | Dev 1 + integrador | Supabase elegido; faltan credenciales y aplicar RLS | Cada entidad declara almacenamiento, sincronización y fallback; no hay divergencia silenciosa. |
| Hecho | P1 | Añadir pruebas de autorización por rol para mutaciones de cada API. | Dueño de cada módulo | Usuarios/roles de prueba | Las rutas de escritura aceptan solo los roles permitidos y devuelven 401/403 correctamente. |
| Hecho | P1 | Publicar una matriz de variables de entorno y verificación sin exponer secretos. | Integración | Acceso a configuraciones de despliegue | Desarrollo, pruebas y producción tienen variables requeridas y modo de fallback explícito. |
| Hecho | P2 | Configurar observabilidad de errores y salud para API, sockets y proveedores. | Integración | Plataforma de despliegue | Errores relevantes tienen trazabilidad y existe una alerta o procedimiento de revisión. |

## Pendientes por módulo

| Módulo | Estado actual confirmado | Próximo pendiente | Prioridad | Criterio de aceptación |
| --- | --- | --- | --- | --- |
| Dev 1 — autenticación y roles | Registro como jugador, solicitud de organizador, aprobación y permisos tienen prueba local. | Persistir el flujo en la base compartida y completar KYC, OAuth y recuperación. | P0 | Un administrador, organizador, jugador y espectador ven y modifican solo lo autorizado. |
| Dev 2 — torneos y brackets | Brackets de eliminación y grupos, BYE y avance por resultado oficial están cubiertos por pruebas. | Completar estados de publicación, seeding editable y programación de siguientes rondas. | P1 | El bracket publicado avanza una sola vez y cada ronda crea su partido correspondiente. |
| Dev 3 — equipos y jugadores | Capitán, invitaciones, solicitudes, roster único y transferencia están cubiertos por pruebas. | Completar perfiles de juego, archivos y validación del roster por torneo. | P1 | No se pueden inscribir referencias inexistentes ni duplicar roster. |
| Dev 4 — calendario y en vivo | Check-in, partido en vivo, evidencia por URL, disputa, aprobación y Socket.IO tienen cobertura local. | Subir evidencias, comparar ambos reportes y cerrar disputas. | P1 | Una disputa bloquea el avance hasta que el organizador publique el resultado oficial. |
| Dev 5 — analítica | Consume el feed competitivo regional y expone métricas locales. | Definir métricas derivadas de resultados oficiales, no solo del feed demo. | P1 | Dashboard distingue datos oficiales, API externa y demostración. |
| Dev 6 — streams y lobbies | Lobbies, eventos y métricas tienen prueba API; proveedores externos caen a demo. | Probar credenciales de Twitch/YouTube en entorno de prueba y manejo de cuota/error. | P2 | La UI informa fuente, última actualización y fallback sin romper la vista. |
| Dev 7 — geolocalización y notificaciones | Búsqueda por cercanía y emisión en tiempo real tienen pruebas. | Validar permisos de ubicación y entrega de notificaciones con eventos reales. | P1 | Un resultado o cambio de sede genera una notificación para el público correcto. |
| Dev 8 — recompensas y pagos | Flujo simulado funciona; la integración Stripe/MySQL está preparada y omitida sin credenciales. | Ejecutar Stripe Test + MySQL y formalizar conciliación de payouts. | P0 | Webhook verificado actualiza una contribución una vez y produce recibo trazable. |

## Bloqueos externos conocidos

- Credenciales y proyecto de Supabase para aplicar/verificar migraciones y RLS.
- Una `DATABASE_URL` no productiva para ejecutar los tres flujos que hoy se
  omiten o requieren MySQL.
- Credenciales de Stripe Test, webhook de prueba y listener para la prueba real.
- Credenciales de PandaScore, football-data.org, Twitch y YouTube para sustituir
  los datos de demostración de los módulos 4, 5 y 6. El modo demo debe conservarse
  como fallback explícito.
- La integración productiva de Binance Pay permanece bloqueada hasta contar con
  cuenta merchant y autorización del responsable financiero.

## Orden de ejecución sugerido

1. Confirmar que el workflow de calidad se ejecute en el siguiente PR.
2. Preparar una base MySQL efímera, aplicar `npm run db:init` y ejecutar las
   pruebas condicionadas con `RUN_DB_TESTS=1`.
3. Validar Supabase/RLS con una matriz de roles de prueba.
4. Implementar el flujo E2E entre torneo, resultados, notificación y premios.
5. Conectar y probar proveedores externos únicamente con sus credenciales de
   prueba autorizadas.
