# Valira Valley — reglas del repositorio

Web pública multilingüe y backoffice de Valira Valley (valiravalley.com), el medio y pódcast del grupo Level Five.

## Fuentes de verdad
- `README.md`: rutas, variables de entorno, despliegue y hoja de ruta.
- `deploy/PRODUCTION.md`: arquitectura y guía del servidor de producción.
- `prisma/schema.prisma`: modelo de datos.

## Pila
- Next.js 15 (App Router), TypeScript, Tailwind v4, Prisma + PostgreSQL, Auth.js, next-intl.
- Gestor de paquetes: **pnpm** (no npm).
- Correo con Resend; analítica con Plausible.

## Despliegue: servidor propio, no Vercel
- Producción es un servidor Ubuntu con Apache como proxy inverso, Node bajo systemd (`vvaley.service`) y PostgreSQL local.
- **Un merge a `main` no publica nada.** Se publica ejecutando `bash deploy/deploy.sh` en el servidor, que hace `git reset --hard origin/main`, instala, aplica migraciones de Prisma, compila y reinicia el servicio.
- Consecuencia: todo lo que esté en `main` debe poder desplegarse, y cualquier cambio hecho a mano en el servidor se pierde en el siguiente despliegue.
- Los archivos de `deploy/` (unidades systemd, vhost de Apache, sudoers, copias de seguridad, vigilancia de Postgres) se instalan a mano en el servidor: cambiarlos en el repo no los aplica. Si se tocan, hay que decirlo expresamente en el PR.
- Las imágenes subidas viven en el disco del servidor, no en el repo.

## Estructura
- `src/app/(public)/[locale]/`: web pública en `es`, `ca`, `en` y `fr`.
- `src/app/admin/`: backoffice, solo en castellano. Server actions en `_actions/`.
- `src/messages/<idioma>.json`: textos de interfaz. Ninguno suelto en los componentes.
- `src/lib/social/`: cola de publicación a redes y sus conectores.
- `content/` y `scripts/import-content.ts`: importador de paquetes editoriales en Markdown.

## Reglas
- Todo texto público existe en los cuatro idiomas; el contenido editorial tiene alternativa automática si falta una traducción.
- Cambios de esquema solo con migraciones de Prisma (`pnpm prisma:migrate`); una migración aplicada no se edita.
- Permisos: `requireSession()` para crear y editar; `requireAdmin()` para borrar y para lo que toca cuentas o sale del sitio (envíos, publicación en redes).
- Newsletter con doble opt-in; nunca se envía a quien no ha confirmado.
- Sistema de diseño «Cota»: la paleta cumple AA; no se añaden colores fuera de ella.
- Nunca se suben credenciales: `.env.example` sí, `.env` no.

## Comprobaciones antes de dar un cambio por bueno
Las mismas que ejecuta la CI (`.github/workflows/ci.yml`):
```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build      # necesita DATABASE_URL definida, aunque no haya base de datos
```

## Forma de trabajar
- Trabajo en rama y PR; nunca directo a `main`.
- Commits pequeños en castellano, con prefijo convencional (`feat(eventos): …`, `refactor(…): …`).
