# Generated by Django 4.2.7 on 2025-06-10 08:11

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("places", "0003_remove_place_average_rating_and_more"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="comment",
            name="note",
        ),
        migrations.AddField(
            model_name="comment",
            name="place",
            field=models.ForeignKey(
                default=1,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="comments",
                to="places.place",
                verbose_name="Место",
            ),
            preserve_default=False,
        ),
    ]
