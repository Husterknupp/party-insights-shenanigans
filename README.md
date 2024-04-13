# Party Insights Shenanigangs

Profile pictures of politicians are taken from German Wikipedia. Find contents in `output/` directory.

## Dev Setup

- Install Node.js (find correct node version in [.nvmrc](./.nvmrc) file)
- run

```shell
yarn install
```

## Run Main Script

This will execute the ETL pipeline:

- download Wikipedia pages with Politiker table data
- get relevant infos from html tables
- write infos to output files

```shell
yarn install
yarn start
```

## Run Tests

```shell
yarn install
yarn test
```
