# Fuente de verdad y persistencia

Este documento registra el estado real de la persistencia para evitar que una
configuración active una fuente de datos distinta de la que el producto informa.
No reemplaza la decisión pendiente de arquitectura para producción.

## Estado actual

| Entidad o flujo | Fuente de verdad en la API actual | Papel de Supabase | Papel de MySQL | Respaldo |
| --- | --- | --- | --- | --- |
| Usuarios, perfiles, equipos, jugadores y roster | JSON local (`local-store`) | El frontend puede leer/escribir directamente si se configura. | Esquema disponible, sin repositorio API activo. | JSON local en desarrollo. |
| Torneos, participantes, grupos y brackets | JSON local (`tournament-store`) | El frontend sincroniza torneos al ejecutar operaciones de bracket. | Esquema/integración, sin repositorio API activo. | JSON local. |
| Calendarios, partidos y marcadores | JSON local (`schedule-store`, `match-store`) | El frontend puede operar partidos configurado con Supabase. | Esquema/integración, sin repositorio API activo. | JSON local y Socket.IO. |
| Sedes y notificaciones | JSON local (`geolocation-store`) | Lectura y tiempo real opcionales desde frontend. | No es fuente de ejecución. | JSON local y Socket.IO. |
| Lobbies y medios | JSON local (`media.store`) | Lobbies pueden usar Supabase desde frontend. | No es fuente de ejecución. | Datos demo/proveedores opcionales. |
| Premios, aportaciones y pagos simulados | JSON local (`local-rewards.store`) | No es fuente API actual. | Pruebas de integración y esquema financiero. | Proveedores simulados. |
| Datos competitivos externos | Proveedor o datos demo de solo lectura | No aplica. | No aplica. | Feed demo explícito. |

## Reglas vigentes

- La API declara `storage: "local-json"` en `/api/health`. Que exista
  `DATABASE_URL` solo significa que MySQL está configurado para inicialización de
  esquema y pruebas; no significa que los módulos ya escriban en MySQL.
- El frontend no debe mezclar resultados de API y Supabase dentro de una misma
  pantalla sin indicar el origen. La configuración de Supabase sigue siendo
  opcional y está limitada a las operaciones que `supabaseRepository` implementa.
- Los proveedores Twitch, YouTube, PandaScore y football-data son enriquecimiento
  de lectura; sus datos demo no son resultados oficiales de un torneo.

## Decisión requerida para producción

El integrador y Dev 1 deben seleccionar **una** fuente de verdad transaccional
para entidades de dominio: Supabase/Postgres o MySQL. Después, cada repositorio
de la API deberá escribir únicamente en esa fuente y el frontend deberá pasar
por la API para las mutaciones que hoy llama directo a Supabase.

Antes de cerrar esta migración se requiere:

1. Un contrato de identificadores y migración de datos para equipos, torneos,
   participantes, partidos y pagos.
2. Repositorios de API para la fuente elegida y pruebas de reinicio/persistencia.
3. Un mecanismo de eventos transaccional para marcador, notificación y premio,
   sin duplicar entregas.
4. Retirar el camino alterno o exponerlo solo como modo demo claramente marcado.
