from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from places.models import Place, UserNote, Comment, PlaceImage, NoteImage
from rest_framework.authtoken.models import Token
import random
import os
from django.core.files import File
from io import BytesIO
from PIL import Image

User = get_user_model()

class Command(BaseCommand):
    help = 'Populates the database with historical places, legendary notes, and anecdotal comments for storytellers.'

    def _create_dummy_image(self, width=100, height=100, color=(255, 0, 0), text="Placeholder"):
        """Creates a dummy image file in memory."""
        image = Image.new('RGB', (width, height), color)
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
            {'username': 'storyteller1', 'email': 'story1@example.com', 'password': 'password123'},
            {'username': 'storyteller2', 'email': 'story2@example.com', 'password': 'password123'},
            {'username': 'storyteller3', 'email': 'story3@example.com', 'password': 'password123'},
        ]
        
        regular_users = []
        for data in users_data:
            user, created = User.objects.get_or_create(username=data['username'], defaults={'email': data['email']})
            if created:
                user.set_password(data['password'])
                user.save()
            Token.objects.get_or_create(user=user)
            regular_users.append(user)
            self.stdout.write(self.style.SUCCESS(f'Created or updated user: {user.username}'))

        superuser, _ = User.objects.get_or_create(username='admin', defaults={'email': 'admin@example.com', 'is_superuser': True, 'is_staff': True})
        superuser.set_password('admin123')
        superuser.save()
        Token.objects.get_or_create(user=superuser)
        self.stdout.write(self.style.SUCCESS(f'Ensured token for superuser: {superuser.username}'))

        self.stdout.write(self.style.MIGRATE_HEADING('Creating historical places in Kazan...'))
        places_data = [
                    {'name': 'Казанский Кремль', 'description': 'Крепость была основана в X веке как центр Казанского ханства, став свидетелем множества сражений. В XVI веке она была завоёвана Иваном Грозным, что изменило её облик. Сегодня это важный исторический памятник, включённый в список ЮНЕСКО.', 'lat': 55.7996, 'lon': 49.1064, 'categories': 'История, Крепость', 'owner': superuser, 'status': 'approved'},
                    {'name': 'Мечеть Кул-Шариф', 'description': 'Построена в XVI веке на месте разрушенной мечети, став символом возрождения исламской культуры. Её возведение ознаменовало возвращение татарской идентичности после советского периода. Архитектура отражает богатство исторических традиций.', 'lat': 55.8000, 'lon': 49.1083, 'categories': 'История, Мечеть', 'owner': superuser, 'status': 'approved'},
                    {'name': 'Башня Сююмбике', 'description': 'Возведена в XVII веке как часть Казанского Кремля, её наклон остаётся загадкой архитектуры. Она служила дозорной точкой и местом заключения. Легенды о царице Сююмбике добавляют ей историческую глубину.', 'lat': 55.8006, 'lon': 49.1085, 'categories': 'История, Башня', 'owner': superuser, 'status': 'pending'},
                    {'name': 'Озеро Кабан', 'description': 'Известно с XIII века как часть оборонительной системы Казани, окружённое земляными валами. В XIX веке оно стало популярным местом отдыха горожан. Легенды о ханской казне сделали его историческим символом.', 'lat': 55.7500, 'lon': 49.1500, 'categories': 'История, Природа', 'owner': regular_users[0], 'status': 'approved'},
                    {'name': 'Чертово городище', 'description': 'Древнее поселение булгар, основанное в IX веке, служило торговым узлом. Археологические раскопки XIX века открыли остатки укреплений. Место хранит следы исчезнувшей цивилизации.', 'lat': 55.7600, 'lon': 49.1100, 'categories': 'История, Археология', 'owner': regular_users[1], 'status': 'pending'},
                    {'name': 'Петропавловский собор', 'description': 'Построен в XVIII веке в стиле русского барокко после присоединения Казани к России. Он стал центром православной жизни города. Реставрации XX века сохранили его уникальный облик.', 'lat': 55.7891, 'lon': 49.1235, 'categories': 'История, Собор', 'owner': superuser, 'status': 'approved'},
                    {'name': 'Старо-Татарская слобода', 'description': 'Основана в XVI веке как квартал для татар после завоевания Казани. Здесь сохранились дома купцов и мечети XVIII века. Район отражает культурное наследие татарского народа.', 'lat': 55.7760, 'lon': 49.1200, 'categories': 'История, Район', 'owner': superuser, 'status': 'pending'},
                    {'name': 'Кремлёвская набережная', 'description': 'Созданная в XIX веке как часть городской инфраструктуры, она стала местом прогулок элиты. В XX веке её реконструировали для массового отдыха. Сегодня это популярный туристический маршрут.', 'lat': 55.8075, 'lon': 49.1150, 'categories': 'История, Набережная', 'owner': regular_users[0], 'status': 'approved'},
                    {'name': 'Центр семьи Казан', 'description': 'Открыт в 2013 году как современный ЗАГС в форме казана, символизируя татарскую культуру. Проект вдохновлён историей региона. Смотровая площадка добавляет ему значения.', 'lat': 55.8118, 'lon': 49.0910, 'categories': 'История, Достопримечательность', 'owner': regular_users[1], 'status': 'pending'},
                    {'name': 'Булак', 'description': 'Канал проложен в XVIII веке для защиты и торговли Казани. В XIX веке он стал центром ремесел. Сегодня сохраняет исторический облик старого города.', 'lat': 55.7890, 'lon': 49.1180, 'categories': 'История, Канал', 'owner': regular_users[2], 'status': 'approved'},
                    {'name': 'Дом Шамиля', 'description': 'Построен в XIX веке купцом Шамилем как образец купеческой архитектуры. Служил центром торговли и культуры. Легенды о его хозяине добавляют мистики.', 'lat': 55.7820, 'lon': 49.1250, 'categories': 'История, Архитектура', 'owner': regular_users[0], 'status': 'pending'},
                    {'name': 'Театр им. Г. Камала', 'description': 'Основан в 1939 году как первый татарский профессиональный театр. Играл ключевую роль в сохранении культуры. Здание отражает советскую архитектуру.', 'lat': 55.7818, 'lon': 49.1230, 'categories': 'История, Театр', 'owner': regular_users[1], 'status': 'approved'},
                    {'name': 'Храм Всех Рeligий', 'description': 'Создан в конце XX века художником Ильдаром Хановым как символ единства вер. Строительство продолжается, отражая его уникальную философию. Место стало культурным феноменом.', 'lat': 55.7900, 'lon': 49.1400, 'categories': 'История, Культура', 'owner': regular_users[2], 'status': 'pending'},
                    {'name': 'Казанский Арбат', 'description': 'Образован в XIX веке как торговая улица, ставшая культурным центром. В XX веке её реконструировали для пешеходов. Сегодня это сердце городской жизни.', 'lat': 55.7920, 'lon': 49.1220, 'categories': 'История, Улица', 'owner': regular_users[0], 'status': 'approved'},
                    {'name': 'Источник Айгуль', 'description': 'Известен с XVIII века как целебный родник, упоминаемый в летописях. Стал местом паломничества в XIX веке. Сохраняет историческую значимость.', 'lat': 55.7800, 'lon': 49.1100, 'categories': 'История, Природа', 'owner': regular_users[1], 'status': 'pending'},
                    {'name': 'Пещера Шайтан', 'description': 'Открыта в XIX веке как часть карстовых систем, упоминается в фольклоре. Использовалась как укрытие во время войн. Тайна подземелий до сих пор изучается.', 'lat': 55.7500, 'lon': 49.1000, 'categories': 'История, Пещера', 'owner': regular_users[2], 'status': 'approved'},
                    {'name': 'Дворец земледельцев', 'description': 'Построен в 1930-х годах как выставочный центр сельского хозяйства. Стал символом индустриализации региона. Архитектура сохраняет советский стиль.', 'lat': 55.8000, 'lon': 49.1300, 'categories': 'История, Архитектура', 'owner': regular_users[0], 'status': 'pending'},
                    {'name': 'Река Казанка', 'description': 'Упоминается в летописях XIII века как граница поселений. В XIX веке стала важной транспортной артерией. Сегодня используется для отдыха.', 'lat': 55.8100, 'lon': 49.1150, 'categories': 'История, Река', 'owner': regular_users[1], 'status': 'approved'},
                    {'name': 'Ханский мавзолей', 'description': 'Возведён в XV веке как усыпальница ханов, сохранивший средневековый облик. Реставрирован в XX веке. Исторический памятник татарской культуры.', 'lat': 55.7900, 'lon': 49.1050, 'categories': 'История, Мавзолей', 'owner': regular_users[2], 'status': 'pending'},
                    {'name': 'Скала Тавла', 'description': 'Известна с XII века как ориентир для караванов, упоминается в хрониках. Использовалась как место обрядов. Сохраняет следы древних времён.', 'lat': 55.7700, 'lon': 49.1200, 'categories': 'История, Природа', 'owner': regular_users[0], 'status': 'approved'},
                    {'name': 'Мост Миллиennium', 'description': 'Построен в 2005 году как современный символ Казани. Соединил исторические берега Казанки. Открытие сопровождалось культурными событиями.', 'lat': 55.8200, 'lon': 49.1100, 'categories': 'История, Мост', 'owner': regular_users[1], 'status': 'pending'},
                    {'name': 'Гора Кырлай', 'description': 'Упоминается в XIV веке как место наблюдения за степью. Использовалась как оборонительный пункт. Сохраняет археологическую ценность.', 'lat': 55.7600, 'lon': 49.1150, 'categories': 'История, Природа', 'owner': regular_users[2], 'status': 'approved'},
                    {'name': 'Старинная мечеть', 'description': 'Построена в XVIII веке на месте старого храма, сохраняя традиции. Реставрирована в XX веке. Является культурным наследием.', 'lat': 55.7750, 'lon': 49.1250, 'categories': 'История, Мечеть', 'owner': regular_users[0], 'status': 'pending'},
                    {'name': 'Долина духов', 'description': 'Известна с XIX века как место древних захоронений. Использовалась как пастбище в средние века. Обросла мистическими историями.', 'lat': 55.7800, 'lon': 49.1350, 'categories': 'История, Природа', 'owner': regular_users[1], 'status': 'approved'},
                    {'name': 'Храм огня', 'description': 'Основан в XVIII веке как место поклонения огню, упоминается в фольклоре. Реставрирован в XIX веке. Сохраняет сакральное значение.', 'lat': 55.7900, 'lon': 49.1150, 'categories': 'История, Культовое', 'owner': regular_users[2], 'status': 'pending'},
                    {'name': 'Река Туры', 'description': 'Упоминается в XIII веке как водный путь для купцов. В XIX веке стала местом рыбной ловли. Сохраняет историческую роль.', 'lat': 55.7600, 'lon': 49.1250, 'categories': 'История, Река', 'owner': regular_users[0], 'status': 'approved'},
                    {'name': 'Камень судьбы', 'description': 'Известен с XV века как место судебных собраний. Упоминается в хрониках как священный. Сохраняет культурное значение.', 'lat': 55.7700, 'lon': 49.1050, 'categories': 'История, Природа', 'owner': regular_users[1], 'status': 'pending'},
                    {'name': 'Дворец ханов', 'description': 'Построен в XVI веке как резиденция ханов Казани. Разрушен в XVII веке, частично восстановлен. Исторический центр власти.', 'lat': 55.7950, 'lon': 49.1080, 'categories': 'История, Архитектура', 'owner': regular_users[2], 'status': 'approved'},
                    {'name': 'Лесной храм', 'description': 'Основан в XVII веке как место обрядов, упоминается в летописях. Заброшен в XIX веке. Сохраняет следы прошлого.', 'lat': 55.7500, 'lon': 49.1300, 'categories': 'История, Культовое', 'owner': regular_users[0], 'status': 'pending'},
                    {'name': 'Остров сказок', 'description': 'Известен с XVIII века как место сборов сказителей. Использовался для культурных праздников. Сохраняет фольклорное наследие.', 'lat': 55.8000, 'lon': 49.1200, 'categories': 'История, Природа', 'owner': regular_users[1], 'status': 'approved'},
                ]

        created_places = []
        for data in places_data:
            place_image_file = self._create_dummy_image(width=random.randint(400, 800), height=random.randint(300, 600)) if random.random() < 0.7 else None
            place, created = Place.objects.get_or_create(
                name=data['name'],
                defaults={
                    'description': data['description'],
                    'location': Point(data['lon'], data['lat']),
                    'categories': data['categories'],
                    'owner': data['owner'],
                    'status': data['status'],
                    'image': None  # Не кладём картинку напрямую
                }
            )
            if place_image_file:
                PlaceImage.objects.create(place=place, image=place_image_file)
            created_places.append(place)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created place: {place.name} (Status: {place.status}, Owner: {place.owner.username})'))
            else:
                self.stdout.write(self.style.WARNING(f'Place "{place.name}" already exists. (Status: {place.status}, Owner: {place.owner.username})'))

        # Очищаем битые заметки и комментарии после создания мест, но до создания новых заметок и комментариев
        UserNote.objects.filter(place__isnull=True).delete()
        Comment.objects.filter(place__isnull=True).delete()

        # Оставляем только approved места для заметок и комментариев
        approved_places = [p for p in created_places if getattr(p, 'status', None) == 'approved']

        # --- ДОБАВЛЯЕМ ИЗБРАННЫЕ МЕСТА ДЛЯ КАЖДОГО ПОЛЬЗОВАТЕЛЯ ---
        self.stdout.write(self.style.MIGRATE_HEADING('Assigning favorite places for each user...'))
        for user in regular_users:
            favorites = random.sample(approved_places, min(5, len(approved_places)))
            for place in favorites:
                place.favorites.add(user)
            user.refresh_from_db()
            actual_favs = list(user.favorite_places.values_list('name', flat=True))
            print(f'User {user.username} favorites in DB: {actual_favs}')
            self.stdout.write(self.style.SUCCESS(f'  {user.username} favorites: {[p.name for p in favorites]}'))

        self.stdout.write(self.style.MIGRATE_HEADING('Creating legendary notes for places...'))
        note_texts = [
                    "Легенда гласит, что здесь обитал дух древнего воина, охраняющий свои сокровища. Говорят, его меч светился в полнолуние. Сказители передают эту историю из поколения в поколение.",
                    "Сказание повествует о фее, танцевавшей под луной у этих стен. Её пение манило путников, но никто не возвращался. Местные до сих пор боятся её теней.",
                    "Миф рассказывает о золотом драконе, спящем под землёй этого места. Его дыхание, говорят, согревает холодные ночи. Лишь смельчаки ищут его логово.",
                    "Прежде здесь совершались обряды, призывающие дождь, утверждают старые сказания. Духи воды являлись жрецам в видениях. Следы их песен остались в камнях.",
                    "Легенда о потерянном городе, скрытом в тумане, живёт в этих краях. Сказители шепчут о золотых башнях, видимых лишь в полнолуние. Никто не осмелился туда пойти.",
                    "Сказание гласит о великом шамане, чьи духи охраняют эти холмы. Его голос слышен в ветре, говорят старцы. Местные избегают этого места ночью.",
                    "Миф повествует о русалке, живущей в глубинах озера. Она заманивает рыбаков песнями, обещающими богатство. Лишь немногие вернулись с её дарами.",
                    "Легенда утверждает, что здесь был скрыт трон хана, охраняемый огненным духом. Его свет виден лишь избранным. Сказители берегут эту тайну.",
                    "Сказание рассказывает о битве духов под этими скалами. Их крики до сих пор разносятся эхом. Местные считают это место священным.",
                    "Миф говорит о золотой птице, парящей над лесом. Её перья приносят удачу, но поймать её невозможно. Сказки об этом живут веками.",
                    "Легенда шепчет о подземном городе, где спят древние короли. Их сны охраняют стражи тьмы. Лишь смельчаки ищут вход.",
                    "Сказание о танце теней под луной передаётся детьми. Духи прошлого танцуют здесь каждую ночь. Местные боятся смотреть на это.",
                    "Миф гласит, что в этих стенах скрыта книга пророчеств. Её страницы открываются только мудрецам. Сказители охраняют эту тайну.",
                    "Легенда повествует о воине, победившем тьму. Его копьё всё ещё стоит в земле, говорят старцы. Место стало символом храбрости.",
                    "Сказание о лесном духе, охраняющем рощу, живёт в фольклоре. Его смех слышен в листве. Местные оставляют ему дары.",
                    "Миф рассказывает о золотом олене, бегающем по горам. Его рога сияют, как солнце. Лишь чистые сердцем могут его увидеть.",
                    "Легенда утверждает, что здесь был храм звёзд. Жрецы читали судьбу по небесам. Следы их алтаря до сих пор видны.",
                    "Сказание гласит о рыцаре, потерявшем душу в пещере. Его призрак бродит по коридорам. Местные избегают этого места.",
                    "Миф повествует о реке, где живут духи воды. Они дарят жизнь, но требуют жертв. Сказители поют об этом.",
                    "Легенда о спящем великане, чьё дыхание создаёт ветер. Его пробуждение предскажет конец света. Местные чтут это место."
                ]

        note_count = 0
        existing_notes = set()  # Track (place_id, user_id) combinations to avoid duplicates
        rejection_reasons = [
            "Текст недостаточно информативен.",
            "Нарушение правил сообщества.",
            "Отсутствие связи с местом.",
            "Дублирующее содержание.",
            "Недостаточно доказательств легенды."
        ]
        while note_count < 50:  # Exactly 50 notes
            user = random.choice(regular_users)
            place = random.choice(approved_places)
            user_place_key = (place.id, user.id)
            if user_place_key not in existing_notes:
                status = 'approved' if random.random() < 0.5 else 'pending'  # 50/50
                if random.random() < 0.05:  # 5% rejected
                    status = 'rejected'
                note_image = self._create_dummy_image(
                    width=random.randint(200, 500),
                    height=random.randint(150, 400),
                    color=(random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)),
                    text=f"Legend {place.id}"
                ) if random.random() < 0.4 else None
                note = UserNote.objects.create(
                    user=user,
                    place=place,
                    text=random.choice(note_texts),
                    moderation_status=status,
                    image=None  # Не кладём картинку напрямую
                )
                if note_image:
                    NoteImage.objects.create(note=note, image=note_image)
                if status == 'rejected':
                    note.rejection_reason = random.choice(rejection_reasons)
                    note.save()
                existing_notes.add(user_place_key)
                note_count += 1
                self.stdout.write(self.style.SUCCESS(f'  Created note for {user.username} about {place.name} (Status: {status})'))
            if len(existing_notes) >= len(regular_users) * len(approved_places):
                break

        self.stdout.write(self.style.MIGRATE_HEADING('Creating anecdotal comments for places...'))
        comment_texts = [
                    "Блин, мне бабушка такое рассказывала про воинов! Класс!",
                    "Ого, моя мама упоминала фею под луной. Это реально круто!",
                    "Честно, дедушка говорил про дракона под землёй. Потрясающе!",
                    "Моя тётя пела про дождевые обряды. Супер история!",
                    "Бабуля шептала о потерянном городе. Это жутко и классно!",
                    "Это просто находка, респект!",
                    "Не уверен, стоит ли верить.",
                    "Хорошая идея, но можно развить.",
                    "Супер, добавь ещё деталей!",
                    "Интересно, но немного сумбурно.",
                    "Полезно, сохраню на будущее.",
                    "Не впечатлило, ожидал большего.",
                    "Отличный анализ, молодец!",
                    "Согласен, но есть вопросы.",
                    "Круто, продолжай в том же духе!",
                    "Неплохо, но можно и лучше.",
                    "Мой дядя рассказывал про духов! Кайф!",
                    "Бабка пугала историями о русалке. Это огонь!",
                    "Прадед говорил про золотую птицу. Легенда!",
                    "Мама шептала о храме звёзд. Потрясающе!"
                ]
        comment_count = 0
        while comment_count < 50:  # Exactly 50 comments
            place = random.choice(approved_places)
            user = random.choice(regular_users)
            status = 'approved' if random.random() < 0.5 else 'pending'  # 50/50
            if random.random() < 0.05:  # 5% rejected
                status = 'rejected'
            try:
                comment = Comment.objects.create(
                    user=user,
                    place=place,
                    text=random.choice(comment_texts),
                    moderation_status=status
                )
                if status == 'rejected':
                    comment.rejection_reason = random.choice(rejection_reasons)
                    comment.save()
                comment_count += 1
                self.stdout.write(self.style.SUCCESS(f'  Created comment by {user.username} for place {place.name} (Status: {status})'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  Failed to create comment for place {place.name} by {user.username}: {e}'))

        self.stdout.write(self.style.SUCCESS('Database population complete!'))

        self.stdout.write(self.style.MIGRATE_HEADING('\n--- User Tokens ---'))
        for user in User.objects.all():
            token = Token.objects.get_or_create(user=user)[0]
            print(f'User {user.username} token: {token.key}')
        
        superuser_token = Token.objects.get(user=superuser)
        self.stdout.write(f'User: {superuser.username} (Superuser), Token: {superuser_token.key}')
        self.stdout.write(self.style.MIGRATE_HEADING('-------------------\n'))