# Pendientes por módulo

Este documento reparte el trabajo que todavía falta después de implementar los
flujos principales por rol y la conexión entre resultado oficial, bracket,
notificaciones y premios. Cada responsable debe trabajar en su propia rama y
abrir un pull request pequeño, con pruebas y sin incluir archivos `.env` ni
credenciales.

## Integración disponible

- Un usuario nuevo recibe el rol `player` y puede solicitar el rol de
  organizador; el administrador aprueba o rechaza la solicitud.
- Un capitán puede crear un equipo, generar invitaciones, revisar solicitudes,
  administrar el roster y transferir la capitanía.
- Los capitanes pueden hacer check-in, reportar el marcador con evidencia y
  abrir una disputa. El organizador o administrador valida el resultado.
- Un resultado aprobado actualiza el partido, avanza el bracket, publica la
  notificación y libera de forma idempotente el premio del campeón cuando hay
  una bolsa bloqueada.

## Dev 1 — Core y autenticación

Responsable de `apps/web/src/features/auth` y `apps/api/src/modules/auth`.

- [ ] **P0:** mover usuarios, sesiones y solicitudes de organizador del almacén
  local a la base compartida, conservando el modo local para pruebas.
- [ ] **P1:** agregar recuperación de contraseña e inicio con Google y Discord.
- [ ] **P1:** permitir subir y revisar documentos básicos de verificación KYC.
- [ ] **P1:** crear el perfil de organización con logo y redes sociales.
- [ ] **P2:** avisar al administrador cuando llegue una solicitud nueva.

Terminado cuando los roles persisten en la base compartida, el KYC tiene un
historial de revisión y las pruebas demuestran que cada rol solo accede a sus
acciones autorizadas.

## Dev 2 — Torneos y brackets

Responsable de `apps/web/src/features/tournaments` y
`apps/api/src/modules/tournaments`.

- [ ] **P0:** implementar los estados `DRAFT`, `OPEN`, `CLOSED` y `PUBLISHED`.
- [ ] **P0:** permitir que el capitán inscriba su propio equipo y validar que el
  equipo esté activo, completo y, cuando aplique, con la cuota pagada.
- [ ] **P1:** limitar y validar brackets de 8, 16 y 32 lugares.
- [ ] **P1:** agregar edición visual del seeding antes de publicar el bracket.
- [ ] **P1:** crear el override administrativo con bitácora para corregir una
  llave sin duplicar avances.
- [ ] **P1:** generar el partido y horario de la siguiente ronda cuando avance
  un ganador.

Terminado cuando el torneo pasa por todos sus estados, el bracket publicado no
cambia sin una acción auditada y cada avance crea una sola siguiente partida.

## Dev 3 — Equipos y jugadores

Responsable de `apps/web/src/features/teams` y `apps/api/src/modules/teams`.

- [ ] **P0:** agregar una pantalla para que el jugador edite Riot ID, Steam ID,
  Gamertag y otros perfiles propios.
- [ ] **P1:** subir logos y avatares a almacenamiento, en lugar de pedir una URL.
- [ ] **P1:** permitir al organizador revisar requisitos y aprobar el roster de
  un torneo.
- [ ] **P1:** generar un enlace de invitación además del código.
- [ ] **P1:** completar la moderación de equipos con motivo, bloqueo, reactivación
  y bitácora administrativa.

Terminado cuando un jugador administra sus perfiles, no puede pertenecer a dos
equipos activos y el roster aprobado queda enlazado al torneo correspondiente.

## Dev 4 — Calendario y partidos en vivo

Responsable de `apps/web/src/features/matches` y
`apps/api/src/modules/matches`.

- [ ] **P0:** permitir subir la captura de evidencia y guardar su referencia de
  manera segura.
- [ ] **P0:** comparar los reportes de ambos capitanes y bloquear el partido si
  los marcadores no coinciden.
- [ ] **P0:** agregar la decisión y cierre de una disputa por el organizador.
- [ ] **P1:** crear la vista `Mi calendario`, filtrada por el equipo del usuario.
- [ ] **P1:** completar la programación automática de las rondas posteriores.
- [ ] **P2:** crear la vista pública de partidos de hoy con marcador en tiempo
  real.

Terminado cuando un partido recorre una sola vez `scheduled → live → completed`,
las evidencias quedan protegidas y una disputa impide avanzar el bracket hasta
que exista una decisión oficial.

## Dev 5 — Estadísticas y dashboard

Responsable de `apps/web/src/features/analytics` y
`apps/api/src/modules/analytics`.

- [ ] **P0:** calcular estadísticas individuales desde resultados oficiales:
  Winrate, KDA, goles, asistencias u otras métricas según el juego.
- [ ] **P1:** generar rankings de MVP y rankings regionales con fuente visible.
- [ ] **P1:** agregar exportación de posiciones en CSV y PDF.
- [ ] **P1:** mostrar métricas mensuales de usuarios activos y torneos terminados.
- [ ] **P1:** adaptar el dashboard para administrador, organizador, capitán y
  jugador.

Terminado cuando las métricas se recalculan al aprobar un resultado, distinguen
datos oficiales de datos demo y los archivos exportados coinciden con la vista.

## Dev 6 — Esports y media

Responsable de `apps/web/src/features/media` y `apps/api/src/modules/media`.

- [ ] **P0:** relacionar cada transmisión y lobby con un partido de TournamentX.
- [ ] **P0:** guardar nombre y contraseña de sala cifrados y mostrarlos solamente
  a los capitanes que completaron el check-in.
- [ ] **P1:** integrar la creación de salas con proveedores o servidores reales
  cuando el videojuego lo permita.
- [ ] **P1:** agregar un canal seguro para compartir datos del lobby con el roster.
- [ ] **P2:** administrar y rotar las claves de Twitch y YouTube sin exponerlas en
  la interfaz ni en Git.
- [ ] **P2:** reemplazar marcadores demo por proveedores reales conservando un
  fallback claramente identificado.

Terminado cuando la transmisión corresponde al partido abierto y las
credenciales privadas nunca se entregan a jugadores o visitantes no autorizados.

## Dev 7 — Geolocalización y notificaciones

Responsable de `apps/web/src/features/geolocation` y
`apps/api/src/modules/geolocation`.

- [ ] **P0:** agregar CRUD de sedes y permitir que el organizador coloque el PIN
  del torneo desde el mapa.
- [ ] **P0:** dirigir las notificaciones solamente a los usuarios y equipos
  relacionados con el evento.
- [ ] **P1:** programar el aviso automático de partido próximo, por ejemplo a los
  15 minutos.
- [ ] **P1:** agregar navegación o enlace de ruta hacia las coordenadas de la sede.
- [ ] **P1:** implementar Web Push para recibir alertas con la página cerrada.
- [ ] **P2:** mostrar al administrador el consumo y estado del proveedor de mapas.

Terminado cuando una sede real puede administrarse desde la interfaz, el aviso
programado llega al público correcto y no depende de los datos de demostración.

## Dev 8 — Recompensas y pagos

Responsable de `apps/web/src/features/rewards` y la API de premios en
`apps/api/src`.

- [x] **P0:** registrar la cuenta receptora del capitán con Stripe Connect y los
  controles de seguridad correspondientes.
- [x] **P0:** conectar el pago de inscripción del equipo con su confirmación en el
  torneo.
- [x] **P0:** implementar transferencias salientes mediante Stripe Connect Test y
  guardar la referencia verificable de cada operación.
- [x] **P1:** distribuir automáticamente todas las posiciones configuradas, no
  solamente el premio del campeón.
- [x] **P1:** permitir al administrador configurar la comisión de TournamentX.
- [x] **P1:** mostrar al equipo su estado pagado/confirmado y publicar el total de
  la bolsa en la vista pública.
- [x] **P1:** completar reembolsos, conciliación, controles de fraude y auditoría
  de webhooks de Stripe.

Terminado cuando el pago de entrada confirma la inscripción, el resultado final
prepara todos los payouts, el responsable autoriza la operación requerida y los
webhooks dejan una conciliación idempotente y auditable.

## Trabajo compartido

- [ ] Unificar la fuente de verdad: hoy los módulos funcionales usan almacén
  local y el módulo financiero puede usar MySQL.
- [ ] Definir almacenamiento seguro para KYC, logos, avatares y evidencias.
- [ ] Mantener un contrato único para usuarios, equipos, torneos y partidos.
- [ ] Agregar una prueba E2E de navegador por rol sobre el flujo completo.
- [ ] Probar las integraciones externas solamente con credenciales de prueba y
  mantenerlas fuera de los commits.

## Reglas para cerrar un pendiente

1. Crear una rama desde `main` actualizada.
2. Implementar solamente el módulo asignado; coordinar antes de modificar una
   carpeta compartida.
3. Agregar pruebas de éxito, error y autorización.
4. Ejecutar lint, pruebas y build.
5. Abrir un pull request indicando el pendiente cubierto y cómo verificarlo.
