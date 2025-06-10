import django_filters
from places.models import Place, UserNote, Comment

class PlaceFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(lookup_expr='icontains')
    categories = django_filters.CharFilter(lookup_expr='icontains')
    status = django_filters.MultipleChoiceFilter(choices=Place.STATUS_CHOICES)

    class Meta:
        model = Place
        fields = ['name', 'categories', 'status', 'owner']

class UserNoteFilter(django_filters.FilterSet):
    text = django_filters.CharFilter(lookup_expr='icontains')
    moderation_status = django_filters.MultipleChoiceFilter(choices=UserNote.moderation_status.field.choices)
    rating = django_filters.RangeFilter() 
    
    class Meta:
        model = UserNote
        fields = ['place', 'user', 'moderation_status', 'rating']

class CommentFilter(django_filters.FilterSet):
    text = django_filters.CharFilter(lookup_expr='icontains')
    moderation_status = django_filters.MultipleChoiceFilter(choices=Comment.moderation_status.field.choices)

    class Meta:
        model = Comment
        fields = ['note', 'user', 'moderation_status']