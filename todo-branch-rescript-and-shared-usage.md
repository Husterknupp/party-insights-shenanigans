# Migration Notes

Für die Nachwelt

## 2 August 2024

I tried to do a bit much when I started in May 2024. Result of that time were two files:

- HtmlService.res
- Politicianservice.res
- (and their corresponding js transpilations)

Today, I think it makes more sense to start smaller. Not switch from JavaScript to ReScript and at the same time, refactor the architecture. That's too much stuff where I can't test the intermediate results!

### Eventually It Should Look Like This

Here's the final structure how I want it to be:

HtmlService.res

- parseTableWithNameLike
  - new method that combines a bunch of logic
- findCabinetName
  - from landesregierungen.js
  - rename? -> 'getFirstH1'
- findRelevantTable
  - from landesregierungen.js
- tableWalker
  - from tableWalker.js
  - rename? -> 'parseTable'/'getCells'

PoliticianService.res

- politicoScan
  - new method that combines a bunch of logic
- getLastCellOfFirstColumnWithHeaderLike
  - from landesregierungen.js
- getAllCellsOfFirstColumnWithHeaderLike
  - from landesregierungen.js

Then, call from inside landesregierungen file (and other extractors), call the services

```js
# landesregierungen.js
    const tableCells = htmlService.parseTableWithNameLike(response.data, ["Kabinett", "Landesregierung", ..])
    const result = politicianService.politicoScan(tableCells, columnNames /*{ amt, ministerName, party, image }*/)
      ...
    console.log(`Done with cabinet ${htmlService.cabinetName(response.data)}`)
```

### But Until Then, I Will

Migrate one JavaScript method after the other (not the complete file), let run unit tests, commit, expect extractor output to be equivalent.

1. Start with tableWalker.js
   - [x] keep it as js
   - [x] refactor one giant method into smaller methods
   - [x] run unit tests and extractor code often
   - [ ] eventually, migrate all smaller functions of tableWalker to ReScript
   - [ ] make tableWalker.js -> TableWalker.res
2. Continue migration with landesregierungen.js

## More Thoughts

- unit tests in ReScript: [ReScript Jest](https://github.com/glennsl/rescript-jest)
- or with Zora: [ReScript Zora](https://github.com/dusty-phillips/rescript-zora)
- Ideas on a more concise API of TableWalker service

```text
  /*
  MAKE THE tableWalker API MORE CONCISE - SOME IDEAS

  VARIANT A
  const wot = tableWalker(
    html,
    relevantTable=[
      "Kabinett",
      "Landesregierung",
      "Mitglieder der Staatsregierung",
      "Amtierende Regierungschefs",
      "Zusammensetzung",
      "Senat",
    ],
    amtColumn=["amt", ressort"],
    ministerNameColumn=["amtsinhaber", "name"],
    ...
  )

  VARIANT B
  const wot = tableWalker(
    html,
    {mainColumn: ["amt", ressort"], mainColumnAlias: 'amt'},
    {columns: [headerText: ["amtsinhaber", "name",], alias: ]}
  )

  VARIANT C
  const tableCells = tableWalker
    .config(
      wikiTableHeaderOptions=["Kabinett", "Landesregierung", "Mitglieder der Staatsregierung", "Amtierende Regierungschefs", "Zusammensetzung", "Senat"],
      amtColumnOptions=["amt", ressort"],
      ...
    )
    .parse(html)
 */

```
