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

## Notes for LLM Agents

- **This is a ReScript project.** Source files in `src/` are `.res` (ReScript) — only edit those. The `.res.mjs` files are compiled output and will be overwritten by `npm run res:build`.
- **Exceptions:** `src/ministerpraesidenten.js`, `src/bundesregierung.js`, and `src/*.spec.js` are plain JavaScript source files with no `.res` counterpart. These may be edited directly.
- **Before committing:** Always run `npm ci && npm run res:build && npm start` to verify the pipeline completes, and `npm test` to verify tests pass.
- **Never commit `output/` or `output-images/`** — these are generated artifacts (see `.gitignore`).
