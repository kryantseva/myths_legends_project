# backend/myths_legends_project/urls.py

from django.contrib import admin
from django.urls import path, include

# from drf_yasg.openapi import APIKey, IN_HEADER # Эта строка должна быть закомментирована/удалена

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('places.api.urls')),
    path('api/auth/', include('users.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)