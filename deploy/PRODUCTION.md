# Despliegue en producción

Guía paso a paso para llevar el proyecto a un servidor Ubuntu con
Apache + PostgreSQL + Node + systemd. Pensada para el primer
despliegue; los siguientes son una sola línea (`bash deploy/deploy.sh`).

**Arquitectura:**

```
┌─ usuario ─┐
│  https    │
└──────┬────┘
       │ :443
┌──────▼────────────────────┐
│  Apache (vhost :443)      │
│  · cert Let's Encrypt     │
│  · ProxyPass / 127.0.0.1  │
│  · X-Forwarded-Proto https│
└──────┬────────────────────┘
       │ 127.0.0.1:3000
┌──────▼────────────────────┐
│  Node + Next 15           │
│  systemd: vvaley.service  │
│  · /home/ubuntu/web/vvaley│
└──────┬────────────────────┘
       │ localhost:5432
┌──────▼────────────────────┐
│  PostgreSQL 16            │
│  database: vvaley         │
└───────────────────────────┘
```

Asumimos host EC2 Ubuntu en `18.217.132.43`, usuario `ubuntu`, código
en `/home/ubuntu/web/vvaley`, dominio `valiravalley.com`.

---

## 0 · Antes de tocar producción

Mergea a `main` la rama de desarrollo (el `deploy/deploy.sh` hace
`git reset --hard origin/main`):

```bash
git checkout main
git merge --ff-only <rama-feature>
git push origin main
```

**Comprueba el security group EC2**: sólo deben estar abiertos al
exterior **22, 80 y 443**. El puerto 3000 (donde escucha Node) no
debe ser accesible desde fuera — si lo expones, alguien puede saltarse
el redirect HTTPS de Apache.

---

## 1 · Conectar al servidor y dejar las dependencias listas

```bash
ssh ubuntu@18.217.132.43
sudo apt update
```

### 1.1 · Node 22 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v   # esperado: v22.x, npm 10.x
```

### 1.2 · pnpm global

```bash
sudo npm install -g pnpm
pnpm -v
```

### 1.3 · Apache: módulos necesarios

```bash
sudo a2enmod proxy proxy_http headers rewrite ssl
sudo systemctl reload apache2
```

### 1.4 · PostgreSQL

```bash
sudo apt install -y postgresql
sudo systemctl enable --now postgresql
psql --version  # esperado: 16.x
```

---

## 2 · Crear base de datos y usuario

Genera una contraseña fuerte y guárdala (la usarás en `.env`):

```bash
DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
echo "DB password (cópiala ya): $DB_PASSWORD"

sudo -u postgres psql <<SQL
CREATE USER vvaley WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE vvaley OWNER vvaley;
GRANT ALL PRIVILEGES ON DATABASE vvaley TO vvaley;
SQL
```

Comprueba conexión:

```bash
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U vvaley -d vvaley -c "SELECT version();"
```

---

## 3 · Traer el código

```bash
sudo mkdir -p /home/ubuntu/web
sudo chown -R ubuntu:ubuntu /home/ubuntu/web
cd /home/ubuntu/web
git clone https://github.com/rmoral/vvaley.git vvaley
cd vvaley
git checkout main
```

Si el repo es privado: configura un deploy key en GitHub o usa HTTPS
con un PAT.

---

## 4 · Variables de entorno

```bash
cd /home/ubuntu/web/vvaley
cp .env.example .env
nano .env
```

Rellena así (sustituye `$DB_PASSWORD` por el valor del paso 2 y
`AUTH_SECRET` por uno nuevo):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `postgresql://vvaley:DB_PASSWORD@localhost:5432/vvaley?schema=public` |
| `AUTH_SECRET` | output de `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://valiravalley.com` |
| `PUBLIC_SITE_URL` | `https://valiravalley.com` |
| `SEED_ADMIN_EMAIL` | tu email real (vas a entrar al backoffice con esto) |
| `SEED_ADMIN_PASSWORD` | una contraseña fuerte temporal — la cambias luego |
| `SEED_ADMIN_NAME` | tu nombre |
| `RESEND_API_KEY` | déjalo vacío de momento; los emails irán al log de PM2 |
| `EMAIL_FROM` | `Valira Valley <noreply@valiravalley.com>` (sólo se usa cuando configures Resend) |

Permisos restrictivos:

```bash
chmod 600 /home/ubuntu/web/vvaley/.env
```

---

## 5 · Primer build, migraciones y seed

```bash
cd /home/ubuntu/web/vvaley
pnpm install --frozen-lockfile
pnpm prisma migrate deploy   # aplica las migraciones (init + newsletter_blog + news_events)
pnpm prisma:seed             # crea el usuario admin con SEED_ADMIN_*
pnpm build
```

El build debe terminar en verde y listar todas las rutas (home,
podcast, blog, noticias, eventos, admin/*, api/*).

### Instalar el servicio systemd

El unit file vive en `deploy/vvaley.service`. Lo copias a
`/etc/systemd/system/`, recargas y habilitas:

```bash
sudo cp deploy/vvaley.service /etc/systemd/system/vvaley.service
sudo systemctl daemon-reload
sudo systemctl enable --now vvaley
sudo systemctl status vvaley --no-pager
```

`status` debe mostrar `active (running)` y un PID. Si no, mira el log
con `journalctl -u vvaley -n 50`.

### Permitir despliegues sin password (sudoers drop-in)

`deploy.sh` hace `sudo systemctl restart vvaley`. Para que no pida
contraseña:

```bash
sudo install -m 0440 -o root -g root \
  deploy/vvaley-sudoers /etc/sudoers.d/vvaley
sudo visudo -cf /etc/sudoers.d/vvaley   # debe imprimir "parsed OK"
```

### Smoke test local en el server (Apache aún no toca)

```bash
curl -s -o /dev/null -w "home: %{http_code}\n" http://127.0.0.1:3000/
curl -s -o /dev/null -w "admin: %{http_code}\n" http://127.0.0.1:3000/admin/login
```

Esperado: `200` en ambos.

---

## 6 · Apache: convertir el vhost en reverse proxy

Tienes dos vhosts que tocar: el de `:80` (HTTP→HTTPS) y el de `:443`
(donde está el certificado y se sirve realmente). El de `:80` se queda
casi como está. El de `:443` es el que tiene que **dejar de servir
`/var/www/html/vvaley`** y empezar a hacer proxy a Node.

### 6.1 · Localiza los vhosts actuales

```bash
sudo apachectl -S 2>&1 | grep valiravalley
ls /etc/apache2/sites-enabled/
```

Lo más probable: `valiravalley.conf` (el de `:80`) y
`valiravalley-le-ssl.conf` (creado por Certbot, `:443`). Si sólo tienes
el de `:80`, monta HTTPS antes de seguir (paso 6.5).

### 6.2 · Backup

```bash
sudo cp /etc/apache2/sites-available/valiravalley.conf /etc/apache2/sites-available/valiravalley.conf.bak
sudo cp /etc/apache2/sites-available/valiravalley-le-ssl.conf /etc/apache2/sites-available/valiravalley-le-ssl.conf.bak 2>/dev/null
```

### 6.3 · Vhost `:80`

`sudo nano /etc/apache2/sites-available/valiravalley.conf`:

```apache
<VirtualHost *:80>
    ServerName valiravalley.com
    ServerAlias www.valiravalley.com
    ServerAdmin admin@valiravalley.com

    # Sin DocumentRoot: el :80 sólo redirige a HTTPS, nada se sirve aquí.
    RewriteEngine on
    RewriteCond %{SERVER_NAME} =www.valiravalley.com [OR]
    RewriteCond %{SERVER_NAME} =valiravalley.com
    RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI} [END,NE,R=permanent]

    ErrorLog ${APACHE_LOG_DIR}/valiravalley_error.log
    CustomLog ${APACHE_LOG_DIR}/valiravalley_access.log combined
</VirtualHost>
```

### 6.4 · Vhost `:443` (reverse proxy)

`sudo nano /etc/apache2/sites-available/valiravalley-le-ssl.conf`.
Mantén las líneas `SSLEngine`, `SSLCertificateFile`,
`SSLCertificateKeyFile`, `Include … options-ssl-apache.conf`. **Quita**
`DocumentRoot` y el bloque `<Directory>` si los tienes apuntando a
`/var/www/html/vvaley`. Resultado esperado:

```apache
<IfModule mod_ssl.c>
<VirtualHost *:443>
    ServerName valiravalley.com
    ServerAlias www.valiravalley.com
    ServerAdmin admin@valiravalley.com

    # ─── Reverse proxy a Node (PM2) ───
    ProxyPreserveHost On
    ProxyRequests     Off
    ProxyPass        / http://127.0.0.1:3000/ retry=1 acquire=3000 timeout=600 Keepalive=On
    ProxyPassReverse / http://127.0.0.1:3000/

    # Para que Auth.js / Next sepan que están detrás de HTTPS
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port  "443"

    # Redirigir www → apex
    RewriteEngine On
    RewriteCond %{HTTP_HOST} ^www\.valiravalley\.com$ [NC]
    RewriteRule ^ https://valiravalley.com%{REQUEST_URI} [L,R=301]

    ErrorLog ${APACHE_LOG_DIR}/valiravalley_error.log
    CustomLog ${APACHE_LOG_DIR}/valiravalley_access.log combined

    # ─── SSL ───
    SSLEngine on
    SSLCertificateFile      /etc/letsencrypt/live/valiravalley.com/fullchain.pem
    SSLCertificateKeyFile   /etc/letsencrypt/live/valiravalley.com/privkey.pem
    Include /etc/letsencrypt/options-ssl-apache.conf
</VirtualHost>
</IfModule>
```

> **Importante**: la directiva `DocumentRoot` ya **no** debe existir
> en el `:443`. Cuando hay `ProxyPass /`, Apache no debe servir nada
> del filesystem. La carpeta `/var/www/html/vvaley` queda en desuso.

### 6.5 · Si todavía no tienes HTTPS instalado

```bash
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d valiravalley.com -d www.valiravalley.com
```

Certbot crea el vhost `:443` por ti — luego le añades el bloque proxy
del paso 6.4.

### 6.6 · Test de sintaxis y reload

```bash
sudo apachectl configtest
# Debe decir: Syntax OK
sudo systemctl reload apache2
```

Si `configtest` falla, revisa el archivo y corrige antes del reload.

---

## 7 · Verificación end-to-end

Desde tu máquina local (no desde el server):

```bash
# 1. HTTP redirige a HTTPS
curl -sI http://valiravalley.com/ | grep -iE 'http/|location'

# 2. Home en producción
curl -s https://valiravalley.com/ | grep -oE 'VALIRA[^<]*VALLEY' | head -1

# 3. /admin/login responde
curl -sI https://valiravalley.com/admin/login | head -1

# 4. API de newsletter no rompe
curl -s -X POST https://valiravalley.com/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"deploytest@example.com","locale":"es","source":"smoke"}'
```

Si la home y el admin responden 200, abre en el navegador:

- `https://valiravalley.com/` — la home portada
- `https://valiravalley.com/podcast`, `/blog`, `/noticias`, `/eventos`
- `https://valiravalley.com/admin/login` — entra con `SEED_ADMIN_EMAIL`
  y `SEED_ADMIN_PASSWORD`

### Cambiar la contraseña del admin

No hay UI de cambio aún. Vía SQL:

```bash
cd /home/ubuntu/web/vvaley
node -e "require('bcryptjs').hash(process.argv[1], 10).then(h => console.log(h))" 'NUEVA_CONTRASEÑA'
# copia el hash y:
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U vvaley -d vvaley \
  -c "UPDATE \"User\" SET \"passwordHash\"='HASH_PEGADO' WHERE email='tu@email';"
```

Borra el suscriptor de prueba:

```bash
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U vvaley -d vvaley \
  -c "DELETE FROM \"NewsletterSubscriber\" WHERE email='deploytest@example.com';"
```

---

## 8 · Despliegues sucesivos

Cada update es una sola línea desde el server:

```bash
cd /home/ubuntu/web/vvaley
bash deploy/deploy.sh
```

`deploy.sh` hace `git reset --hard origin/main` → `pnpm install` →
`prisma migrate deploy` → `pnpm build` → `sudo systemctl restart vvaley`.
Hay un blip de ~1-2 segundos durante el restart (systemd no hace
zero-downtime nativo). Si necesitas rolling/zero-downtime, lo más
limpio sería poner dos sockets detrás de Apache, pero para el tráfico
actual es innecesario.

Atajo desde tu máquina:

```bash
ssh ubuntu@18.217.132.43 "cd /home/ubuntu/web/vvaley && bash deploy/deploy.sh"
```

---

## 9 · Operativa diaria

| Tarea | Comando |
|---|---|
| Logs en vivo | `journalctl -u vvaley -f` |
| Logs de la última hora | `journalctl -u vvaley --since "1 hour ago"` |
| Logs de hoy | `journalctl -u vvaley --since today` |
| Estado del servicio | `sudo systemctl status vvaley` |
| Reiniciar (si algo se cuelga) | `sudo systemctl restart vvaley` |
| Recargar tras cambio en `.env` | `sudo systemctl restart vvaley` (no hay reload "soft" para Node) |
| Ver últimos errores Apache | `sudo tail -f /var/log/apache2/valiravalley_error.log` |
| Acceder a la BD | `PGPASSWORD=… psql -h localhost -U vvaley -d vvaley` |
| Backup manual de BD | `pg_dump postgresql://vvaley:$DB_PASSWORD@localhost/vvaley > backup-$(date +%F).sql` |
| Renovación cert SSL | automática vía `certbot.timer`; verifica con `sudo certbot renew --dry-run` |

---

## 10 · Troubleshooting rápido

| Síntoma | Diagnóstico |
|---|---|
| 502 Bad Gateway | El servicio está caído. `sudo systemctl status vvaley` y `journalctl -u vvaley -n 100`. |
| `vvaley.service` en `failed`/`activating (auto-restart)` | Mira `journalctl -u vvaley -n 200`. Casi siempre: `.env` mal formado, puerto 3000 ocupado o falta `pnpm build`. |
| 404 en todas las rutas | Apache aún sirve `/var/www/html/vvaley` (DocumentRoot no quitado del `:443`). |
| Login admin: "Configuration" o redirect loop | `NEXTAUTH_URL` no es `https://valiravalley.com` o falta `RequestHeader X-Forwarded-Proto`. |
| Home OK pero `/podcast` da error de DB | `pnpm prisma migrate deploy` no se ejecutó. Hazlo y `sudo systemctl restart vvaley`. |
| Cambias `.env` y no se aplica | systemd cachea el `EnvironmentFile` al arrancar. `sudo systemctl restart vvaley`. |
| Email de confirmación no llega | Sin `RESEND_API_KEY` el email se imprime al log: `journalctl -u vvaley -f` y copia el enlace. Para enviar real: da de alta el dominio en Resend, mete `RESEND_API_KEY` en `.env` y `sudo systemctl restart vvaley`. |
| `pnpm build` falla por memoria | EC2 t2/t3.micro tiene poca RAM. `NODE_OPTIONS=--max-old-space-size=1024 pnpm build`, o haz el build localmente y rsynchea `.next/`. |
| `deploy.sh` pide contraseña en el restart | No has instalado el sudoers drop-in (paso 5). Hazlo y reintenta. |

### Rollback rápido si el deploy rompe algo

```bash
cd /home/ubuntu/web/vvaley
git log --oneline -5             # apunta el SHA del commit anterior
git reset --hard <SHA_ANTERIOR>
pnpm install --frozen-lockfile
pnpm build
sudo systemctl restart vvaley
```

Migraciones Prisma **no se revierten automáticamente**. Si una
migración rompe la BD: restaura desde un backup `pg_dump` o revisa
`prisma/migrations/` y aplica un fix manual con `psql`.

---

## Apéndice · Migrar de PM2 a systemd

Si ya tienes una instalación previa con PM2 y quieres pasarla a
systemd sin perder un solo deploy:

```bash
# 1. Para PM2 y desinscribe la app
pm2 delete vvaley 2>/dev/null || true
pm2 save --force

# 2. Quita el servicio systemd que PM2 había instalado
pm2 unstartup
# pm2 imprime un comando `sudo env PATH=… pm2 unstartup …` — ejecútalo
sudo systemctl disable pm2-ubuntu 2>/dev/null || true
sudo systemctl stop pm2-ubuntu    2>/dev/null || true

# 3. Apaga el daemon de PM2
pm2 kill

# 4. (Opcional) desinstala PM2
sudo npm uninstall -g pm2

# 5. Instala el unit de vvaley
cd /home/ubuntu/web/vvaley
git pull origin main              # trae deploy/vvaley.service
sudo cp deploy/vvaley.service /etc/systemd/system/vvaley.service
sudo install -m 0440 -o root -g root \
  deploy/vvaley-sudoers /etc/sudoers.d/vvaley
sudo systemctl daemon-reload
sudo systemctl enable --now vvaley
sudo systemctl status vvaley --no-pager
journalctl -u vvaley -n 30
```

Verifica que todo sigue respondiendo:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
```
