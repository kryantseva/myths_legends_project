const fs = require('fs');
const path = require('path');

const rootDir = '.';
const extensions = ['.js', '.css', '.html', '.py', '.yml', '.csv']; 

const excludePaths = [
    path.normalize('export-code.js'),
    path.normalize('code-export.txt'),
    // path.normalize('backend/places/management/commands/populate_data.py'),
    path.normalize('backend/places/tests/test_api.py'),
];

const excludeDirs = [
    path.normalize('backend/venv'), 
    // path.normalize('frontend'),
    path.normalize('backend/places/migrations'),
    path.normalize('.venv'), 
    path.normalize('backend'), 
];

function walkDir(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const relativePath = path.normalize(path.relative(rootDir, fullPath));
        const stat = fs.statSync(fullPath);

        // Проверяем, является ли текущий путь исключаемой директорией
        if (stat.isDirectory() && excludeDirs.some(excludeDir => relativePath.startsWith(excludeDir))) {
            continue; // Пропускаем эту директорию и ее содержимое
        }

        if (stat.isDirectory()) {
            walkDir(fullPath, fileList);
        } else {
            const ext = path.extname(fullPath);
            if (
                extensions.includes(ext) &&
                !excludePaths.includes(relativePath)
            ) {
                fileList.push(fullPath);
            }
        }
    }
    return fileList;
}

const files = walkDir(rootDir);
console.log('Экспортируемые файлы:\n', files);

let output = '';
files.forEach(file => {
    output += `${path.relative('.', file)}\n\n`;
    output += fs.readFileSync(file, 'utf-8') + '\n\n';
});

fs.writeFileSync(path.join(__dirname, 'code_export.txt'), output, 'utf-8');
console.log(output.length);
console.log('✅ Файл code_export.txt создан.');