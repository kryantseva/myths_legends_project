"""
WSGI config for myths_legends_project project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https:
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myths_legends_project.settings')

application = get_wsgi_application()
