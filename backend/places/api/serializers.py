# places/serializers.py

from rest_framework_gis.serializers import GeoFeatureModelSerializer
from rest_framework import serializers
from django.contrib.auth.models import User
from places.models import Place, UserNote, Comment
from django.db.models import Avg, Count, F, Q
from django.contrib.gis.geos import Point # Импорт для работы с географическими точками
import json # Импорт для парсинга JSON-строк

class UserSerializer(serializers.ModelSerializer):
    """
    Сериализатор для модели User, включающий группы пользователя.
    """
    groups = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'is_superuser', 'groups']

    def get_groups(self, obj):
        """Возвращает список названий групп, к которым принадлежит пользователь."""
        return [group.name for group in obj.groups.all()]

class UserNoteSerializer(serializers.ModelSerializer):
    """
    Сериализатор для модели UserNote (заметки пользователя),
    включающий имя автора и вложенный сериализатор пользователя.
    """
    author_username = serializers.CharField(source='user.username', read_only=True)
    user = UserSerializer(read_only=True) # Пользователь только для чтения, заполняется на бэкенде
    rejection_reason = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = UserNote
        fields = ['id', 'place', 'user', 'author_username', 'text', 'rating', 'image', 'moderation_status', 'created_at', 'updated_at', 'rejection_reason']
        read_only_fields = ['user', 'moderation_status', 'created_at', 'updated_at'] # Поля только для чтения

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and hasattr(obj.image, 'url'):
            url = obj.image.url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        return None

class CommentSerializer(serializers.ModelSerializer):
    """
    Сериализатор для модели Comment (комментарии к заметкам),
    включающий имя автора и вложенный сериализатор пользователя.
    """
    author_username = serializers.CharField(source='user.username', read_only=True)
    user = UserSerializer(read_only=True) # Пользователь только для чтения
    rejection_reason = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = Comment
        fields = ['id', 'note', 'user', 'author_username', 'text', 'moderation_status', 'created_at', 'updated_at', 'rejection_reason']
        read_only_fields = ['user', 'moderation_status', 'created_at', 'updated_at'] # Поля только для чтения

class PlaceSerializer(GeoFeatureModelSerializer):
    distance = serializers.SerializerMethodField()
    notes_count = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()
    current_user_note = serializers.SerializerMethodField()
    owner = UserSerializer(read_only=True)
    image = serializers.SerializerMethodField()
    rejection_reason = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = Place
        geo_field = "location"
        fields = [
            "id", "name", "description", "location", "categories", "status",
            "created_at", "updated_at", "image", "distance",
            "notes_count", "avg_rating", "current_user_note", "owner", "rejection_reason"
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'status', 'notes_count', 'avg_rating', 'current_user_note'
        ]

    # to_internal_value остается таким же, чтобы парсить входящие строки 'geometry' и 'properties'
    def to_internal_value(self, data):
        mutable_data = data.copy()

        # Обработка 'geometry'
        if 'geometry' in mutable_data and isinstance(mutable_data['geometry'], str):
            try:
                mutable_data['geometry'] = json.loads(mutable_data['geometry'])
            except json.JSONDecodeError:
                raise serializers.ValidationError({"geometry": "Invalid JSON format for geometry."})
        
        # Обработка 'properties'
        if 'properties' in mutable_data and isinstance(mutable_data['properties'], str):
            try:
                mutable_data['properties'] = json.loads(mutable_data['properties'])
            except json.JSONDecodeError:
                raise serializers.ValidationError({"properties": "Invalid JSON format for properties."})

        return super().to_internal_value(mutable_data)

    def create(self, validated_data):
        """
        Переопределение метода создания для преобразования location из словаря в Point.
        """
        # location_data уже будет словарем благодаря to_internal_value
        location_data = validated_data.pop('location', None)

        if location_data:
            # Убеждаемся, что location_data - это словарь GeoJSON Point
            if isinstance(location_data, dict) and location_data.get('type') == 'Point' and 'coordinates' in location_data:
                lon, lat = location_data['coordinates'][0], location_data['coordinates'][1]
                validated_data['location'] = Point(lon, lat) # <-- ПРЕОБРАЗОВАНИЕ В ОБЪЕКТ Point
            else:
                raise serializers.ValidationError({"location": "Invalid GeoJSON Point format or not a dictionary after parsing."})
        else:
            raise serializers.ValidationError({"location": "Location data is missing."}) # Добавьте это, если location обязательно

        return super().create(validated_data)

    def update(self, instance, validated_data):
        """
        Переопределение метода обновления для преобразования location из словаря в Point.
        """
        location_data = validated_data.pop('location', None)

        if location_data:
            # Убеждаемся, что location_data - это словарь GeoJSON Point
            if isinstance(location_data, dict) and location_data.get('type') == 'Point' and 'coordinates' in location_data:
                lon, lat = location_data['coordinates'][0], location_data['coordinates'][1]
                validated_data['location'] = Point(lon, lat) # <-- ПРЕОБРАЗОВАНИЕ В ОБЪЕКТ Point
            else:
                raise serializers.ValidationError({"location": "Invalid GeoJSON Point format or not a dictionary after parsing."})

        return super().update(instance, validated_data)

    def get_distance(self, obj):
        """
        Рассчитывает и возвращает расстояние от объекта до местоположения пользователя.
        """
        user_location = self.context.get('user_location')
        if user_location and obj.location:
            dist = getattr(obj, 'distance', None) # Получаем атрибут distance, если он был аннотирован
            if dist is not None:
                return round(dist.m, 2) # Возвращаем расстояние в метрах, округленное до 2 знаков
        return None

    def get_notes_count(self, obj):
        """
        Возвращает количество одобренных заметок для данного места.
        """
        return obj.user_notes.filter(moderation_status='approved').count()

    def get_avg_rating(self, obj):
        """
        Возвращает средний рейтинг для данного места, основанный на одобренных заметках.
        """
        avg = obj.user_notes.filter(moderation_status='approved', rating__isnull=False).aggregate(Avg('rating'))['rating__avg']
        return round(avg, 1) if avg else None # Округляем до 1 знака после запятой

    def get_current_user_note(self, obj):
        """
        Возвращает заметку текущего авторизованного пользователя для данного места, если она существует.
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                # Пытаемся найти заметку текущего пользователя для этого места
                note = obj.user_notes.get(user=request.user)
                # Сериализуем найденную заметку
                return UserNoteSerializer(note, context={'request': request}).data
            except UserNote.DoesNotExist:
                return None # Если заметки нет, возвращаем None
        return None # Если пользователь не авторизован, возвращаем None

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and hasattr(obj.image, 'url'):
            url = obj.image.url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        return None