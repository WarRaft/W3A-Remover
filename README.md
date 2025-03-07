# W3A Remover

This tool allows you to convert `.w3a` files to `.json` and vice versa, as well as remove specific ability data from `.json` files based on various filters.

Parent ability data (ability-data.slk) from patch 1.26a.

## Installation

```bash
npm install
```

## Usage

### To convert .w3a to .json

```bash
npm run convert <input_w3a> [output_json]
```

#### Example

```bash
npm run convert war3map.w3a war3map.json
```

### To convert .json to .w3a

```bash
npm run convert <input_json> [output_w3a]
```

#### Example

```bash
npm run convert war3map.json war3map.w3a
```

### To remove ability data by filters

```bash
npm run remove <input_json> <output_json> [--rawcodes <rawcode_list>] [--id x] [--value x] [--lookup-parent]
```

#### Filters

- `--rawcodes <rawcode_list>`: Path to the file with rawcodes to filter.
- `--id <id>`: Filter by id. Allowed types see in meta-data-dict.ts.
- `--value <value>`: Filter by value.
- `--lookup-parent`: Lookup parent ability if filters do not match (.w3a contains only modified data).

#### Rawcodes File Format

The rawcodes file should contain one rawcode per line. Example:

```
A001
A003
A005
A00F
A03K
...
```

#### Example

The command below will delete all the abilities that match rawcodes in rawcodes.txt, which belong to the orc race. If an ability doesn't have modified data for race, then it will look for the race in the parent ability.

bash:
```bash
npm run remove -- war3map.json war3map-filtered.json --rawcodes rawcodes.txt --id arac --value orc --lookup-parent
```

powershell:
```bash
npm run remove -- .\war3map.json .\war3map-removed.json -- --rawcodes rawcodes.txt --id arac --value orc --lookup-parent
```
