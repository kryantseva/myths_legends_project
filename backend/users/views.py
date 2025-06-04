# backend/users/views.py

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from django.contrib.auth.models import User

from .serializers import UserSerializer, AuthTokenSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        # Автоматически создать токен для нового пользователя после регистрации
        token, created = Token.objects.get_or_create(user=user) # Получаем токен здесь

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        
        # Получаем пользователя, который был создан в perform_create
        user = User.objects.get(username=serializer.data['username'])
        token = Token.objects.get(user=user).key # И его токен

        # Формируем ответ с токеном
        return Response({
            'user_id': user.pk,
            'username': user.username,
            'email': user.email,
            'token': token # <--- ДОБАВЛЕНО/ИЗМЕНЕНО
        }, status=status.HTTP_201_CREATED, headers=headers)

class LoginView(ObtainAuthToken):
    # Используем кастомный сериализатор для корректного сообщения об ошибке
    serializer_class = AuthTokenSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'email': user.email,
            'username': user.username
        })

class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        try:
            request.user.auth_token.delete()
        except Token.DoesNotExist: # <--- ДОБАВЛЕНО: обрабатываем случай, если токена нет
            pass # Токен уже был удален или его не было

        return Response(status=status.HTTP_200_OK)

class UserProfileView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user