# backend/places/apps.py

from django.apps import AppConfig

class PlacesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'places'

    def ready(self):
        import places.signals # Убедитесь, что эта строка есть и она правильная