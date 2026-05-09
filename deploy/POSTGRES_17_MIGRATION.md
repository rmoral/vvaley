# Migración de PostgreSQL 12 → 17

PostgreSQL 12 está en EOL desde noviembre de 2024 (sin parches de
seguridad ni de bugs). Esta guía describe la migración en el host
actual (EC2 Ubuntu 20.04) usando el método **dump + restore**, que es
más lento que `pg_upgrade --link` pero más predecible y deja el
cluster antiguo intacto como red de seguridad.

> **Antes de tocar nada**: el host del 8 de mayo registró segfaults
> simultáneos en `postgres`, `mysql`, `apache2`, `ssh` y otros
> servicios. Si eso se repite, considera primero un **Stop / Start de
> la instancia EC2** (no Reboot — Stop+Start mueve la VM a otro host
> físico). La migración aquí descrita asume hardware sano.

## 0. Pre-requisitos

- Acceso SSH al EC2 como `ubuntu` con sudo.
- Cluster `12/main` arriba y respondiendo (`pg_lsclusters` lo muestra
  como `online`).
- Backup automatizado funcionando o, como mínimo, un dump fresco a
  mano (paso 1).
- El servicio `vvaley` parado durante la migración para evitar que
  Prisma escriba mientras vaciamos el cluster.

## 1. Backup fresco antes de empezar

Aunque el timer `vvaley-db-backup` esté activo, lanza uno explícito
justo antes:

```bash
sudo systemctl start vvaley-db-backup.service
ls -lh /var/backups/vvaley/ | tail -3
```

O directamente:

```bash
DATABASE_URL=$(grep -E '^DATABASE_URL=' /home/ubuntu/web/vvaley/.env | cut -d= -f2- | tr -d '"')
sudo -u postgres pg_dump --no-owner --clean --if-exists --quote-all-identifiers \
  "$DATABASE_URL" | gzip -c > /var/backups/vvaley/pre-pg17-$(date -u +%Y%m%dT%H%M%SZ).sql.gz
```

Deja constancia del hash:

```bash
sha256sum /var/backups/vvaley/pre-pg17-*.sql.gz
```

## 2. Añadir el repo PGDG y instalar Postgres 17

Ubuntu 20.04 (Focal) no ofrece PG17 en sus repos por defecto.

```bash
sudo apt-get update
sudo apt-get install -y curl ca-certificates gnupg lsb-release
sudo install -d /usr/share/postgresql-common/pgdg
sudo curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc

echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  | sudo tee /etc/apt/sources.list.d/pgdg.list

sudo apt-get update
sudo apt-get install -y postgresql-17 postgresql-contrib-17
```

`pg_lsclusters` debería listar ahora **dos** clusters:

```
Ver Cluster Port Status Owner    Data directory               Log file
12  main    5432 online postgres /var/lib/postgresql/12/main  /var/log/postgresql/postgresql-12-main.log
17  main    5433 online postgres /var/lib/postgresql/17/main  /var/log/postgresql/postgresql-17-main.log
```

PG17 escucha en **5433** por defecto (PG12 sigue en 5432).

## 3. Habilitar la extensión `unaccent` en el cluster nuevo

La migración 20260509100000 la habilita automáticamente cuando se
ejecute `prisma migrate deploy`, pero conviene asegurarse de que el
binario está disponible:

```bash
sudo apt-get install -y postgresql-contrib-17  # ya en paso 2
```

## 4. Crear usuario y BD en PG17 con las mismas credenciales

Lee la URL de `/home/ubuntu/web/vvaley/.env` y replica usuario, contraseña
y nombre de BD:

```bash
DATABASE_URL=$(grep -E '^DATABASE_URL=' /home/ubuntu/web/vvaley/.env | cut -d= -f2- | tr -d '"')
echo "Origen: $DATABASE_URL"
# postgresql://USER:PASS@localhost:5432/DB?schema=public

sudo -u postgres psql -p 5433 <<'SQL'
-- Sustituye USER, PASS y DB por los valores del DATABASE_URL.
CREATE USER vvaley WITH PASSWORD 'CHANGE_ME';
CREATE DATABASE vvaley OWNER vvaley;
SQL
```

## 5. Volcar PG12 → restaurar en PG17

```bash
# Vuelca SOLO los datos y el esquema lógico, sin owners/grants ni roles
# globales. Mantén la opción --no-owner para que el restore lo escriba
# todo bajo el usuario vvaley del paso 4.
sudo -u postgres pg_dump -p 5432 \
  --no-owner --no-privileges --quote-all-identifiers \
  --format=custom --file=/tmp/vvaley.dump vvaley

# Restaura en PG17 (puerto 5433). --clean borra cualquier cosa previa
# en la BD destino para que la operación sea idempotente.
sudo -u postgres pg_restore -p 5433 \
  --no-owner --role=vvaley --clean --if-exists \
  --dbname=vvaley /tmp/vvaley.dump
```

Repite la migración de Prisma para asegurar que `_prisma_migrations`
queda consistente:

```bash
cd /home/ubuntu/web/vvaley
# DATABASE_URL ya apunta al puerto 5432; añadimos un alias temporal en
# este shell que apunta a 5433 sin tocar el .env todavía.
DATABASE_URL="$(echo "$DATABASE_URL" | sed 's/:5432\//:5433\//')" \
  timeout --foreground 90s pnpm prisma migrate deploy
```

## 6. Cortar tráfico durante el cambio de puerto

```bash
sudo systemctl stop vvaley
```

(El timer `vvaley-cron.timer` puede seguir, no escribe en BD; si
prefieres pararlo: `sudo systemctl stop vvaley-cron.timer`.)

## 7. Cambiar puertos: PG17 al 5432, PG12 al 5433

Editamos los `postgresql.conf` de ambos clusters.

```bash
# PG12 al 5433
sudo sed -i 's/^port = 5432/port = 5433/' /etc/postgresql/12/main/postgresql.conf

# PG17 al 5432
sudo sed -i 's/^port = 5433/port = 5432/' /etc/postgresql/17/main/postgresql.conf

sudo systemctl restart postgresql@12-main
sudo systemctl restart postgresql@17-main
pg_lsclusters
```

Esperado:
```
12  main    5433 online ...
17  main    5432 online ...
```

## 8. Reanudar la app y verificar

```bash
sudo systemctl start vvaley
sudo systemctl status vvaley --no-pager --lines=5
curl -sI https://valiravalley.com/es | head -3
```

Smoke tests:

- `/admin` carga el dashboard sin errores Prisma.
- `/{locale}/buscar?q=valira` devuelve resultados (la extensión
  `unaccent` ya está en PG17).
- Crear, guardar y borrar un post de prueba en `/admin/blog/nuevo`.
- Lanzar una campaña de prueba a un solo email (cuenta interna).

## 9. Cuando lleves 24–48 h estable, limpia PG12

```bash
# Asegúrate de que NADIE escribe en :5433.
sudo ss -tnp | grep 5433 || echo 'sin clientes en 5433'

# Borra el cluster viejo (irreversible — confirma backup primero).
sudo pg_dropcluster --stop 12 main

# Quita los paquetes 12.x si ya no quieres su cliente tampoco.
sudo apt-get purge -y postgresql-12 postgresql-client-12
sudo apt-get autoremove -y
```

## 10. Reactivar el timer de backup contra el cluster nuevo

El script `vvaley-db-backup` usa `DATABASE_URL` del `.env`, que sigue
apuntando a 5432, por lo que tras el paso 7 ya está backeando contra
PG17 sin más cambios.

```bash
sudo systemctl list-timers vvaley-db-backup.timer
sudo systemctl start vvaley-db-backup.service  # corre uno manual ahora
ls -lh /var/backups/vvaley/ | tail -3
```

## Rollback rápido

Si en cualquier momento entre los pasos 7 y 9 algo va mal:

```bash
sudo systemctl stop vvaley
sudo sed -i 's/^port = 5432/port = 5433/' /etc/postgresql/17/main/postgresql.conf
sudo sed -i 's/^port = 5433/port = 5432/' /etc/postgresql/12/main/postgresql.conf
sudo systemctl restart postgresql@17-main postgresql@12-main
sudo systemctl start vvaley
```

Vuelves a estar contra PG12 con todos los datos originales.
