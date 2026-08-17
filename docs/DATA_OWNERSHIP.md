# Fuente de verdad y persistencia

Este documento registra el estado real de la persistencia para evitar que una
configuración active una fuente de datos distinta de la que el producto informa.
La decisión de arquitectura para producción es **Supabase/Postgres como fuente de
verdad transaccional**. El JSON local se conserva únicamente como modo demo y
MySQL queda limitado a pruebas de compatibilidad durante la migración.

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

## Plan de migración a Supabase

La API será la única capa de mutación de dominio. El frontend dejará de combinar
llamadas directas a Supabase con llamadas locales una vez que cada módulo tenga
su repositorio Supabase en la API.

Antes de cerrar esta migración se requiere:

1. Aplicar las migraciones versionadas y políticas RLS con Dev 1 e integrador.
2. Un contrato de identificadores y migración de datos para equipos, torneos,
   participantes, partidos y pagos.
3. Repositorios de API para Supabase y pruebas de reinicio/persistencia.
4. Un mecanismo de eventos transaccional para marcador, notificación y premio,
   sin duplicar entregas.
5. Retirar el camino alterno o exponerlo solo como modo demo claramente marcado.
