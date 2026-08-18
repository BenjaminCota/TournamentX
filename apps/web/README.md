# TournamentX — Plantilla web

Aplicación React que integra los ocho módulos de TournamentX. Algunos módulos conservan datos de demostración; los pagos requieren Stripe Test.

## Tecnologías

- React 19 y TypeScript.
- Vite.
- Tailwind CSS 4.
- Leaflet para el mapa de sedes.
- Lucide React para iconos.
- Canvas Confetti para confirmaciones visuales.

## Ejecución

```bash
npm install
npm run dev
```

La plantilla usa el puerto `3000` por defecto. Si el backend ya ocupa ese puerto, ejecútala así:

```bash
npm run dev -- --port 4173
```

La URL del backend se configura copiando `.env.example` como `.env.local`. No deben guardarse claves de pagos ni contraseñas en esta carpeta.

## Cobertura de módulos

1. Autenticación y roles.
2. Torneos y brackets.
3. Equipos y jugadores.
4. Calendario y partidos en vivo.
5. Estadísticas y rankings.
6. Esports, streams y lobbies.
7. Sedes, mapas y notificaciones.
8. Patrocinadores, premios y pagos con Stripe Test.

## Estado

Esta carpeta integra los módulos con la API local. El pago con tarjeta requiere `VITE_STRIPE_PUBLISHABLE_KEY` y la configuración Stripe Test correspondiente en la API; sin ellas, la opción de pago permanece deshabilitada.

## Verificación

```bash
npm run lint
npm run build
```
