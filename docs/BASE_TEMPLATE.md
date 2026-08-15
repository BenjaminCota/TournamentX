# Plantilla base de TournamentX

La rama `main` es la fuente visual común para todos los módulos del equipo.

## Elementos compartidos

- Pantalla de inicio de tres segundos con el logo oficial.
- Paleta de marca: negro, blanco y rosa `#ff2e9a`.
- Encabezado, navegación, pie de página y comportamiento responsivo.
- Metadatos para compartir el proyecto en redes y mensajería.
- Base React/Vinext compatible con el despliegue del proyecto.

## Regla para los módulos

Cada integrante debe actualizar su rama desde `main` antes de desarrollar:

```powershell
git switch dev-N/rama-asignada
git fetch origin
git merge origin/main
```

Después puede modificar el contenido de su módulo sin eliminar:

- `public/tournamentx-logo.png`;
- el bloque `splash-screen` de `app/page.tsx`;
- los estilos del splash en `app/globals.css`;
- la configuración general de `app/layout.tsx`.

Antes de subir cambios:

```powershell
npm install
npm run build
git add .
git commit -m "feat(modulo): descripción"
git push origin dev-N/rama-asignada
```
