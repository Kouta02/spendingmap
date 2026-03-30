#!/bin/bash
# Script para confirmar despesas recorrentes automaticamente.
# Executado diariamente via cron.

cd /srv/spendingmap/backend
source .venv/bin/activate
set -a && source .env.production && set +a
DJANGO_SETTINGS_MODULE=config.settings.production python manage.py confirmar_recorrentes >> /var/log/spendingmap-recorrentes.log 2>&1

# Gerar contracheque do mês financeiro atual (se ainda não existir)
DJANGO_SETTINGS_MODULE=config.settings.production python manage.py gerar_contracheque >> /var/log/spendingmap-contracheque.log 2>&1

# Enviar alertas de boletos via Telegram
DJANGO_SETTINGS_MODULE=config.settings.production python manage.py alertar_boletos_telegram >> /var/log/spendingmap-telegram.log 2>&1
