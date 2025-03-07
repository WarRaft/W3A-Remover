#!/usr/bin/env ts-node

import * as fs from "fs";
import { hideBin } from "yargs/helpers";
import yargs from "yargs";
import { metaDataDict } from "./meta-data-dict";
import * as XLSX from "xlsx";

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
	.usage(
		"Usage: npm run remove <input_json> <output_json> [--rawcodes <rawcode_list>] [--id x] [--value x] [--lookup-parent]"
	)
	.option("rawcodes", {
		type: "string",
		description: "Path to the file with rawcodes to filter",
	})
	.option("id", {
		type: "string",
		description: "Filter by id",
	})
	.option("value", {
		type: "string",
		description: "Filter by value",
	})
	.option("lookup-parent", {
		type: "boolean",
		description: "Lookup parent ability if filters do not match",
	})
	.demandCommand(2, "Input and output files are required")
	.help().argv;

const [inputPath, outputPath] = argv._ as string[];

if (argv._.length > 2) {
	console.error("Error: too many arguments provided");
	process.exit(1);
}

if (argv.id && !metaDataDict[argv.id]) {
	console.error(`Error: id "${argv.id}" does not match any available metadata`);
	process.exit(1);
}

const readJsonFile = (path: string) => {
	try {
		return JSON.parse(fs.readFileSync(path, "utf8"));
	} catch (error) {
		console.error(`Error reading or parsing file ${path}:`, error);
		process.exit(1);
	}
};

const inputData: InputData = readJsonFile(inputPath);

if (!inputData.custom || typeof inputData.custom !== "object") {
	console.error(
		'The JSON structure does not match the expected format (missing "custom" data)'
	);
	process.exit(1);
}

let rawCodes: string[] = [];
if (argv.rawcodes) {
	rawCodes = fs
		.readFileSync(argv.rawcodes, "utf8")
		.split("\n")
		.map((code) => code.trim())
		.filter(Boolean);

	const foundCodes: Record<string, boolean> = {};
	rawCodes.forEach((code) => {
		foundCodes[code] = false;
	});

	for (const key of Object.keys(inputData.custom)) {
		rawCodes.forEach((code) => {
			if (key.startsWith(code)) {
				foundCodes[code] = true;
			}
		});
	}

	rawCodes.forEach((code) => {
		if (!foundCodes[code]) {
			console.warn(
				`Warning: rawcode "${code}" not found in JSON input file`
			);
		}
	});
}

let abilityParentData: any[] = [];
if (argv["lookup-parent"]) {
	const slk = XLSX.readFile("./ability-data.slk");
	abilityParentData = XLSX.utils.sheet_to_json(slk.Sheets[slk.SheetNames[0]]);
}

const matchesFilters = (item: AbilityField): boolean => {
	return (
		(!argv.id || item.id === argv.id) &&
		(!argv.value || String(item.value) === argv.value)
	);
};

const matchesParentFilters = (parentItem: any, parentMetaId: string): boolean => {
	return String(parentItem[parentMetaId]) === argv.value;
};

const totalElements = Object.keys(inputData.custom).length;

const newCustom = Object.entries(inputData.custom).reduce(
	(acc, [key, items]) => {
		const rawCodeMatch = argv.rawcodes
			? rawCodes.some((code) => key.startsWith(code))
			: true;
		let filterMatch = items.some((item) => matchesFilters(item));

		if (!filterMatch && argv["lookup-parent"]) {
			const parentKey = key.slice(-4);
			const parentMetaId = metaDataDict[argv.id];
			const parentItems = abilityParentData.filter(
				(parentItem) => parentItem.alias === parentKey
			);
			filterMatch = parentItems.some((item) => matchesParentFilters(item, parentMetaId));
		}

		if (!(rawCodeMatch && filterMatch)) {
			acc[key] = items;
		}
		return acc;
	},
	{} as InputData["custom"]
);

const remainingCount = Object.keys(newCustom).length;
const deletedCount = totalElements - remainingCount;

inputData.custom = newCustom;

console.log(`Total elements: ${totalElements}`);
console.log(`Deleted elements: ${deletedCount}`);
console.log(`Remaining elements: ${remainingCount}`);

try {
	fs.writeFileSync(outputPath, JSON.stringify(inputData, null, 2), "utf8");
	console.log(`Modified JSON saved to file: ${outputPath}`);
} catch (error) {
	console.error(`Error writing file ${outputPath}:`, error);
	process.exit(1);
}
