# Valira Valley

Web pública multilingüe + backoffice del podcast **Valira Valley**.

Stack: **Next.js 15 · TypeScript · Tailwind v4 · Prisma · PostgreSQL · Auth.js · next-intl**.

```
src/
├── app/
│   ├── (public)/[locale]/        # Web pública (es, ca, en, fr)
│   │   ├── page.tsx              # Home (port del index.html original)
│   │   ├── podcast/              # Listado y detalle de episodios
│   │   └── invitados/[slug]/     # Ficha pública de invitado
│   ├── admin/                    # Backoffice (sólo español)
│   │   ├── invitados/            # CRUD de invitados
│   │   ├── episodios/            # CRUD de episodios
│   │   └── _actions/             # Server actions
│   └── api/auth/                 # Endpoints de Auth.js
├── components/{public,admin}/    # UI pública y de backoffice
├── i18n/                         # Routing y mensajes (next-intl)
├── lib/                          # prisma, slug
└── messages/                     # es.json, ca.json, en.json, fr.json
prisma/
├── schema.prisma                 # User, Guest, Episode, EpisodeGuest
└── seed.ts                       # Crea el usuario admin inicial
deploy/
├── apache-vvaley.conf            # Vhost Apache → reverse proxy a Next
└── deploy.sh                     # Script de despliegue en EC2
ecosystem.config.cjs              # PM2
```

## Desarrollo local

```bash
# 1. Dependencias
pnpm install

# 2. Variables de entorno
cp .env.example .env
# edita DATABASE_URL, AUTH_SECRET, SEED_ADMIN_*

# 3. Base de datos
pnpm prisma migrate dev          # crea esquema y aplica migraciones
pnpm prisma:seed                 # crea el primer usuario admin

# 4. Servidor de desarrollo
pnpm dev                         # http://localhost:3000
                                 # backoffice → /admin/login
```

URLs útiles en local:

| Ruta                       | Qué hay                                   |
| -------------------------- | ----------------------------------------- |
| `/`                        | Home en español                           |
| `/ca`, `/en`, `/fr`        | Home en cada idioma                       |
| `/podcast`                 | Listado de episodios publicados           |
| `/podcast/<slug>`          | Detalle del episodio                      |
| `/invitados/<slug>`        | Ficha del invitado                        |
| `/admin/login`             | Acceso al backoffice                      |
| `/admin`                   | Panel                                     |
| `/blog`                    | Listado de posts publicados               |
| `/blog/<slug>`             | Detalle de un post (con fallback i18n)    |
| `/noticias`                | Listado de noticias                        |
| `/noticias/<slug>`         | Detalle de una noticia                     |
| `/eventos`                 | Listado de eventos (próximos + pasados)    |
| `/eventos/<slug>`          | Detalle del evento + formulario de inscripción |
| `/admin/invitados`         | Gestión de invitados                      |
| `/admin/episodios`         | Gestión de episodios                      |
| `/admin/blog`              | Gestión del blog (CRUD multilingüe)       |
| `/admin/noticias`          | Gestión de noticias (CRUD multilingüe)    |
| `/admin/eventos`           | Gestión de eventos                         |
| `/admin/eventos/<id>/inscripciones` | Lista de inscritos + export CSV   |
| `/admin/newsletter`        | Suscriptores, filtros y export CSV        |

## Variables de entorno

Ver `.env.example`. Las imprescindibles:

- `DATABASE_URL` — cadena de conexión a Postgres.
- `AUTH_SECRET` — secreto de Auth.js (`openssl rand -base64 32`).
- `NEXTAUTH_URL` — URL pública del site (`http://localhost:3000` en dev, el dominio en prod).
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — credenciales del primer admin que crea `prisma:seed`.

Newsletter (opcional pero recomendado en producción):

- `PUBLIC_SITE_URL` — URL canónica del site (ej. `https://valiravalley.com`). Si no se define se usa `NEXTAUTH_URL`. Se utiliza para construir los enlaces de confirmación y baja del email.
- `RESEND_API_KEY` — clave de [Resend](https://resend.com). Sin esta variable, los emails de confirmación se imprimen en la consola del servidor (útil en desarrollo, copia/pega el enlace para probar).
- `EMAIL_FROM` — remitente de los emails (ej. `Valira Valley <noreply@valiravalley.com>`). El dominio debe estar verificado en Resend.

## Despliegue en EC2 (Ubuntu + Apache)

> Para el **primer despliegue** sigue la guía detallada en
> [`deploy/PRODUCTION.md`](deploy/PRODUCTION.md). El resumen de abajo
> es para referencia rápida.

Una sola vez, en el servidor:

```bash
# 1. Postgres: crear base y usuario
sudo -u postgres psql <<SQL
CREATE USER vvaley WITH PASSWORD 'CHANGE_ME';
CREATE DATABASE vvaley OWNER vvaley;
SQL

# 2. PM2 global
sudo npm i -g pm2 pnpm

# 3. Clonar
cd /var/www
sudo git clone <repo-url> vvaley
sudo chown -R $USER:$USER vvaley
cd vvaley
git checkout main

# 4. .env de producción
cp .env.example .env
# edita DATABASE_URL, AUTH_SECRET (¡regenéralo!), NEXTAUTH_URL (dominio real)

# 5. Primer build + arranque
pnpm install --frozen-lockfile
pnpm prisma migrate deploy
pnpm prisma:seed
pnpm build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup        # sigue las instrucciones que imprime

# 6. Apache: vhost + módulos
sudo cp deploy/apache-vvaley.conf /etc/apache2/sites-available/vvaley.conf
sudo a2enmod proxy proxy_http headers rewrite ssl
sudo a2dissite 000-default
sudo a2ensite vvaley
sudo systemctl reload apache2

# 7. HTTPS
sudo certbot --apache -d valiravalley.com -d www.valiravalley.com
```

A partir de aquí, **cada despliegue** es:

```bash
# en el server, dentro de /var/www/vvaley
bash deploy/deploy.sh
```

`deploy.sh` hace `git reset --hard origin/main`, `pnpm install`, `prisma migrate deploy`, `pnpm build` y `pm2 reload vvaley`.

## Roadmap

Iteraciones completadas:

- [x] Web pública multilingüe (es/ca/en/fr) basada en el tema original.
- [x] Backoffice con login y CRUD de Invitados y Episodios.
- [x] Páginas públicas `/podcast`, `/podcast/[slug]`, `/invitados/[slug]`.
- [x] Newsletter con doble opt-in (subscribe → email de confirmación → confirm/unsubscribe), admin con búsqueda, filtros y export CSV.
- [x] Blog multilingüe con CRUD por idioma, fallback automático en la web pública y renderizado Markdown.
- [x] CTA de newsletter en todas las páginas de contenido (strip + variante inline tras el cuerpo de cada post/episodio/invitado).
- [x] Noticias multilingües (con soporte para noticia "propia" o curada con `externalUrl`).
- [x] Eventos multilingües con inscripciones públicas, gestión de aforo (waitlist automático), email de confirmación y CSV de inscritos.

Próximas iteraciones:

- Subida de medios: portadas e imágenes a S3/Cloudflare R2 desde el backoffice.
- Publicación a RRSS: cola de jobs `SocialPublication` con conectores a LinkedIn, X, Instagram, TikTok.
- Envíos de campaña de la newsletter (no sólo el email transaccional de confirmación).
- Roles y permisos finos para `EDITOR` vs `ADMIN`.
