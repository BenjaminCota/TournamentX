# Guía de avance de TournamentX

Última actualización: 12 de agosto de 2026.

## Qué se ha completado

- Se creó el repositorio Git local en `C:\Users\jesus\Downloads\TurnamentX`.
- Se creó el repositorio privado `TournamentX` en la cuenta de GitHub `Progamaster2308`.
- Se publicó `main` y las ocho ramas de trabajo en GitHub.
- Se estableció `main` como rama principal.
- Se agregó una descripción general del proyecto en `README.md`.
- Se documentaron los módulos, alcances y reglas de colaboración en `docs/TEAM_WORKFLOW.md`.
- Se configuraron `.gitignore` y `.gitattributes` para evitar secretos, dependencias y archivos generados.
- Se creó el commit inicial `69ab681` con el mensaje `chore: inicializar estructura colaborativa`.
- Se crearon ocho ramas de trabajo, una por integrante.

## Ramas y responsables

| Responsable | Rama | Módulo |
| --- | --- | --- |
| Dev 1 | `dev-1/core-auth` | Core, autenticación, usuarios, roles, esquema inicial y API Router |
| Dev 2 | `dev-2/tournament-brackets` | Torneos, brackets y avance de rondas |
| Dev 3 | `dev-3/teams-players` | Equipos, plantillas, jugadores e historial |
| Dev 4 | `dev-4/schedule-live` | Calendario, partidos, resultados y marcadores en vivo |
| Dev 5 | `dev-5/analytics-dashboard` | Posiciones, rankings, métricas y dashboard |
| Dev 6 | `dev-6/esports-media` | Streams, lobbies y métricas de esports |
| Dev 7 | `dev-7/geolocation-notifications` | Mapas, torneos cercanos y notificaciones |
| Dev 8 | `dev-8/rewards-payments` | Patrocinadores, premios, Stripe y Binance Pay |

## Flujo recomendado para cada integrante

Repositorio: `https://github.com/Progamaster2308/TournamentX`

```powershell
git clone https://github.com/Progamaster2308/TournamentX.git
cd TournamentX
git switch <RAMA-ASIGNADA>
git pull origin <RAMA-ASIGNADA>
```

Después de realizar cambios:

```powershell
git add .
git commit -m "tipo(area): descripción breve"
git push origin <RAMA-ASIGNADA>
```

Cada integrante debe abrir un pull request desde su rama hacia `main`. Los cambios compartidos de esquema, rutas, eventos o tipos deben coordinarse con Dev 1.

## Pendientes inmediatos

1. Agregar como colaboradores a los integrantes cuando estén disponibles sus usuarios de GitHub.
2. Definir la arquitectura tecnológica y generar el esqueleto de la aplicación.
3. Configurar reglas de protección de `main` y revisión mediante pull requests.

## Seguridad

- Nunca subir contraseñas, tokens, claves de Stripe, Binance, Twitch, YouTube ni credenciales de base de datos.
- Guardar valores sensibles en archivos `.env` locales.
- Mantener un `.env.example` únicamente con nombres de variables y valores ficticios.
