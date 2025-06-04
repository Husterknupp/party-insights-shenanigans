# Architecture Refactoring of the Parsing Logic

Plan to finish refactoring and streamlining the API.

## History

I tried to do a bit much when I started in May 2024. So, in August 2024, I simplified the plan to not refactor and migrate at the sametime. In the end of May of 2025, finally I had one extractor and all its dependencies fully migrated to ReScript.

What's left now, is:

- [ ] Refactor the architecture of the html/table parsing, and the politician scanning
- [ ] Migrate the remaining two extractor files from JS to ReScript

## Eventually, It Should Look Like This

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
    const response = getWikiArticle("Liste_der_Landesregierungen_in_Deutschland");
    const (tableCells, cabinetName) = htmlService.parseTableWithNameLike(response.data, ["Kabinett", "Landesregierung", ..])
    const result = politicianService.politicoScan(tableCells, columnNames /*{ amt, ministerName, party, image }*/)
      // ... write the result to json, markdown files
    console.log(`Done with cabinet ${cabinetName} (${result.length} politicians)`);
```

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
