#!/usr/bin/env ts-node

import * as fs from 'fs-extra';
import * as Path from 'path';
import * as Translator from 'wc3maptranslator'; // Adjust this import if needed

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Usage: ts-node convert.ts <input file> [output file]");
    process.exit(1);
  }

  const inputFile = Path.resolve(args[0]);
  if (!fs.existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    process.exit(1);
  }
  
  const outputFile = args[1] ? Path.resolve(args[1]) : null;

  const ext = Path.extname(inputFile).toLowerCase();
  const objectType = Translator.ObjectsTranslator.ObjectType.Abilities;

  if (ext === ".w3a") {
    const fileBuffer = fs.readFileSync(inputFile);
    const conversionResult = Translator.ObjectsTranslator.warToJson(objectType, fileBuffer);
    const jsonResult = conversionResult.json;

    if (outputFile) {
      fs.writeJsonSync(outputFile, jsonResult, { spaces: 2 });
      console.log(`Converted ${inputFile} (w3a) to ${outputFile} (JSON)`);
    } else {
      console.log(JSON.stringify(jsonResult, null, 2));
    }
  } else if (ext === ".json") {
    const jsonData = fs.readJsonSync(inputFile);
    const conversionResult = Translator.ObjectsTranslator.jsonToWar(objectType, jsonData);
    const bufferResult = conversionResult.buffer;

    if (outputFile) {
      fs.writeFileSync(outputFile, bufferResult);
      console.log(`Converted ${inputFile} (JSON) to ${outputFile} (w3a)`);
    } else {
      const defaultOutput = Path.join(
        Path.dirname(inputFile),
        Path.basename(inputFile, ".json") + "_converted.w3a"
      );
      fs.writeFileSync(defaultOutput, bufferResult);
      console.log(`Converted ${inputFile} (JSON) to ${defaultOutput} (w3a)`);
    }
  } else {
    console.error("Unsupported file extension. Provide a .w3a file for conversion to JSON or a .json file for conversion to w3a.");
    process.exit(1);
  }
}

main();
