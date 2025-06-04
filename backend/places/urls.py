from rest_framework.routers import DefaultRouter
from places.api.viewsets import PlaceViewSet, UserNoteViewSet, CommentViewSet

router = DefaultRouter()
router.register(r'places', PlaceViewSet, basename='place')
router.register(r'notes', UserNoteViewSet, basename='usernote')
router.register(r'comments', CommentViewSet, basename='comment')

urlpatterns = router.urls