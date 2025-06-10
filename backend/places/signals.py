# backend/places/signals.py

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg, Count
from places.models import Place, UserNote # Импортируем Place и UserNote

@receiver(post_save, sender=UserNote)
def user_note_post_save(sender, instance, **kwargs):
    pass

@receiver(post_delete, sender=UserNote)
def user_note_post_delete(sender, instance, **kwargs):
    pass