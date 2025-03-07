#!/usr/bin/env ts-node

import * as fs from 'fs';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';

interface AbilityField {
  id?: string;
  type?: string;
  level?: number;
  column?: number;
  value?: any;
}

interface InputData {
  custom: {
    [key: string]: AbilityField[];
  };
}

const argv = yargs(hideBin(process.argv))
  .usage('Usage: npm run remove <input_json> <output_json> [--rawcodes <rawcode_list>] [--id x] [--type x] [--level x] [--column x] [--value x]')
  .option('rawcodes', {
    alias: 't',
    type: 'string',
    description: 'Путь к файлу с равкодами для удаления',
  })
  .option('id', {
    type: 'string',
    description: 'Фильтр по id',
  })
  .option('type', {
    type: 'string',
    description: 'Фильтр по type',
  })
  .option('level', {
    type: 'number',
    description: 'Фильтр по level',
  })
  .option('column', {
    type: 'number',
    description: 'Фильтр по column',
  })
  .option('value', {
    type: 'string',
    description: 'Фильтр по value',
  })
  .demandCommand(2, 'Необходимо указать входной и выходной файлы')
  .help()
  .argv;

const [inputPath, outputPath] = argv._ as string[];

if (argv._.length > 2) {
  console.error('Ошибка: указано слишком много аргументов');
  process.exit(1);
}

let inputData: InputData;
try {
  inputData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
} catch (error) {
  console.error(`Ошибка чтения или парсинга файла ${inputPath}:`, error);
  process.exit(1);
}

if (!inputData.custom || typeof inputData.custom !== 'object') {
  console.error('Структура JSON не соответствует ожидаемой (отсутствует объект custom)');
  process.exit(1);
}

let rawCodes: string[] = [];
if (argv.rawcodes) {
  try {
    rawCodes = fs.readFileSync(argv.rawcodes, 'utf8')
      .split('\n')
      .map(code => code.trim())
      .filter(Boolean);
  } catch (error) {
    console.error(`Ошибка чтения файла rawcodes ${argv.rawcodes}:`, error);
    process.exit(1);
  }

  const foundCodes: Record<string, boolean> = {};
  rawCodes.forEach(code => { foundCodes[code] = false; });

  for (const key of Object.keys(inputData.custom)) {
    rawCodes.forEach(code => {
      if (key.startsWith(code)) {
        foundCodes[code] = true;
      }
    });
  }

  rawCodes.forEach(code => {
    if (!foundCodes[code]) {
      console.warn(`Warning: код "${code}" не найден в JSON`);
    }
  });
}

const matchesFilters = (item: AbilityField): boolean => {
  return (!argv.id || item.id === argv.id)
    && (!argv.type || item.type === argv.type)
    && (argv.level === undefined || item.level === argv.level)
    && (argv.column === undefined || item.column === argv.column)
    && (!argv.value || String(item.value) === argv.value);
};

const totalElements = Object.keys(inputData.custom).length;

const newCustom = Object.entries(inputData.custom).reduce((acc, [key, items]) => {
  const rawCodeMatch = argv.rawcodes ? rawCodes.some(code => key.startsWith(code)) : true;
  const filterMatch = items.some(item => matchesFilters(item));

  if (!(rawCodeMatch && filterMatch)) {
    acc[key] = items;
  }
  return acc;
}, {} as InputData['custom']);

const remainingCount = Object.keys(newCustom).length;
const deletedCount = totalElements - remainingCount;

inputData.custom = newCustom;

console.log(`Всего элементов: ${totalElements}`);
console.log(`Удалено элементов: ${deletedCount}`);
console.log(`Осталось элементов: ${remainingCount}`);

try {
  fs.writeFileSync(outputPath, JSON.stringify(inputData, null, 2), 'utf8');
  console.log(`Модифицированный JSON сохранён в файле: ${outputPath}`);
} catch (error) {
  console.error(`Ошибка записи файла ${outputPath}:`, error);
  process.exit(1);
}
