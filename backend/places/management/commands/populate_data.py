from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from places.models import Place, UserNote, Comment
from rest_framework.authtoken.models import Token
import random
import os
from django.core.files import File
from io import BytesIO
from PIL import Image

User = get_user_model()

class Command(BaseCommand):
    help = 'Populates the database with diverse places, notes, and comments for demonstration.'

    def _create_dummy_image(self, width=100, height=100, color=(255, 0, 0), text="Placeholder"):
        """Creates a dummy image file in memory."""
        image = Image.new('RGB', (width, height), color)
        # Optionally add text to the image
        # from PIL import ImageDraw, ImageFont
        # draw = ImageDraw.Draw(image)
        # try:
        #     font = ImageFont.truetype("arial.ttf", 15)
        # except IOError:
        #     font = ImageFont.load_default()
        # draw.text((10, 10), text, font=font, fill=(0, 0, 0))

        image_io = BytesIO()
        image.save(image_io, format='PNG')
        image_name = f'dummy_{width}x{height}_{random.randint(1000,9999)}.png'
        return File(image_io, name=image_name)


    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Cleaning up existing data...'))
        Comment.objects.all().delete()
        UserNote.objects.all().delete()
        Place.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        
        # Очищаем папку media перед запуском, чтобы не было старых файлов
        media_root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../media')
        if os.path.exists(media_root):
            for root, dirs, files in os.walk(media_root):
                for f in files:
                    os.unlink(os.path.join(root, f))
                for d in dirs:
                    os.rmdir(os.path.join(root, d))
        self.stdout.write(self.style.SUCCESS('Existing data cleaned and media folder cleared.'))

        self.stdout.write(self.style.MIGRATE_HEADING('Creating users...'))
        users_data = [
            {'username': 'testuser1', 'email': 'user1@example.com', 'password': 'password123'},
            {'username': 'testuser2', 'email': 'user2@example.com', 'password': 'password123'},
            {'username': 'moderator', 'email': 'moderator@example.com', 'password': 'password123'},
        ]
        
        regular_users = []
        for data in users_data:
            user, created = User.objects.get_or_create(username=data['username'], defaults={'email': data['email']})
            if created:
                user.set_password(data['password'])
                user.save()
                Token.objects.get_or_create(user=user)
                regular_users.append(user)
                self.stdout.write(self.style.SUCCESS(f'Created user: {user.username}'))
            else:
                self.stdout.write(self.style.WARNING(f'User {user.username} already exists.'))
                regular_users.append(user)

        superuser = User.objects.get(username='admin')
        Token.objects.get_or_create(user=superuser)
        self.stdout.write(self.style.SUCCESS(f'Ensured token for superuser: {superuser.username}'))


        self.stdout.write(self.style.MIGRATE_HEADING('Creating diverse places in Kazan...'))

        places_data = [
            {'name': 'Казанский Кремль', 'description': 'Историческая крепость и объект Всемирного наследия ЮНЕСКО.', 'lat': 55.7996, 'lon': 49.1064, 'categories': 'Историческое, Крепость', 'owner': superuser, 'status': 'approved'},
            {'name': 'Мечеть Кул-Шариф', 'description': 'Главная соборная мечеть Татарстана, символ Казани.', 'lat': 55.8000, 'lon': 49.1083, 'categories': 'Культовое, Мечеть', 'owner': superuser, 'status': 'approved'},
            {'name': 'Башня Сююмбике', 'description': 'Наклонная башня Казанского Кремля, с ней связана легенда о царице Сююмбике.', 'lat': 55.8006, 'lon': 49.1085, 'categories': 'Историческое, Башня, Легенда', 'owner': superuser, 'status': 'approved'},
            {'name': 'Петропавловский собор', 'description': 'Образец русского барокко, выдающаяся архитектурная памятка Казани.', 'lat': 55.7891, 'lon': 49.1235, 'categories': 'Культовое, Собор', 'owner': superuser, 'status': 'approved'},
            {'name': 'Старо-Татарская слобода', 'description': 'Исторический район Казани, где сохранились традиции и архитектура татарского народа.', 'lat': 55.7760, 'lon': 49.1200, 'categories': 'Историческое, Район', 'owner': superuser, 'status': 'approved'},
            {'name': 'Кремлёвская набережная', 'description': 'Современная набережная реки Казанки, популярное место для прогулок.', 'lat': 55.8075, 'lon': 49.1150, 'categories': 'Отдых, Набережная', 'owner': superuser, 'status': 'approved'},
            {'name': 'Центр семьи Казан', 'description': 'ЗАГС в форме казана, современный символ города и смотровая площадка.', 'lat': 55.8118, 'lon': 49.0910, 'categories': 'Современное, Достопримечательность', 'owner': superuser, 'status': 'approved'},
            
            {'name': 'Легенда о Зиланте', 'description': 'Символ Казани, мифическое существо из татарского фольклора.', 'lat': 55.8050, 'lon': 49.1000, 'categories': 'Миф, Символ', 'owner': regular_users[0], 'status': 'approved'},
            {'name': 'Дом Шамиля', 'description': 'Особняк купца Шамиля, связанный с городскими легендами.', 'lat': 55.7820, 'lon': 49.1250, 'categories': 'Легенда, Архитектура', 'owner': regular_users[0], 'status': 'pending'},
            {'name': 'Чертово городище', 'description': 'Место древнего булгарского поселения, окутанное мифами.', 'lat': 55.7600, 'lon': 49.1100, 'categories': 'Историческое, Миф', 'owner': regular_users[0], 'status': 'rejected'},

            {'name': 'Легенда о Казанской иконе Божией Матери', 'description': 'Одна из самых почитаемых икон России, с ней связано множество чудес.', 'lat': 55.7800, 'lon': 49.1200, 'categories': 'Легенда, Культовое', 'owner': regular_users[1], 'status': 'approved'},
            {'name': 'Булак', 'description': 'Канал в центре Казани, с ним связаны свои городские истории.', 'lat': 55.7890, 'lon': 49.1180, 'categories': 'Отдых, История', 'owner': regular_users[1], 'status': 'pending'},

            {'name': 'Озеро Кабан', 'description': 'Система озер, на дне которых, по легенде, хранится ханская казна.', 'lat': 55.7500, 'lon': 49.1500, 'categories': 'Легенда, Природа', 'owner': regular_users[2], 'status': 'approved'},
            {'name': 'Театр им. Г. Камала', 'description': 'Татарский государственный академический театр.', 'lat': 55.7818, 'lon': 49.1230, 'categories': 'Культурное, Театр', 'owner': regular_users[2], 'status': 'approved'},
        ]

        created_places = []
        for data in places_data:
            place_image = self._create_dummy_image(
                width=random.randint(400, 800), 
                height=random.randint(300, 600), 
                color=(random.randint(0,255), random.randint(0,255), random.randint(0,255)),
                text=data['name']
            ) if random.random() < 0.7 else None # 70% шанс на изображение
            
            place, created = Place.objects.get_or_create(
                name=data['name'],
                defaults={
                    'description': data['description'],
                    'location': Point(data['lon'], data['lat']),
                    'categories': data['categories'],
                    'owner': data['owner'],
                    'status': data['status'],
                    'image': place_image # Привязываем изображение
                }
            )
            created_places.append(place)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created place: {place.name} (Status: {place.status})'))
            else:
                self.stdout.write(self.style.WARNING(f'Place "{place.name}" already exists. (Status: {place.status})'))

        self.stdout.write(self.style.MIGRATE_HEADING('Creating diverse notes for places...'))

        note_texts = [
            "Очень понравилось! Обязательно посетите.",
            "Интересное место, но ожидал большего. Немного завышены ожидания.",
            "Невероятно красивое и познавательное место. 5 из 5!",
            "Спорное место, требует дополнительного изучения.",
            "Разочарован. Не нашёл ничего интересного.",
            "Замечательное место для прогулок и размышлений.",
            "Просто потрясающе! Вернусь сюда ещё не раз.",
            "Неплохо, но есть куда стремиться.",
            "Дух истории здесь ощущается очень сильно.",
            "Место силы, определенно."
        ]
        
        for user_idx, user in enumerate(regular_users):
            self.stdout.write(self.style.MIGRATE_HEADING(f'Creating notes for {user.username}...'))
            for i, place in enumerate(created_places):
                if random.random() < 0.6:
                    status = 'approved'
                    if random.random() < 0.3:
                        status = 'pending'
                    elif random.random() < 0.1:
                        status = 'rejected'
                    
                    rating = random.randint(1, 5) if random.random() < 0.8 else None
                    
                    note_image = None
                    if random.random() < 0.4: # 40% шанс на наличие изображения
                         note_image = self._create_dummy_image(
                            width=random.randint(200, 500), 
                            height=random.randint(150, 400), 
                            color=(random.randint(0,255), random.randint(0,255), random.randint(0,255)),
                            text=f"Note {i}"
                        )
                    
                    note = UserNote.objects.create(
                        user=user,
                        place=place,
                        text=f"{random.choice(note_texts)} (ID места: {place.id})",
                        moderation_status=status,
                        rating=rating,
                        image=note_image # Привязываем изображение
                    )
                    self.stdout.write(self.style.SUCCESS(f'  Created note for {user.username} about {place.name} (Status: {status}, Rating: {rating})'))

        self.stdout.write(self.style.MIGRATE_HEADING('Creating diverse comments for notes...'))

        comment_texts = [
            "Согласен!",
            "Отличная заметка, спасибо!",
            "Не совсем понял, можно подробнее?",
            "Интересный взгляд, но у меня другое мнение.",
            "Очень помогло, спасибо!",
            "Полностью поддерживаю!",
            "Не согласен с этим мнением.",
            "Надо перепроверить информацию.",
            "Кратко и по делу."
        ]

        for note in UserNote.objects.all():
            for user in regular_users:
                if random.random() < 0.5:
                    status = 'approved'
                    if random.random() < 0.3:
                        status = 'pending'
                    elif random.random() < 0.1:
                        status = 'rejected'
                    
                    try:
                        Comment.objects.create(
                            user=user,
                            note=note,
                            text=f"{random.choice(comment_texts)} (к заметке {note.id})",
                            moderation_status=status
                        )
                        self.stdout.write(self.style.SUCCESS(f'  Created comment by {user.username} for note {note.id} (Status: {status})'))
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f'  Failed to create comment for note {note.id} by {user.username}: {e}'))

        self.stdout.write(self.style.SUCCESS('Database population complete!'))

        self.stdout.write(self.style.MIGRATE_HEADING('\n--- User Tokens ---'))
        for user in regular_users:
            token = Token.objects.get(user=user)
            self.stdout.write(f'User: {user.username}, Token: {token.key}')
        
        superuser_token = Token.objects.get(user=superuser)
        self.stdout.write(f'User: {superuser.username} (Superuser), Token: {superuser_token.key}')
        self.stdout.write(self.style.MIGRATE_HEADING('-------------------\n'))