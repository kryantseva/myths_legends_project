import re
import os

def remove_comments_from_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Удаление однострочных комментариев (//)
    content = re.sub(r'//.*', '', content)
    # Удаление многострочных комментариев (/* */)
    content = re.sub(r'/\*[\s\S]*?\*/', '', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Обработан файл: {filepath}")

def process_directory(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(('.js', '.jsx', '.css')): # Добавьте другие расширения, если нужно
                filepath = os.path.join(root, file)
                remove_comments_from_file(filepath)

if __name__ == "__main__":
    project_root = input("Введите путь к корневой папке вашего проекта: ")
    if os.path.isdir(project_root):
        process_directory(project_root)
        print("Удаление комментариев завершено.")
    else:
        print(f"Ошибка: Папка '{project_root}' не найдена.")