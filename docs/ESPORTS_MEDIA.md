# Esports & Integración Media

## Alcance implementado

El módulo de Dev 6 proporciona un centro de operación para streams, lobbies virtuales y métricas competitivas. La primera versión es una interfaz completa con datos de demostración y puntos de integración preparados para servicios reales.

### Transmisiones

- Tarjetas de transmisiones en vivo.
- Filtros por plataforma y videojuego.
- Búsqueda por torneo, canal, título o videojuego.
- Acceso directo a Twitch y YouTube.
- Resumen de espectadores y latencia.

### Lobbies

- Tabla de salas competitivas.
- Estado, cupos, horario, modo y código de acceso.
- Creación de nuevos lobbies desde un formulario.
- Generación y copia de códigos de acceso.

### Métricas

- Audiencia simultánea.
- Retención por videojuego.
- Duración media observada.
- Número de partidas y rendimiento general.

## Integraciones pendientes

Para sustituir los datos demostrativos por información real se requieren:

1. Una aplicación registrada en Twitch Developer Console, con `TWITCH_CLIENT_ID` y `TWITCH_CLIENT_SECRET`.
2. Un proyecto de Google Cloud con YouTube Data API v3 habilitada y `YOUTUBE_API_KEY`.
3. Contratos compartidos con Dev 1 para autenticación, usuarios y persistencia.
4. Contratos con Dev 2 y Dev 4 para torneos, partidas y actualizaciones en vivo.

Las credenciales nunca deben agregarse al repositorio. Se deben proporcionar como variables de entorno en el entorno local o de despliegue.
