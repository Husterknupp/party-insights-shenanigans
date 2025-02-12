# Party Insights Shenanigangs

Find scraped Wikipedia content in `output/` directory.

## Dev Setup

- install Node.js (find correct node version in [.nvmrc](./.nvmrc) file)
- run `yarn install`

## Run Main Script

This will execute the ETL pipeline:

1. download Wikipedia pages with politician/cabinet info tables (Bund und Länder) 2. get relevant infos from html tables (names, parties, ministerial position, etc.)
2. write infos to json and markdown files

```shell
yarn install
yarn res:build
yarn start
```

## Run Tests

```shell
yarn install
yarn res:build
yarn test
```
