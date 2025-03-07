#!/usr/bin/env ts-node

import * as fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Обработка аргументов
const argv = yargs(hideBin(process.argv))
  .usage('Usage: npm run remove <input_json_file> <output_json_file> [--to-remove <removal_codes_file>] [--id x] [--type x] [--level x] [--column x] [--value x]')
  .option('to-remove', {
    alias: 't',
    type: 'string',
    description: 'Путь к файлу с равкодами для удаления',
    demandOption: false,
  })
  .option('id', {
    type: 'string',
    description: 'Фильтр по id',
    demandOption: false,
  })
  .option('type', {
    type: 'string',
    description: 'Фильтр по type',
    demandOption: false,
  })
  .option('level', {
    type: 'number',
    description: 'Фильтр по level',
    demandOption: false,
  })
  .option('column', {
    type: 'number',
    description: 'Фильтр по column',
    demandOption: false,
  })
  .option('value', {
    type: 'string',
    description: 'Фильтр по value',
    demandOption: false,
  })
  .demandCommand(2, 'Необходимо указать входной и выходной файлы')
  .help()
  .argv;

const positionalArgs = argv._ as string[];

// Проверка на количество позиционных аргументов (должно быть ровно 2)
if (positionalArgs.length > 2) {
  console.error('Ошибка: указано слишком много аргументов');
  process.exit(1);
}

const [inputJsonPath, outputJsonPath] = positionalArgs;

// Чтение входного JSON-файла
const jsonContent = fs.readFileSync(inputJsonPath, 'utf8');
const jsonData = JSON.parse(jsonContent);

if (!jsonData.custom || typeof jsonData.custom !== 'object') {
  console.error('Структура JSON не соответствует ожидаемой (отсутствует объект custom)');
  process.exit(1);
}

let removalCodes: string[] = [];
if (argv['to-remove']) {
  // Если указан файл с кодами для удаления, выполняем загрузку кодов
  const removalCodesPath = argv['to-remove'];
  const removalCodesContent = fs.readFileSync(removalCodesPath, 'utf8');
  removalCodes = removalCodesContent
    .split('\n')
    .map(code => code.trim())
    .filter(code => code !== '');

  const removalCodeFound: { [code: string]: boolean } = {};
  removalCodes.forEach(code => removalCodeFound[code] = false);

  // Поиск кодов в ключах и в массивах внутри jsonData.custom для предупреждения
  for (const key in jsonData.custom) {
    removalCodes.forEach(code => {
      if (key.startsWith(code)) {
        removalCodeFound[code] = true;
      }
    });
    if (Array.isArray(jsonData.custom[key])) {
      jsonData.custom[key].forEach((item: any) => {
        removalCodes.forEach(code => {
          if (item.id && item.id.startsWith(code)) {
            removalCodeFound[code] = true;
          }
        });
      });
    }
  }

  removalCodes.forEach(code => {
    if (!removalCodeFound[code]) {
      console.warn(`Warning: код "${code}" не найден в JSON`);
    }
  });
}

// Функция для проверки соответствия дополнительным фильтрам (AND)
function matchesFilters(item: any): boolean {
  if (argv.id !== undefined && item.id !== argv.id) {
    return false;
  }
  if (argv.type !== undefined && item.type !== argv.type) {
    return false;
  }
  if (argv.level !== undefined && item.level !== argv.level) {
    return false;
  }
  if (argv.column !== undefined && item.column !== argv.column) {
    return false;
  }
  if (argv.value !== undefined && String(item.value) !== argv.value) {
    return false;
  }
  return true;
}

// Обработка jsonData.custom
Object.keys(jsonData.custom).forEach(key => {
  if (Array.isArray(jsonData.custom[key])) {
    jsonData.custom[key] = jsonData.custom[key].filter((item: any) => {
      // Определяем условие по removal codes:
      // Если файл с removal codes указан, проверяем, начинается ли ключ или item.id с одного из кодов.
      // Если не указан, условие считается истинным.
      let removalCodeCondition = true;
      if (argv['to-remove']) {
        removalCodeCondition =
          removalCodes.some(code => key.startsWith(code)) ||
          (item.id && removalCodes.some(code => item.id.startsWith(code)));
      }
      // Если дополнительных фильтров не задано, filterCondition всегда true.
      const filterCondition = matchesFilters(item);

      // Удаляем элемент, только если выполнены оба условия.
      return !(removalCodeCondition && filterCondition);
    });
  }
  // Можно добавить обработку для не-массивных значений при необходимости
});

console.log(argv['to-remove']
  ? `Удаление выполнено по списку кодов из файла: ${argv['to-remove']}`
  : (Object.keys(jsonData.custom).length > 0
      ? `Удалены элементы, удовлетворяющие дополнительным фильтрам`
      : `Удалены все абилки (без фильтрации по кодам)`
  )
);

fs.writeFileSync(outputJsonPath, JSON.stringify(jsonData, null, 2), 'utf8');
console.log(`Модифицированный JSON сохранён в файле: ${outputJsonPath}`);
