"""
WSGI config para o projeto SpendingMap.
Em produção, definir DJANGO_SETTINGS_MODULE=config.settings.production
"""
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

application = get_wsgi_application()
