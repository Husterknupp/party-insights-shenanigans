# Party Insights Shenanigangs

Find scraped Wikipedia content in `output/` directory.

## Dev Setup

- install Node.js (find correct node version in [.nvmrc](./.nvmrc) file)
- run `npm ci`

## Run Main Script

This will execute the ETL pipeline:

1. download Wikipedia pages with politician/cabinet info tables (Bund und Länder) 2. get relevant infos from html tables (names, parties, ministerial position, etc.)
2. write infos to json and markdown files

```shell
npm ci
npm run res:build
npm start
```

## Run Tests

```shell
npm ci
npm run res:build
npm test
```

## Export an Anki Deck

```shell
npm run export:anki -- output/<file>.json
```

Produces `output/<file>.apkg` next to the input JSON, importable into Anki/AnkiDroid.

Every deck shares one note type, `Deutschland:Politiker` (fields: Name, Partei,
Amt/Ministerium, Profil-Photo; two card directions — role → person and photo → person).
The fields and card templates are defined once, as the `POLITICIAN_FIELDS` and
`POLITICIAN_TEMPLATES` constants in [`src/politicianNoteTypeSql.js`](./src/politicianNoteTypeSql.js) —
that's the single place to edit if the layout needs to change; `src/apkgWriterFacade.res` only
binds into it, it doesn't build any template itself.
