# How to use
## To convert .w3a to .json
```bash
ts-node convert.ts <input>.w3a [output.json
```

## To convert .json to .w3a
```bash
ts-node convert.ts <input>.json [output].w3a
```

## To remove ability data by rawcodes
```bash
ts-node remover.ts <input>.json <rawcodes> [output].json
```

### Example of <rawcodes> file
```
A001
A003
A005
A00F
A03K
...
```
