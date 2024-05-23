# Party Insights Shenanigangs

Find scraped Wikipedia content in `output/` directory.

## Dev Setup

- Install Node.js (find correct node version in [.nvmrc](./.nvmrc) file)
- run `yarn install`

## Run Main Script

This will execute the ETL pipeline:

1. download Wikipedia pages with politician/cabinet info tables
2. get relevant infos from html tables
3. write infos to output files

```shell
yarn install
yarn start
```

## Run Tests

```shell
yarn install
yarn test
```
