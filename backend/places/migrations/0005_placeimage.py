# Generated by Django 4.2.7 on 2025-06-11 06:36

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("places", "0004_remove_comment_note_comment_place"),
    ]

    operations = [
        migrations.CreateModel(
            name="PlaceImage",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "image",
                    models.ImageField(
                        upload_to="place_images/", verbose_name="Изображение"
                    ),
                ),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                (
                    "place",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="images",
                        to="places.place",
                        verbose_name="Место",
                    ),
                ),
            ],
            options={
                "verbose_name": "Изображение места",
                "verbose_name_plural": "Изображения мест",
            },
        ),
    ]
