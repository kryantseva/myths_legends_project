from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from django.db.models import Avg, Count, Q
from django.db.models.functions import Coalesce
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.contrib.gis.db.models.functions import Distance
import logging

from places.models import Place, UserNote, Comment, PlaceImage, NoteImage
from .serializers import PlaceSerializer, UserNoteSerializer, CommentSerializer
from .permissions import IsOwnerOrAdminOrReadOnly, IsOwnerOrAdmin, IsModeratorOrAdmin
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

class PlaceViewSet(viewsets.ModelViewSet):
    queryset = Place.objects.all().select_related('owner').prefetch_related('user_notes', 'favorites')
    serializer_class = PlaceSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'categories']
    search_fields = ['name', 'description', 'categories']
    ordering_fields = ['created_at', 'name', 'notes_count', 'distance']

    def get_permissions(self):
        if self.action == 'toggle_favorite':
            self.permission_classes = [IsAuthenticated]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAuthenticated, IsOwnerOrAdminOrReadOnly]
        elif self.action in ['list', 'retrieve', 'nearest']:
            self.permission_classes = [AllowAny]
        elif self.action in ['approve', 'reject']:
            return [IsAdminUser(), IsModeratorOrAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = super().get_queryset()
        id_in = self.request.query_params.get('id__in')
        if id_in:
            ids = [int(i) for i in id_in.split(',') if i]
            return Place.objects.filter(id__in=ids)
        user = self.request.user
        owner_param = self.request.query_params.get('owner')
        status_param = self.request.query_params.getlist('status')
        # Если есть фильтр owner (например, профиль)
        if owner_param:
            queryset = queryset.filter(owner_id=owner_param)
            # Если фильтруем по статусу (pending/rejected), применяем фильтр
            if status_param:
                queryset = queryset.filter(status__in=status_param)
        # Если модератор/админ (раздел модерации) — только pending
        elif user.is_superuser or user.groups.filter(name='Moderators').exists():
            queryset = queryset.filter(status='pending')
        # Для карты и остальных — только approved
        else:
            queryset = queryset.filter(status='approved')
        return queryset

    def perform_create(self, serializer):
        logger = logging.getLogger('django')
        logger.warning(f'FILES: {self.request.FILES}')
        logger.warning(f'DATA: {self.request.data}')
        logger.warning(f'USER: {self.request.user}')
        status = 'approved' if self.request.user.is_superuser else 'pending'
        instance = serializer.save(owner=self.request.user, status=status)
        logger.warning(f'CREATED INSTANCE: {instance}')

        # Обработка загрузки нескольких файлов (до 5)
        image_files = self.request.FILES.getlist('image_files')
        for i, img in enumerate(image_files):
            if i >= 5:
                break
            PlaceImage.objects.create(place=instance, image=img)

    @action(detail=False, methods=['get'])
    def nearest(self, request):
        latitude = request.query_params.get('lat')
        longitude = request.query_params.get('lon')
        radius_km = request.query_params.get('radius_km')

        if not (latitude and longitude):
            return Response({"detail": "Parameters 'lat' and 'lon' are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user_location = Point(float(longitude), float(latitude), srid=4326)
        except ValueError:
            return Response({"detail": "Invalid values for 'lat' or 'lon'."}, status=status.HTTP_400_BAD_REQUEST)

        queryset = self.get_queryset()

        if radius_km:
            try:
                radius_meters = float(radius_km) * 1000
                queryset = queryset.filter(location__dwithin=(user_location, D(m=radius_meters)))
            except ValueError:
                return Response({"detail": "Invalid value for 'radius_km'."}, status=status.HTTP_400_BAD_REQUEST)

        queryset = queryset.annotate(distance=Distance('location', user_location)).order_by('distance')

        serializer = self.get_serializer(queryset, many=True, context={'request': request, 'user_location': user_location})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def toggle_favorite(self, request, pk=None):
        place = self.get_object()
        user = request.user
        if user in place.favorites.all():
            place.favorites.remove(user)
            return Response({"status": "removed from favorites"}, status=status.HTTP_200_OK)
        else:
            place.favorites.add(user)
            return Response({"status": "added to favorites"}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser, IsModeratorOrAdmin])
    def approve(self, request, pk=None):
        place = self.get_object()
        if not place.can_moderate(request.user):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        place.status = 'approved'
        place.save()
        return Response({'status': 'place approved', 'id': place.id}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser, IsModeratorOrAdmin])
    def reject(self, request, pk=None):
        place = self.get_object()
        reason = request.data.get('rejection_reason', '')
        place.status = 'rejected'
        place.rejection_reason = reason
        place.save()
        return Response({'status': 'place rejected', 'id': place.id, 'rejection_reason': place.rejection_reason}, status=status.HTTP_200_OK)


class UserNoteViewSet(viewsets.ModelViewSet):
    queryset = UserNote.objects.all().select_related('user', 'place')
    serializer_class = UserNoteSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['place', 'moderation_status']
    search_fields = ['text']
    ordering_fields = ['created_at', 'updated_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]
        elif self.action in ['approve', 'reject']:
            return [IsAdminUser(), IsModeratorOrAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = super().get_queryset()
        user_param = self.request.query_params.get('user')
        if user_param:
            queryset = queryset.filter(user_id=user_param)
        # иначе не фильтруем по user, возвращаем все подходящие записи
        return queryset

    def perform_create(self, serializer):
        status = 'approved' if self.request.user.is_superuser else 'pending'
        note = serializer.save(user=self.request.user, moderation_status=status)
        # Обработка загрузки нескольких файлов (до 5)
        image_files = self.request.FILES.getlist('image_files')
        for i, img in enumerate(image_files):
            if i >= 5:
                break
            NoteImage.objects.create(note=note, image=img)

    def perform_update(self, serializer):
        if serializer.instance.moderation_status == 'approved' and self.request.user == serializer.instance.user:
            serializer.save(moderation_status='pending')
        else:
            serializer.save()

    def perform_destroy(self, instance):
        instance.delete()

    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser, IsModeratorOrAdmin])
    def approve(self, request, pk=None):
        note = self.get_object()
        note.moderation_status = 'approved'
        note.save()
        return Response({'status': 'note approved', 'id': note.id}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser, IsModeratorOrAdmin])
    def reject(self, request, pk=None):
        note = self.get_object()
        reason = request.data.get('rejection_reason', '')
        note.moderation_status = 'rejected'
        note.rejection_reason = reason
        note.save()
        return Response({'status': 'note rejected', 'id': note.id, 'rejection_reason': note.rejection_reason}, status=status.HTTP_200_OK)


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all().select_related('user', 'place')
    serializer_class = CommentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['place', 'moderation_status']
    search_fields = ['text']
    ordering_fields = ['created_at', 'updated_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]
        elif self.action in ['approve', 'reject']:
            return [IsAdminUser(), IsModeratorOrAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = super().get_queryset()
        user_param = self.request.query_params.get('user')
        if user_param:
            queryset = queryset.filter(user_id=user_param)
        # иначе не фильтруем по user, возвращаем все подходящие записи
        return queryset

    def perform_create(self, serializer):
        status = 'approved' if self.request.user.is_superuser else 'pending'
        serializer.save(user=self.request.user, moderation_status=status)

    def perform_update(self, serializer):
        if serializer.instance.moderation_status == 'approved' and self.request.user == serializer.instance.user:
            serializer.save(moderation_status='pending')
        else:
            serializer.save()

    def perform_destroy(self, instance):
        instance.delete()

    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser, IsModeratorOrAdmin])
    def approve(self, request, pk=None):
        comment = self.get_object()
        comment.moderation_status = 'approved'
        comment.save()
        return Response({'status': 'comment approved', 'id': comment.id}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser, IsModeratorOrAdmin])
    def reject(self, request, pk=None):
        comment = self.get_object()
        reason = request.data.get('rejection_reason', '')
        comment.moderation_status = 'rejected'
        comment.rejection_reason = reason
        comment.save()
        return Response({'status': 'comment rejected', 'id': comment.id, 'rejection_reason': comment.rejection_reason}, status=status.HTTP_200_OK)