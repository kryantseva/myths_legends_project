# Generated by Django 4.2.7 on 2025-06-10 07:08

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("places", "0002_alter_usernote_unique_together"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="place",
            name="average_rating",
        ),
        migrations.RemoveField(
            model_name="place",
            name="rating_count",
        ),
        migrations.RemoveField(
            model_name="usernote",
            name="rating",
        ),
    ]
