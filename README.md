# Myths & Legends — Исторические места и легенды Казани

## О проекте

Веб-приложение для отображения исторических и легендарных мест Казани на карте, с возможностью добавлять заметки, комментарии, избранное и модерировать контент. Проект состоит из:
- **Backend:** Django + Django REST Framework + PostGIS (геоданные, токен-авторизация)
- **Frontend:** React (SPA)

## Основные возможности
- Интерактивная карта с историческими местами
- Добавление и модерация мест, заметок, комментариев
- Система избранного ("звёздочки")
- Галереи изображений для мест и заметок
- Профиль пользователя с избранным и личными заметками
- Админка и модерация

---

## Быстрый старт (локально, через Docker Compose)

### 1. Клонируйте репозиторий
```bash
git clone https://github.com/yourusername/myths_legends_project.git
cd myths_legends_project
```

### 2. Настройте переменные окружения

#### Backend (`backend/.env`):
```env
DJANGO_SECRET_KEY=your_secret_key
DEBUG=1
ALLOWED_HOSTS=*
POSTGRES_DB=myths_legends
POSTGRES_USER="ваш_логин"
POSTGRES_PASSWORD="ваш_пароль"
POSTGRES_HOST=db
POSTGRES_PORT=5432
```

#### Frontend (`frontend/myths_legends_app/.env.local`):
```env
REACT_APP_API_BASE_URL=http://localhost:8000
```

### 3. Запустите проект
```bash
docker compose up --build
```
- Backend будет доступен на [http://localhost:8000](http://localhost:8000)
- Frontend — на [http://localhost:3000](http://localhost:3000)

### 4. Наполнение тестовыми данными

Выполните в контейнере backend:
```bash
docker compose exec backend-web-1 bash
python manage.py populate_data
```

---

## Ручной запуск (без Docker)

1. Установите Python 3.10+, Node.js 18+
2. Создайте и активируйте виртуальное окружение в `backend/`, установите зависимости:
   ```bash
   python -m venv venv
   source venv/bin/activate  # или venv\Scripts\activate на Windows
   pip install -r requirements.txt
   ```
3. Настройте Postgres/PostGIS и переменные окружения как выше.
4. Примените миграции и создайте суперпользователя:
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```
5. Запустите backend:
   ```bash
   python manage.py runserver
   ```
6. Для фронта:
   ```bash
   cd frontend/myths_legends_app
   npm install
   npm start
   ```

---

## Как создать .env файлы
- Скопируйте пример из README или создайте вручную по образцу выше.
- Не храните реальные секреты в публичном репозитории!

---

## Контакты
- Автор: https://t.me/kryantseva
- Email: marshmallowiangel@mail.ru
---

**Удачи!** 