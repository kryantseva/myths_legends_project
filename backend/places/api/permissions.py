# places/api/permissions.py
from rest_framework import permissions

class IsOwnerOrAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object, or admins, to edit/delete it.
    Allows read access to anyone.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        # Write permissions are only allowed to the owner or admin.
        return obj.owner == request.user or request.user.is_superuser

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object, or admins, to view, edit, or delete it.
    """
    def has_object_permission(self, request, view, obj):
        # Write permissions are only allowed to the owner or admin.
        return obj.user == request.user or request.user.is_superuser

# --- ADD THIS NEW PERMISSION CLASS ---
class IsModeratorOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow users in 'Moderators' group or superusers.
    """
    def has_permission(self, request, view):
        return request.user and (request.user.is_superuser or request.user.groups.filter(name='Moderators').exists())

    def has_object_permission(self, request, view, obj):
        # Optionally, you can add object-level permission here if needed,
        # but for moderation, has_permission is usually sufficient.
        return self.has_permission(request, view)