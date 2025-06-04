# backend/places/admin.py

from django.contrib import admin
from django.contrib.gis.admin import OSMGeoAdmin # Используем OSMGeoAdmin для отображения карты
from .models import Place, UserNote

# Регистрируем модель Place с использованием OSMGeoAdmin для интерактивной карты
@admin.register(Place)
class PlaceAdmin(OSMGeoAdmin):
    list_display = ('name', 'categories', 'created_at', 'updated_at')
    search_fields = ('name', 'description', 'categories')
    # Добавляем поля latitude и longitude в readonly_fields, если они не являются частью редактирования
    # Если вы хотите редактировать координаты напрямую, то latitude/longitude должны быть в fields,
    # но PointField будет отображаться как текст. OSMGeoAdmin автоматически создает виджет карты для PointField.
    # fieldsets = (
    #     (None, {
    #         'fields': ('name', 'description', 'location', 'categories', 'image')
    #     }),
    # )


@admin.register(UserNote)
class UserNoteAdmin(admin.ModelAdmin):
    list_display = ('place', 'user', 'moderation_status', 'created_at')
    list_filter = ('moderation_status',)
    search_fields = ('place__name', 'user__username', 'text')