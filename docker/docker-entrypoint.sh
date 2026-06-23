#!/bin/sh
# Entrypoint do backend: aplica migrações, coleta estáticos e sobe o processo (CMD).
# migrate é idempotente — se o banco já vier restaurado do dump (django_migrations
# preenchida), vira no-op e não recria/altera nada.
set -e

echo "[entrypoint] migrate..."
python manage.py migrate --noinput

# collectstatic NÃO derruba o serviço se falhar (estáticos do admin/DRF são secundários;
# a app usa Token auth e não depende deles para servir).
echo "[entrypoint] collectstatic..."
python manage.py collectstatic --noinput || echo "[entrypoint] WARN: collectstatic falhou (seguindo mesmo assim)"

echo "[entrypoint] iniciando: $@"
exec "$@"
