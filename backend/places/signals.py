# backend/places/signals.py

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg, Count
from places.models import Place, UserNote # Импортируем Place и UserNote

def recalculate_place_rating(place_id):
    """
    Пересчитывает средний рейтинг и количество оценок для указанного места.
    """
    place = Place.objects.get(id=place_id)
    
    # Фильтруем только заметки, которые одобрены и имеют оценку
    approved_notes_with_rating = UserNote.objects.filter(
        place=place,
        moderation_status='approved',
        rating__isnull=False
    )
    
    # Считаем средний рейтинг и количество оценок
    aggregation = approved_notes_with_rating.aggregate(
        avg_rating=Avg('rating'),
        count_rating=Count('id')
    )
    
    place.average_rating = aggregation['avg_rating'] if aggregation['avg_rating'] is not None else 0.0
    place.rating_count = aggregation['count_rating']
    place.save(update_fields=['average_rating', 'rating_count'])

@receiver(post_save, sender=UserNote)
def user_note_post_save(sender, instance, **kwargs):
    """
    Сигнал после сохранения заметки пользователя.
    Пересчитывает рейтинг места.
    """
    if instance.rating is not None and instance.moderation_status == 'approved':
        recalculate_place_rating(instance.place.id)

@receiver(post_delete, sender=UserNote)
def user_note_post_delete(sender, instance, **kwargs):
    """
    Сигнал после удаления заметки пользователя.
    Пересчитывает рейтинг места.
    """
    if instance.rating is not None and instance.moderation_status == 'approved':
        recalculate_place_rating(instance.place.id)