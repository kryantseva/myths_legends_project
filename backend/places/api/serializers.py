from rest_framework_gis.serializers import GeoFeatureModelSerializer
from rest_framework import serializers
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from places.models import Place, UserNote, Comment
from django.db.models import Avg, Count, F, Q

class UserNoteSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserNote
        fields = ['id', 'place', 'user', 'author_username', 'text', 'rating', 'image', 'moderation_status', 'created_at', 'updated_at']
        read_only_fields = ['user', 'moderation_status', 'created_at', 'updated_at']

class CommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'note', 'user', 'author_username', 'text', 'moderation_status', 'created_at', 'updated_at']
        read_only_fields = ['user', 'moderation_status', 'created_at', 'updated_at']

class PlaceSerializer(GeoFeatureModelSerializer):
    distance = serializers.SerializerMethodField()
    notes_count = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()
    current_user_note = serializers.SerializerMethodField()
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Place
        geo_field = "location"
        fields = [
            "id", "name", "description", "location", "categories", "status",
            "created_at", "updated_at", "image", "distance",
            "notes_count", "avg_rating", "current_user_note"
        ]
        read_only_fields = ['created_at', 'updated_at', 'status', 'notes_count', 'avg_rating', 'current_user_note']

    def get_distance(self, obj):
        user_location = self.context.get('user_location')
        if user_location and obj.location:
            dist = getattr(obj, 'distance', None)
            if dist is not None:
                return round(dist.m, 2)
        return None

    def get_notes_count(self, obj):
        return obj.user_notes.filter(moderation_status='approved').count()

    def get_avg_rating(self, obj):
        avg = obj.user_notes.filter(moderation_status='approved', rating__isnull=False).aggregate(Avg('rating'))['rating__avg']
        return round(avg, 1) if avg else None

    def get_current_user_note(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                note = obj.user_notes.get(user=request.user)
                return UserNoteSerializer(note, context={'request': request}).data
            except UserNote.DoesNotExist:
                return None
        return None