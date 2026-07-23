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
npm ci
npm run res:build
npm run export:anki -- output/<file>.json
```

`output/<file>.json` is one of the already-committed files in [`output/`](./output)
(e.g. `output/bundesregierung.json`) — no need to run the full scrape first. `res:build`
is required: the exporter is written in ReScript, and its compiled `.res.mjs` output
isn't checked in.

Produces `output/<file>.apkg` next to the input JSON, importable into Anki/AnkiDroid.

Every deck shares one note type, `Deutschland:Politiker` (fields: Name, Partei,
Amt/Ministerium, Profil-Photo; two card directions — role → person and photo → person).
The fields and card templates are defined once, as the `POLITICIAN_FIELDS` and
`POLITICIAN_TEMPLATES` constants in [`src/politicianNoteTypeSql.js`](./src/politicianNoteTypeSql.js) —
that's the single place to edit if the layout needs to change; `src/ankiApkgExportFacade.res` only
binds into it, it doesn't build any template itself.

### Import the `.apkg` into Anki

**Desktop (Anki):** with Anki running, double-click the `.apkg` file — or use
File → Import… and select it. Either way, Anki adds the deck's cards to your
collection.

**Mobile (AnkiDroid):** first get the `.apkg` file onto the phone (e.g. via
USB, cloud storage, or email), then:

1. Open AnkiDroid and tap the overflow menu (⋮, top-right, next to search and sync).
2. Tap **Importieren** (Import).
3. Choose **Stapel-Paket (.apkg)** ("Deck Package (.apkg)") and pick the file.

AnkiDroid's menu labels above are German (matching the screenshots this was
transcribed from); the English AnkiDroid build uses the same three-dot menu →
**Import** → **Deck Package (.apkg)**.
