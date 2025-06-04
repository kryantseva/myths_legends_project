# backend/places/api/urls.py

from rest_framework.routers import DefaultRouter
from .viewsets import PlaceViewSet, UserNoteViewSet, CommentViewSet

router = DefaultRouter()
router.register(r'places', PlaceViewSet, basename='place')
router.register(r'notes', UserNoteViewSet, basename='usernote')
router.register(r'comments', CommentViewSet, basename='comment') # Убедитесь, что эта строка есть

urlpatterns = router.urls