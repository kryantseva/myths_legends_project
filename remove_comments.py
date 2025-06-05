import re
import os

def remove_comments_from_file(filepath):
    """
    Удаляет однострочные (//) и многострочные (/* */) комментарии из указанного файла.
    Для Python-комментариев (#, трипл-кавычки) потребуются другие регулярные выражения.
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        content = re.sub(r'//.*', '', content)

        content = re.sub(r'(?<!:)//.*', '', content)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Успешно обработан файл: {filepath}")
    except FileNotFoundError:
        print(f"❌ Ошибка: Файл не найден по пути: {filepath}")
    except Exception as e:
        print(f"❌ Произошла ошибка при обработке файла {filepath}: {e}")

if __name__ == "__main__":
    file_paths_to_process = [
        r"D:\myths_legends_project\frontend\myths_legends_app\src\App.css",
        r"D:\myths_legends_project\frontend\myths_legends_app\src\App.js",
        r"D:\myths_legends_project\frontend\myths_legends_app\src\index.css",
        r"D:\myths_legends_project\frontend\myths_legends_app\src\index.js",
        r"D:\myths_legends_project\frontend\myths_legends_app\src\components\AuthContext.js",
        r"D:\myths_legends_project\frontend\myths_legends_app\src\components\Layout.js",
        r"D:\myths_legends_project\frontend\myths_legends_app\src\components\PlaceDetailModal.js",
        r"D:\myths_legends_project\backend\places\signals.py",
        r"D:\myths_legends_project\backend\places\models.py",
        r"D:\myths_legends_project\backend\places\filters.py",
        r"D:\myths_legends_project\backend\places\apps.py",
        r"D:\myths_legends_project\backend\places\admin.py",
        r"D:\myths_legends_project\backend\places\management\commands\populate_data.py",
        r"D:\myths_legends_project\backend\places\tests\test_api.py",
        r"D:\myths_legends_project\backend\places\api\viewsets.py",
        r"D:\myths_legends_project\backend\places\api\urls.py",
        r"D:\myths_legends_project\backend\places\api\serializers.py",
        r"D:\myths_legends_project\backend\places\api\permissions.py",
        r"D:\myths_legends_project\backend\myths_legends_project\wsgi.py",
        r"D:\myths_legends_project\backend\myths_legends_project\urls.py",
    ]

    if not file_paths_to_process:
        print("Список файлов для обработки пуст. Пожалуйста, укажите файлы в переменной 'file_paths_to_process'.")
    else:
        print("\nНачинаем обработку файлов...")
        for path in file_paths_to_process:
            if os.path.isfile(path):
                remove_comments_from_file(path)
            else:
                print(f"⚠️ Пропускаем: Файл не существует или является директорией: {path}")
        print("\n🗑️ Удаление комментариев завершено.")

