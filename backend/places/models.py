from django.contrib.gis.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Avg, Count
from django.db.models.functions import Coalesce
from django.db.models.signals import post_delete
from django.dispatch import receiver

User = get_user_model()

class Place(models.Model):
    name = models.CharField(max_length=255, verbose_name="Название места", db_index=True)
    description = models.TextField(verbose_name="Описание (историческая справка, мифы, легенды)")
    location = models.PointField(srid=4326, geography=True, verbose_name="Географические координаты (долгота, широта)")
    categories = models.CharField(
        max_length=255,
        verbose_name="Категории (например: миф, легенда, историческое место)",
        blank=True,
        null=True,
        db_index=True
    )
    STATUS_CHOICES = [
        ('pending', 'Ожидает модерации'),
        ('approved', 'Одобрено'),
        ('rejected', 'Отклонено'),
    ]
    status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Статус модерации",
        db_index=True
    )
    image = models.ImageField(upload_to='place_images/', blank=True, null=True, verbose_name="Изображение места")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='places',
        verbose_name="Владелец",
        db_index=True
    )
    favorites = models.ManyToManyField(
        User,
        related_name='favorite_places',
        blank=True,
        verbose_name="Избранные пользователи"
    )
    rejection_reason = models.TextField(blank=True, null=True, verbose_name="Причина отклонения")

    class Meta:
        verbose_name = "Место"
        verbose_name_plural = "Места"
        ordering = ['name']

    def __str__(self):
        return self.name

    def update_average_rating(self):
        approved_notes = self.user_notes.filter(moderation_status='approved', rating__isnull=False)
        average_rating_data = approved_notes.aggregate(
            avg_rating=Coalesce(Avg('rating'), 0.0),
            count_rating=Count('rating')
        )
        self.average_rating = average_rating_data['avg_rating']
        self.rating_count = average_rating_data['count_rating']
        self.save()

    # Ensure status can be updated during moderation
    def can_moderate(self, user):
        return user.is_superuser or user.groups.filter(name='Moderators').exists()


class UserNote(models.Model):
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='user_notes', verbose_name="Место", db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Пользователь", db_index=True)
    text = models.TextField(verbose_name="Текст заметки")
    moderation_status = models.CharField(
        max_length=50,
        choices=[('pending', 'Ожидает модерации'), ('approved', 'Одобрено'), ('rejected', 'Отклонено')],
        default='pending',
        verbose_name="Статус модерации",
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    image = models.ImageField(
        upload_to='note_images/',
        blank=True,
        null=True,
        verbose_name="Изображение к заметке"
    )
    rejection_reason = models.TextField(blank=True, null=True, verbose_name="Причина отклонения")

    class Meta:
        verbose_name = "Заметка пользователя"
        verbose_name_plural = "Заметки пользователей"

    def __str__(self):
        return f"Заметка {self.user.username} о {self.place.name}"

    # Ensure moderation status can be updated
    def can_moderate(self, user):
        return user.is_superuser or user.groups.filter(name='Moderators').exists()


class Comment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Пользователь", db_index=True)
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='comments', verbose_name="Место", db_index=True)
    text = models.TextField(verbose_name="Текст комментария")
    moderation_status = models.CharField(
        max_length=50,
        choices=[('pending', 'Ожидает модерации'), ('approved', 'Одобрено'), ('rejected', 'Отклонено')],
        default='pending',
        verbose_name="Статус модерации",
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    rejection_reason = models.TextField(blank=True, null=True, verbose_name="Причина отклонения")

    class Meta:
        verbose_name = "Комментарий"
        verbose_name_plural = "Комментарии"
        ordering = ['created_at']

    def __str__(self):
        return f"Комментарий от {self.user.username} к месту {self.place.name}"

    def can_moderate(self, user):
        return user.is_superuser or user.groups.filter(name='Moderators').exists()


class PlaceImage(models.Model):
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='images', verbose_name='Место')
    image = models.ImageField(upload_to='place_images/', verbose_name='Изображение')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Изображение места'
        verbose_name_plural = 'Изображения мест'

    def __str__(self):
        return f"Изображение для {self.place.name} ({self.id})"

@receiver(post_delete, sender=PlaceImage)
def delete_place_image_file(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(False)

@receiver(post_delete, sender=Place)
def delete_all_place_images(sender, instance, **kwargs):
    for img in instance.images.all():
        if img.image:
            img.image.delete(False)

class NoteImage(models.Model):
    note = models.ForeignKey(UserNote, on_delete=models.CASCADE, related_name='images', verbose_name='Заметка')
    image = models.ImageField(upload_to='note_images/', verbose_name='Изображение')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Изображение заметки'
        verbose_name_plural = 'Изображения заметок'

    def __str__(self):
        return f"Изображение для заметки {self.note.id} ({self.id})"

@receiver(post_delete, sender=NoteImage)
def delete_note_image_file(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(False)

@receiver(post_delete, sender=UserNote)
def delete_all_note_images(sender, instance, **kwargs):
    for img in instance.images.all():
        if img.image:
            img.image.delete(False)