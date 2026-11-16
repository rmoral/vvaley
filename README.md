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
├── PRODUCTION.md                 # Guía detallada del primer despliegue
├── apache-vvaley.conf            # Vhost Apache → reverse proxy a Next
├── vvaley.service                # Unit systemd
├── vvaley-sudoers                # Drop-in para deploy.sh sin password
└── deploy.sh                     # Script de despliegue
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
| `/eventos/<slug>/pago`     | Vuelta del checkout de Kunfupay (estado del pago) |
| `/admin/invitados`         | Gestión de invitados                      |
| `/admin/episodios`         | Gestión de episodios                      |
| `/admin/blog`              | Gestión del blog (CRUD multilingüe)       |
| `/admin/noticias`          | Gestión de noticias (CRUD multilingüe)    |
| `/admin/eventos`           | Gestión de eventos                         |
| `/admin/eventos/<id>/inscripciones` | Lista de inscritos + export CSV   |
| `/admin/newsletter`        | Suscriptores, filtros y export CSV        |
| `/admin/correos`           | Vista previa de todos los correos y envío de prueba |

## Variables de entorno

Ver `.env.example`. Las imprescindibles:

- `DATABASE_URL` — cadena de conexión a Postgres.
- `AUTH_SECRET` — secreto de Auth.js (`openssl rand -base64 32`).
- `NEXTAUTH_URL` — URL pública del site (`http://localhost:3000` en dev, el dominio en prod).
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — credenciales del primer admin que crea `prisma:seed`.

Correo (necesario en producción):

- `PUBLIC_SITE_URL` — URL canónica del site (ej. `https://valiravalley.com`). Si no se define se usa `NEXTAUTH_URL`. Se utiliza para construir los enlaces de confirmación y baja del email.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — servidor SMTP propio y buzón de envío del correo transaccional (confirmación de newsletter, inscripciones, avisos de contacto, invitaciones de calendario). Puerto 465 o 587, siempre con TLS. Sin estas variables, en desarrollo los correos se imprimen en la consola del servidor (copia/pega el enlace para probar); en producción no se envían. `pnpm mail:test` comprueba la configuración.
- `MAIL_FROM` — remitente (ej. `Valira Valley <noreply@valiravalley.com>`). Se sigue aceptando `EMAIL_FROM`.
- `RESEND_API_KEY` — clave de [Resend](https://resend.com), solo para las campañas de newsletter que se envían desde `/admin/campanas`.

Cobro de eventos (Kunfupay):

- `KUNFUPAY_API_KEY` — clave secreta de la API de Kunfupay (`kfp_live_…`). Sin ella, los eventos marcados como «Cobrar la inscripción online» rechazan las inscripciones.
- `KUNFUPAY_WEBHOOK_SECRET` — secreto de firma del webhook. En el panel de Kunfupay (Webhooks) se da de alta `https://valiravalley.com/api/kunfupay/webhook` con los eventos `payment.completed` y `payment.failed`.
- `KUNFUPAY_API_URL` — opcional; por defecto `https://api.kunfupay.com`.
- `EVENT_NOTIFY_EMAIL` — buzón del equipo que recibe un aviso con cada inscripción pagada. Si no se define se usa `CONTACT_NOTIFY_EMAIL`.

Todos los correos (inscripciones, avisos al equipo, newsletter, campañas, contacto e invitaciones a grabar) usan una plantilla común con el sistema Cota: `src/lib/email-layout.ts`, con los textos públicos en el namespace `emails` de `src/messages` y el logo en `public/email/logo-invert@2x.png` (PNG: Gmail y Outlook no muestran SVG). En `/admin/correos` se ven todos con datos de ejemplo y se pueden enviar de prueba al propio admin.

Los correos, tanto el de confirmación a quien paga como el aviso al equipo, salen por el SMTP propio (`SMTP_*`). Si el SMTP falla, el pago se confirma igualmente, la lista de inscritos marca «Correo de confirmación no enviado» y ofrece «Reenviar correo».

Flujo: en `/admin/eventos/<id>` se pone el precio y se marca «Cobrar la inscripción online». El formulario público crea la inscripción en «Pendiente de pago», abre un checkout de Kunfupay y redirige a él; al pagar, la persona vuelve a `/eventos/<slug>/pago`. La plaza se confirma, y sale el correo, cuando llega el webhook `payment.completed`; si se retrasa, la página de vuelta consulta la sesión a la API. Kunfupay solo ofrece checkout alojado en su dominio, sin formulario embebible.

## Despliegue en EC2 (Ubuntu + Apache)

> Para el **primer despliegue** sigue la guía detallada en
> [`deploy/PRODUCTION.md`](deploy/PRODUCTION.md). El resumen de abajo
> es para referencia rápida.

Una sola vez, en el servidor:

```bash
# 1. Base de datos: en producción es Amazon RDS (instancia vvaley-prod).
#    Crea la base y el usuario en RDS y pon su cadena en DATABASE_URL.
#    Ver deploy/PRODUCTION.md.

# 2. pnpm global
sudo npm i -g pnpm

# 3. Clonar
cd /home/ubuntu/web
git clone <repo-url> vvaley
cd vvaley
git checkout main

# 4. .env de producción
cp .env.example .env
# edita DATABASE_URL, AUTH_SECRET (¡regenéralo!), NEXTAUTH_URL (dominio real)
chmod 600 .env

# 5. Primer build
pnpm install --frozen-lockfile
pnpm prisma migrate deploy
pnpm prisma:seed
pnpm build

# 6. Servicio systemd + sudoers para deploy sin password
sudo cp deploy/vvaley.service /etc/systemd/system/vvaley.service
sudo install -m 0440 -o root -g root deploy/vvaley-sudoers /etc/sudoers.d/vvaley
sudo systemctl daemon-reload
sudo systemctl enable --now vvaley
sudo systemctl status vvaley

# 7. Apache: vhost + módulos
sudo cp deploy/apache-vvaley.conf /etc/apache2/sites-available/vvaley.conf
sudo a2enmod proxy proxy_http headers rewrite ssl
sudo a2dissite 000-default
sudo a2ensite vvaley
sudo systemctl reload apache2

# 8. HTTPS
sudo certbot --apache -d valiravalley.com -d www.valiravalley.com
```

A partir de aquí, **cada despliegue** es:

```bash
# en el server, dentro de /home/ubuntu/web/vvaley
bash deploy/deploy.sh
```

`deploy.sh` hace `git reset --hard origin/main`, `pnpm install`,
`prisma migrate deploy`, `pnpm build` y `sudo systemctl restart vvaley`.

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

- [x] Publicación a RRSS: cola `SocialPublication` con conectores a LinkedIn, X, Instagram y TikTok.
- [x] Envíos de campaña de la newsletter, además del email transaccional de confirmación.
- [x] Sistema de diseño «Cota»: marca, iconos, imágenes Open Graph y paleta que cumple AA.
- [x] Pipeline editorial: importador de paquetes markdown con campos SEO, FAQ, enlaces internos y portadas.
- [x] Roles: `requireSession()` para crear y editar, `requireAdmin()` para borrar y para lo que toca cuentas o sale del sitio.
- [x] Tests y CI en GitHub Actions (tipos, lint, tests y build).
- [x] Copia de seguridad diaria de la base **y** de las imágenes subidas.

Próximas iteraciones:

- Subida de medios a S3/Cloudflare R2. Hoy van al disco de la instancia; el
  respaldo diario las cubre, pero un almacén externo evitaría el punto único.
- Sesión de fotos para `/sobre`, `/servicios` y los retratos de los conductores:
  lo único del sistema de diseño que sigue sin cerrar.
- Tests de integración de rutas: hoy la CI valida tipos, lint, lógica pura y
  build, pero no levanta el sitio contra una base de datos.
