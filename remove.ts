#!/usr/bin/env ts-node

import * as fs from "fs";
import { hideBin } from "yargs/helpers";
import yargs from "yargs";

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
		"Usage: npm run remove <input_json> <output_json> [--rawcodes <rawcode_list>] [--id x] [--type x] [--level x] [--column x] [--value x]"
	)
	.option("rawcodes", {
		type: "string",
		description: "Path to the file with rawcodes to filter",
	})
	.option("id", {
		type: "string",
		description: "Filter by id",
	})
	.option("type", {
		type: "string",
		description: "Filter by type",
	})
	.option("level", {
		type: "number",
		description: "Filter by level",
	})
	.option("column", {
		type: "number",
		description: "Filter by column",
	})
	.option("value", {
		type: "string",
		description: "Filter by value",
	})
	.demandCommand(2, "Input and output files are required")
	.help().argv;

const [inputPath, outputPath] = argv._ as string[];

if (argv._.length > 2) {
	console.error("Error: too many arguments provided");
	process.exit(1);
}

let inputData: InputData;
try {
	inputData = JSON.parse(fs.readFileSync(inputPath, "utf8"));
} catch (error) {
	console.error(`Error reading or parsing file ${inputPath}:`, error);
	process.exit(1);
}

if (!inputData.custom || typeof inputData.custom !== "object") {
	console.error(
		'The JSON structure does not match the expected format (missing "custom" data)'
	);
	process.exit(1);
}

let rawCodes: string[] = [];
if (argv.rawcodes) {
	try {
		rawCodes = fs
			.readFileSync(argv.rawcodes, "utf8")
			.split("\n")
			.map((code) => code.trim())
			.filter(Boolean);
	} catch (error) {
		console.error(`Error reading rawcodes file ${argv.rawcodes}:`, error);
		process.exit(1);
	}

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

const matchesFilters = (item: AbilityField): boolean => {
	return (
		(!argv.id || item.id === argv.id) &&
		(!argv.type || item.type === argv.type) &&
		(argv.level === undefined || item.level === argv.level) &&
		(argv.column === undefined || item.column === argv.column) &&
		(!argv.value || String(item.value) === argv.value)
	);
};

const totalElements = Object.keys(inputData.custom).length;

const newCustom = Object.entries(inputData.custom).reduce(
	(acc, [key, items]) => {
		const rawCodeMatch = argv.rawcodes
			? rawCodes.some((code) => key.startsWith(code))
			: true;
		const filterMatch = items.some((item) => matchesFilters(item));

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
