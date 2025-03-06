#!/usr/bin/env ts-node

import * as fs from 'fs';

if (process.argv.length < 4) {
  console.error('Usage: ts-node remover.ts <input_json_file> <removal_codes_file> [output_json_file]');
  process.exit(1);
}

const inputJsonPath = process.argv[2];
const removalCodesPath = process.argv[3];
const outputJsonPath = process.argv[4] || 'output.json';

const removalCodesContent = fs.readFileSync(removalCodesPath, 'utf8');
const removalCodes = removalCodesContent
  .split('\n')
  .map(code => code.trim())
  .filter(code => code !== '');

const jsonContent = fs.readFileSync(inputJsonPath, 'utf8');
const jsonData = JSON.parse(jsonContent);

if (!jsonData.custom || typeof jsonData.custom !== 'object') {
  console.error('Структура JSON не соответствует ожидаемой (отсутствует объект custom)');
  process.exit(1);
}

const removalCodeFound: { [code: string]: boolean } = {};
removalCodes.forEach(code => removalCodeFound[code] = false);

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
    console.warn(`Warning: равкод "${code}" не найден в JSON`);
  }
});

Object.keys(jsonData.custom).forEach(key => {
  if (removalCodes.some(code => key.startsWith(code))) {
    delete jsonData.custom[key];
  } else if (Array.isArray(jsonData.custom[key])) {
    jsonData.custom[key] = jsonData.custom[key].filter((item: any) => {
      return !removalCodes.some(code => item.id && item.id.startsWith(code));
    });
  }
});

fs.writeFileSync(outputJsonPath, JSON.stringify(jsonData, null, 2), 'utf8');
console.log(`Модифицированный JSON сохранён в файле: ${outputJsonPath}`);