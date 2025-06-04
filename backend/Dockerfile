# backend/Dockerfile

# Используем базовый образ Python 3.9
FROM python:3.9

# Устанавливаем системные зависимости, необходимые для PostGIS/GDAL
# Это критически важно для django.contrib.gis
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libgdal-dev \
    # Дополнительные зависимости для Pillow (если вы не добавили их ранее)
    # libjpeg-dev \
    # zlib1g-dev \
    # libfreetype6-dev \
    # liblcms2-dev \
    # libwebp-dev \
    # tcl8.6-dev tk8.6-dev python3-tk \
    && rm -rf /var/lib/apt/lists/*

# Устанавливаем переменную окружения для GDAL (может помочь, если Django не находит GDAL автоматически)
# В Ubuntu/Debian системах, GDAL обычно устанавливается в стандартный путь, но это полезно.
ENV GDAL_LIBRARY_PATH=/usr/lib/libgdal.so

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# Копируем файл зависимостей Python и устанавливаем их
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY wait-for-it.sh /usr/local/bin/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

# Копируем остальной код проекта в контейнер
COPY . .

# Открываем порт, на котором будет работать Django
EXPOSE 8000

# Команда для запуска Django (уже есть в docker-compose.yml)
# CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]